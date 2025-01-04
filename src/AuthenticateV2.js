import {startLoading, endLoading, fetchForm, fetchJson, encodeDataToURL, getCodeVerifier} from './utils.js';

/*
The authentication is used to get a bearer code from the hub.
With that access code it is possible to communicate with the hub.
*/
import * as os from 'node:os';
const { createHash } = await import('crypto');

/**
 * The AuthenticationListener class is used as interface.
 * This interface is used to relay messages about the authentication flow
 *
 * @since v0.2.0
 */
class AuthenticationListener {
    /**
     * No IP address was provided
     */
    hubNotFound() {}

    /**
     * Function called when we receive a pairing error
     *
     * @param {string} error The error received from the hub
     */
    pairingError(error) {}

    /**
     * Function called when the code is received. We can do the next API call with this code
     */
    codeReceived() {}

    /**
     *
     */
    pairingSucceeded(result) {}
}

/**
* The AuthenticateV2 class is used to get a bearer code from the hub in separate steps.
* With that access code it is possible to do all further communicate with the hub.
*
* @since v0.1.0
*/
class AuthenticateV2 {
    /**
    * Get the access code from the hub by intiating the class.
    * ```js
    * var auth = new Authenticate(dirigeraIp, data => {
    *   console.log(data);
    *   var access_token = data.access_token;
    * })
    * ```
    *
    * @param {string} ip - The IP address of the hub.
    * @param {AuthenticationListener} listener - A listener for the process
    * @since v0.1.0
    */
    constructor(ip = null, listener = null) {
        this.ip = ip;
        this.listener = listener;

        this.options = {
            CODE_LENGTH: 128,
            CODE_CHALLENGE_METHOD: 'S256',
            authUrl: `https://${this.ip}:8443/v1/oauth/authorize`,
            tokenUrl: `https://${this.ip}:8443/v1/oauth/token`,
            maxRetry: 10,
            retryCounter: 0
        };

        this.codeVerifier = getCodeVerifier(this.options.CODE_LENGTH);

        const hash = createHash('sha256');
        this.codeChallenge = hash.update(this.codeVerifier).digest('base64url');

        if (!this.ip) {
            console.log('No IP address provided');
            if (typeof(this.listener.hubNotFound) == "function") {
                this.listener.hubNotFound();
            }
        }
    }

    startAuthProcess() {
        startLoading();
        fetchJson(this.options.authUrl + '?' + encodeDataToURL({
            audience: 'homesmart.local',
            response_type: 'code',
            code_challenge: this.codeChallenge,
            code_challenge_method: this.options.CODE_CHALLENGE_METHOD,
        }), data => {
            setTimeout(() => {
                endLoading();
                if (data.error) {
                    console.log(`We got an pairing error: ${data.error} `)
                    if (data.error === 'Already one ongoing pairing request' && this.options.retryCounter++ < this.options.maxRetry) {
                        setTimeout(() => {
                            console.log('Retrying pairing mode')
                            this.startAuthProcess();
                        }, 5000);
                    } else {
                        let error = data.error;
                        if (data.error === 'Already one ongoing pairing request') {
                            error = 'Could not get into pairing mode';
                        }
                        console.log(error);
                        if (typeof(this.listener.pairingError) == "function") {
                            this.listener.pairingError(error);
                        }
                    }
                }
                else {
                    this.code = data.code;
                    console.log(`Code received: ${this.code}`);
                    if (typeof(this.listener.codeReceived) == "function") {
                        this.listener.codeReceived(this.code);
                    }
                }
            }, 1500);
        })
    }

    checkForAccessCode() {
        console.log('|| >>> Press the Action Button <<< || ');
        console.log('|| >>> On the bottom of your Dirigera Hub, it should automatically get the access token! <<< || ');
        const data = {
            code: this.code,
            name: os.hostname(),
            grant_type: 'authorization_code',
            code_verifier: this.codeVerifier,
        };
        this.encodedData = encodeDataToURL(data);

        startLoading();
        setTimeout(() => {
            this.tryToGetAuth();
        }, 1000);
    }

    tryToGetAuth() {
        fetchForm(this.options.tokenUrl, this.encodedData,
            data => {
                const result = JSON.parse(data);
                if (result.error) {
                    if (result.error === 'Button not pressed or presence time stamp timed out.') {
                        setTimeout(() => {
                            this.tryToGetAuth();
                        }, 1000);
                    } else {
                        endLoading();
                        console.log(`Failed to get access token: ${result.error}`)
                        if (typeof(this.listener.pairingError) == "function") {
                            this.listener.pairingError(result.error)
                        }
                    }
                }
                else {
                    endLoading();
                    result.ip = this.ip;
                    if (typeof(this.listener.pairingSucceeded) == "function") {
                        this.listener.pairingSucceeded(result)
                    }
                    console.log(`Pairing succeeded: ${result}`);
                }
            }
        )
    }
}

export { AuthenticateV2 };
