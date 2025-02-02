import ReconnectingWebSocket from 'reconnecting-websocket'
import crypto from 'crypto'

let ws = null
let timer = null

export function initializeWebSocket(ip, accessToken, callback) {
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
        try {
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
        } catch (e) {
            console.log(e)
        }
    }, 30000)
}

export function closeWebSocket() {
    try {
        ws?.close()
        if (timer) {
            clearInterval(timer)
        }
    } catch (e) {
        console.log(e)
    }
}
