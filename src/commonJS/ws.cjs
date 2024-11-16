const ReconnectingWebSocket = require('reconnecting-websocket');
const crypto = require('crypto');

let ws = null
let timer = null

function initializeWebSocket(ip, accessToken, callback) {
    ws = new ReconnectingWebSocket(`wss://${ip}:8443/v1`, [], {
        webSocketOptions: {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
            rejectUnauthorized: false,
        },
        debug: process.env['NODE_ENV'] === 'development',
    })

    ws.addEventListener('message', (message) => {
        callback(JSON.parse(String(message.data)))
    })

    timer = setInterval(() => {
        ws?.send(
            JSON.stringify({
                id: crypto.randomUUID(),
                specversion: '1.1.0',
                source: `urn:theeuwes-it:dirigera`,
                time: new Date().toISOString(),
                type: 'ping',
                data: null,
            })
        )
    }, 30000)
}

function closeWebSocket() {
    ws?.close()
    if (timer) {
        clearInterval(timer)
    }
}

module.exports =  {
    initializeWebSocket,
    closeWebSocket
}
