
const { startLoading, endLoading, fetchForm, fetchJson, encodeDataToURL } = require('./utils.cjs');
const { Discover } = require('./Discover.cjs');

/*
The authentication is used to get a bearer code from the hub.
With that access code it is possible to communicate with the hub.
*/
const os = require('node:os');
const { createHash } = require('crypto');

/**
* The Authenticate class is used to get a bearer code from the hub.
* With that access code it is possible to do all further communicate with the hub.
*
* @since v0.1.0
*/
class Authenticate {
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
    * @param {function} callback - The callback function to be called when the access code is received.
    * @since v0.1.0
    */
    constructor(ip = null, callback = (data) => { }) {
        this.ip = ip;

        this.options = {
            CODE_LENGTH: 128,
            CODE_CHALLENGE_METHOD: 'S256',
            authUrl: `https://${this.ip}:8443/v1/oauth/authorize`,
            tokenUrl: `https://${this.ip}:8443/v1/oauth/token`,
            callback: callback,
            maxRetry: 10,
            retryCounter: 0
        }


        this.codeVerifier = this.getCodeVerifier();

        const hash = createHash('sha256');
        this.codeChallenge = hash.update(this.codeVerifier).digest('base64url');

        if (!this.ip) {
            new Discover((data) => {
                // console.log(data);
                console.log("|| >>> Found device on IP: " + data.ip)
                this.setIPaddress(data.ip);
                this.startAuthProcess();
            })
        }
        else {
            this.startAuthProcess();
        }
    }

    /**
     * Set the IP address of the hub.
     *
     * @param {string} ip - The IP address of the hub.
     */
    setIPaddress(ip) {
        this.ip = ip;
        this.options.authUrl = `https://${this.ip}:8443/v1/oauth/authorize`;
        this.options.tokenUrl = `https://${this.ip}:8443/v1/oauth/token`;
    }

    startAuthProcess() {
        startLoading();
        var code = '';
        fetchJson(this.options.authUrl + '?' + encodeDataToURL({
            audience: 'homesmart.local',
            response_type: 'code',
            code_challenge: this.codeChallenge,
            code_challenge_method: this.options.CODE_CHALLENGE_METHOD,
        }), data => {
            setTimeout(() => {
                endLoading();
                if (data.error) {
                    console.log(`we got an pairing error: ${data.error} `)
                    if (data.error === 'Already one ongoing pairing request') {
                        setTimeout(() => {
                            if (this.options.retryCounter++ > this.options.maxRetry) {
                                console.log('Could not get into pairing mode!!!')
                            }
                            else {
                                console.log('retrying pairing mode')
                                this.startAuthProcess();
                            }
                        }, 5000);
                    }
                }
                else {
                    this.code = data.code;
                    console.log(`code received: ${this.code}`);
                    // console.log(`all data: ${JSON.stringify(data)}`);
                    this.checkForAccessCode();
                }
            }, 1500);
        })

    }
    checkForAccessCode() {
        console.log('|| >>> Press the Action Button <<< || ');
        console.log('|| >>> On the bottom of your Dirigera Hub, it should automatically get the access token! <<< || ');
        var data = {
            code: this.code,
            name: os.hostname(),
            grant_type: 'authorization_code',
            code_verifier: this.codeVerifier,
        }
        this.encodedData = encodeDataToURL(data);

        startLoading();
        setTimeout(() => {
            this.tryToGetAuth();
        }, 1000);
    }
    tryToGetAuth() {
        fetchForm(this.options.tokenUrl, this.encodedData,
            data => {
                var result = JSON.parse(data);
                if (result.error) {
                    if (result.error === 'Button not pressed or presence time stamp timed out.') {
                        setTimeout(() => {
                            this.tryToGetAuth();
                        }, 1000);
                    }
                    else {
                        endLoading();
                        this.options.callback({ error: true, message: result.error, additional: 'sadly not got an access code for you.' })
                        // console.log(result);
                    }
                }
                else {
                    endLoading();
                    result.ip = this.ip;
                    this.options.callback(result)
                    // console.log(result);
                }
            }
        )
    }


    getChar() {
        const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
        return CODE_CHARACTERS[Math.round(Math.random() * CODE_CHARACTERS.length)];
    }
    getCodeVerifier() {
        let s = ""
        for (var i = 0; i < this.options.CODE_LENGTH; i++) {
            s += this.getChar()
        }
        return s;
    }
}

module.exports = { Authenticate };
