
class Discover {
    constructor(callback, autoStart = true) {
        this.callback = typeof (callback) == 'function' ? callback : () => { };
        this.device = null;
        if (autoStart) {
            this.lookForDevice();
        }
    }

    lookForDevice() {
        const name = '_ihsp._tcp.local.';

        this.mdns = require('mdns-server')({
            reuseAddr: true, // in case other mdns service is running
            loopback: true,  // receive our own mdns messages
            noInit: true     // do not initialize on creation
        })

        // listen for response events from server
        this.mdns.on('response', (response) => { this.onResponse(response); })

        // listen for query events from server
        this.mdns.on('query', (query) => { this.onQuery(query); })

        // listen for the server being destroyed
        this.mdns.on('destroyed', () => {
            // console.log('Server destroyed.')
            // process.exit(0)
        })

        // query for all services on networks
        this.mdns.on('ready', () => {
            this.mdns.query([
                { name, type: 'A' },
                { name, type: 'AAAA' },
                { name, type: 'PTR' },
            ])
        })

        // initialize the server now that we are watching for events
        this.mdns.initServer()
    }

    onResponse(response) {
        // console.log('got a response packet:')
        var a = []
        if (response.answers) {
            a = a.concat(response.answers)
        }
        if (response.additionals) {
            a = a.concat(response.additionals)
        }
        a.forEach(r => {
            if (r.data) {
                if (typeof (r.data) == 'string') {
                    // console.log(r.data.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/g));
                    if (r.data.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/g)) {
                        // console.log(r.data);
                        this.device = r;
                        this.device.ip = r.data;
                        this.callback(this.device)
                        this.mdns.destroy();
                    }
                }
            }
        });
    }
    onQuery(query) {
        // console.log('got a query packet:')
        var q = []
        if (query.questions) {
            q = q.concat(query.questions)
        }
        // console.log(q)
    }
}

module.exports =  { Discover };