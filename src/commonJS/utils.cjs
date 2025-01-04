// const fetch = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Agent } = require("https");

const agent = new Agent({
    rejectUnauthorized: false
})


function fetchData(url, callback, errorCallback) {
    let controller = new AbortController();
    let timeout = setTimeout(() => {
        controller.abort();
    }, 25000);
    fetch(url, { options: { signal: controller.signal }, agent })
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            if (typeof (callback) == "function") {
                callback(text);
            }
        })
        .catch(function (e) {
            if (typeof (errorCallback) == "function") {
                errorCallback(e);
            } else {
                console.error(e);
            }
        });
}

function fetchForm(url, formData, callback, errorCallback, options) {
    let controller = new AbortController();
    let timeout = setTimeout(() => {
        controller.abort();
    }, 6000);
    var _options = {
        signal: controller.signal,
        agent
    };
    var method = 'POST', body = '', headers = {};
    if (options !== undefined) {
        _options.headers = options.headers
        headers = options.headers;
        method = options.method ? options.method : method;
    }
    body = formData ? formData : body;
    if (body)
        _options.body = body;

    headers['Content-Type'] = headers['Content-Type'] ? headers['Content-Type'] : 'application/x-www-form-urlencoded';
    _options.headers = headers;
    _options.method = method;
    _options.redirect = 'manual';

    // console.log(_options, {
    //     signal: controller.signal,
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //     body: formData,
    //     redirect: 'manual',
    //     agent
    // })

    fetch(url, _options)
        .then(function (response) {
            // console.log(response)
            return response.text();
        })
        .then(function (text) {
            if (typeof (callback) == "function") {
                callback(text);
            }
        })
        .catch(function (e) {
            if (typeof (errorCallback) == "function") {
                errorCallback(e);
            } else {
                console.error(e);
            }
        });
}

function fetchJson(url, callback, errorCallback, options) {
    let controller = new AbortController();
    let timeout = setTimeout(() => {
        controller.abort();
    }, 6000);
    var _options = {
        signal: controller.signal,
        agent
    };
    var method = 'GET', body = '';
    if (options !== undefined) {
        _options.headers = options.headers
        var headers = options.headers;
        method = options.method ? options.method : method;
        body = options.body ? options.body : body;
        if (body)
            _options.body = body;
    }

    _options.headers = headers;
    _options.method = method;

    fetch(url, _options)
        .then(function (response) {
            const [err, result] = safeJsonParse(response);
            if (err) {
                console.log('Failed to parse JSON: ' + err.message);
                console.log(response);
                return err;
            } else {
                return result;
            }
        })
        .then(function (json) {
            if (typeof (callback) == "function") {
                callback(json);
            }
        })
        .catch(function (e) {
            if (typeof (errorCallback) == "function") {
                errorCallback(e);
            } else {
                console.error(e);
            }
        });
}

function safeJsonParse(response) {
    try {
        return [null, response.json()];
    } catch (err) {
        return [err];
    }
}


var encodeDataToURL = (data) => {
    return Object
        .keys(data)
        .map(value => `${value}=${encodeURIComponent(data[value])}`)
        .join('&');
}


function formatSecondsMinimal(time) {
    var seconds = Math.floor(time % 60);
    var minutes = Math.floor((time / 60) % 60);
    var hours = Math.floor((time / 3600) % 60);
    if (minutes == 0 && hours == 0) {
        return seconds + "sec";
    }
    if (hours == 0) {
        return minutes + "min";
    }
    return hours + "h" + padZeros(minutes);
}

function padZeros(num, size) {
    if (size === undefined) {
        size = 2;
    }
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

var loadingIntervalId, loadTime;
function startLoading() {
    loadTime = Date.now();
    var h = ['|', '/', '-', '\\'];
    var i = 0;
    loadingIntervalId = setInterval(() => {
        i = (i > 3) ? 0 : i;
        process.stdout.write("\r" + h[i]);
        i++;
    }, 300);
}
function endLoading() {
    loadTime = Date.now() - loadTime;
    process.stdout.write("\r LOADING TIME: " + formatSecondsMinimal(loadTime / 1000) + ' (in millis: ' + loadTime + ') \r\n');
    clearInterval(loadingIntervalId);
}

function getChar(codeLength) {
    const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
    return CODE_CHARACTERS[Math.round(Math.random() * codeLength)];
}
function getCodeVerifier(codeLength) {
    let s = ""
    for (var i = 0; i < codeLength; i++) {
        s += getChar(codeLength)
    }
    return s;
}

module.exports =  {
    fetchData,
    fetchForm,
    fetchJson,
    formatSecondsMinimal,
    padZeros,
    startLoading,
    endLoading,
    encodeDataToURL,
    getCodeVerifier
};
