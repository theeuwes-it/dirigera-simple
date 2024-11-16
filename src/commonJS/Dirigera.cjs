const { fetchForm, fetchJson, encodeDataToURL } = require('./utils.cjs');
const { initializeWebSocket, closeWebSocket } = require('./ws.cjs');
const fs = require('fs');
/**
 * Control devices in your IKEA smart home network via your Dirigera Hub.
 *
 */
class Dirigera {
    /**
     * Setup connection with the Dirigera Hub.
     *
     * ```js
     * var access_token = 'get this from Authenticate class'
     * var dirigeraIP = '192.168.0.230' // Get the IP address from Discover or Authenticate
     * var dirigera = new Dirigera(dirigeraIP, access_token);
     * ```
     *
     * @param {string} ip - The IP address of the Dirigera Hub.
     * @param {string} access_token - The access token obtained from the Authenticate class.
     * @returns {Dirigera} - A Dirigera class object.
     */
    constructor(ip, access_token) {
        this.ip = ip;
        this.access_token = access_token;

        this.options = { defaultTransitionTime: 500 };
        this.previousValues = {};

        this.devices_url = `https://${this.ip}:8443/v1/devices`
        this.headers = { "Authorization": "Bearer " + this.access_token }

        this.state = { loaded: false, debug: false }
        this.devices = {};
        this.getDeviceList((data) => {
            if (!data.error) {
                this.state.loaded = true;

                // preload previous values for the polling.
                this.devices.forEach(device => {
                    this.previousValues[device.id] = {};
                    Object.keys(device.attributes).forEach(attribute => {
                        // console.log(device.attributes[attribute])
                        if (typeof (device.attributes[attribute]) !== 'object')
                            this.previousValues[device.id][attribute] = device.attributes[attribute];
                    });
                });

                this.logDebug('got device list, ready...')
            }
            else {
                console.warn('Error: ', data.error)
            }
        })
    }

    /**
     * Retrieve the list of devices connected to the Dirigera Hub.
     *
     * @param {function} callback - A callback function to be called with the response data.
     */
    getDeviceList(callback) {
        fetchJson(this.devices_url, data => {
            if (!data.error) {
                this.devices = data;
            }
            if (typeof (callback) == 'function') {
                callback(data);
            }
            else {
                this.logDebug(data);
                fs.writeFileSync('./devices.json', JSON.stringify(data, undefined, 4));
            }
        }, error => {
            this.logDebug(error)
        }, { headers: this.headers });
    }


    /**
     * Poll changes in all devices' attributes.
     *
     * @param {number} interval The interval (in milliseconds) at which to poll for changes.
     * @param {Function} callback The function to be called when a change is detected. The function will be passed the device ID, attribute name, new value and the device object as arguments.
     * @returns {number} The ID of the setInterval function used for the polling.
     * @example
     * const pollId = dirigera.pollAllAttributes(1000, (deviceId, attribute, newValue, prevValue, device) => {
     *   console.log(`Device ${deviceId}'s ${attribute} attribute changed to: ${newValue}`);
     * });
     * // Output:
     * // Device 123's isOn attribute changed to: true
     * // Device 456's lightLevel attribute changed to: 50
     * // Device 789's colorTemperature attribute changed to: 4000
     * // ...
     */
    pollAllAttributes(interval = 5000, callback = () => { }) {
        const poll = () => {
            this.getDeviceList(() => {
                this.devices.forEach(device => {
                    Object.keys(device.attributes).forEach(attribute => {
                        if (typeof (device.attributes[attribute]) != 'object'
                            && device.attributes[attribute] !== this.previousValues[device.id][attribute]) {

                            callback(device.id, attribute, device.attributes[attribute], this.previousValues[device.id][attribute], device);
                            this.previousValues[device.id] = this.previousValues[device.id] || {};
                            this.previousValues[device.id][attribute] = device.attributes[attribute];
                        }
                    });
                });
            });
        };
        poll();
        return this.pollIntervalId = setInterval(poll, interval);
    }

    /**
     * Get a list of devices sorted by type.
     *
     * @returns {Object} An object where the keys are the different device types and the values are arrays containing the devices of that type.
     * @example
     * const devicesByType = dirigera.getDevicesByType();
     * console.log(devicesByType);
     * // Output:
     * // {
     * //   light: [
     * //     { id: '123', type: 'light', name: 'Bedroom light', ... },
     * //     { id: '456', type: 'light', name: 'Kitchen light', ... },
     * //     ...
     * //   ],
     * //   plug: [
     * //     { id: '789', type: 'plug', name: 'Coffee maker', ... },
     * //     { id: '101112', type: 'plug', name: 'Lamp', ... },
     * //     ...
     * //   ],
     * //   ...
     * // }
     */
    getDevicesByType() {
        const sortedDevices = {};
        this.devices.forEach(device => {
            if (!sortedDevices[device.type]) {
                sortedDevices[device.type] = [];
            }
            sortedDevices[device.type].push(device);
        });
        return sortedDevices;
    }


    /**
     * Get a list of devices in a specific room.
     *
     * @param {string} roomId - The ID of the room.
     * @returns {Array} - An array of devices in the room.
     */
    getDevicesInRoom(roomId) {
        if (this.state.loaded) {
            return this.devices.filter(device => device.room && device.room.id == roomId);
        }
        return [];
    }

    /**
     * Get a specific device by its ID.
     *
     * @param {string} deviceId - The ID of the device.
     * @returns {Object} - The device object. Returns null if the device is not found.
     */
    getDevice(deviceId) {
        if (this.state.loaded) {
            return this.devices.find(device => device.id == deviceId);
        }
        return null;
    }

    /**
     * Blink the light of a specific device.
     *
     * @param {string} deviceId - The ID of the device.
     */
    blinkLight(deviceId) {
        let blinkDuration = 1000;
        this.turnOnDevice(deviceId);
        setTimeout(() => {
            this.setDeviceLightLevel(deviceId, 1);
        }, blinkDuration)
        setTimeout(() => {
            this.setDeviceLightLevel(deviceId, 100);
        }, blinkDuration * 2)
        setTimeout(() => {
            this.setDeviceLightLevel(deviceId, 1);
        }, blinkDuration * 3)
        setTimeout(() => {
            this.setDeviceLightLevel(deviceId, 100);
            this.turnOffDevice(deviceId);
        }, blinkDuration * 4)
    }

    /**
     * Turn on all devices in a specific room.
     *
     * @param {string} roomId - The ID of the room.
     */
    turnOnRoom(roomId) {
        this.setRoomAttribute(roomId, { 'isOn': true });
    }
    turnOffRoom(roomId) {
        this.setRoomAttribute(roomId, { 'isOn': false });
    }

    setRoomLightLevel(roomId, lightLevel) {
        this.setRoomAttribute(roomId, { 'lightLevel': lightLevel });
    }

    turnOnDevice(deviceId) {
        this.setAttribute(deviceId, { 'isOn': true });
    }
    turnOffDevice(deviceId) {
        this.setAttribute(deviceId, { 'isOn': false });
    }

    setDeviceLightLevel(deviceId, lightLevel) {
        this.setAttribute(deviceId, { 'lightLevel': lightLevel });
    }

    setRoomAttribute(roomId, attribute, transitionTime) {
        var devicesInRoom = this.getDevicesInRoom(roomId);
        // this.logDebug(devicesInRoom);
        devicesInRoom.forEach(device => {
            this.setAttribute(device.id, attribute, transitionTime);
            // this.logDebug(device.id, attribute);
        })
    }

    /**
     * This is de overall function used to set any and every attribute of any available device.
     * ```js
     * dirigera.setAttribute(lightID, { 'isOn': true, 'lightLevel': 20, 'colorTemperature': 4000 });
     * ```
     * @param {*} deviceId A device ID that can be taken from the deviceList
     * @param {*} attribute The values that should be updated for this device.
     * @param {*} transitionTime (optional) Duration in millis of the transition (does not work for isOn attribute). If ommited will be set to default transitionTime (in optiosn)
     * @returns none
     */
    setAttribute(deviceId, attribute, transitionTime) {
        //[{"attributes":{"isOn":true}}]

        if (!this.state.loaded) {
            this.logDebug(' :( device not loaded!!!!')
        }

        // if (attribute.length > 1) {
        //     var temp = {}
        //     attribute.forEach(atb => {
        //         temp = { ...temp, ...atb };
        //         // this.setAttribute(deviceId, atb);
        //     })
        //     attribute = temp;
        //     // return;
        // }
        var device = this.getDevice(deviceId);
        if (device == null) {
            this.logDebug('no device with this ID found!');
            return;
        }
        if (!this.checkDeviceCanReceive(device, attribute)) {
            var name = device ? device.name : 'unknown';
            var type = device ? device.type : 'unknown';
            this.logDebug(`>> device (name: ${name}, id: ${deviceId}, type: ${type}) can't receive command: ${JSON.stringify(attribute)}`);
            return;
        }
        attribute = this.checkDeviceAttributeLimit(device, attribute)
        transitionTime = transitionTime ? transitionTime : this.options.defaultTransitionTime;
        var body = JSON.stringify([
            {
                "attributes": attribute,
                transitionTime: transitionTime
            }
        ])
        var headers = this.headers;
        headers['Content-Type'] = 'application/json; charset=UTF-8';
        fetchForm(
            this.devices_url + '/' + deviceId,
            body,
            (data) => { this.handlePatchReturnData(data) },
            (data) => { this.handlePatchReturnData(data) },
            { headers, method: 'PATCH' });
    }
    handlePatchReturnData(data) {
        if (data) {
            this.logDebug(data);
        }
    }
    checkDeviceCanReceive(device, attribute) {
        if (typeof (device) == 'string') device = this.getDevice(device);
        if (device == null) return false;
        var ret = true;
        Object.keys(attribute).forEach(key => {
            ret = !ret ? ret : (device.capabilities.canReceive.includes(key))
        })
        return ret;
    }

    /**
     * Check if a device attribute is within its allowed limits.
     *
     * @param {string} deviceId - The ID of the device.
     * @param {string} attributeName - The name of the attribute to check.
     * @param {number} value - The value to check against the limits.
     * @returns {boolean} - True if the value is within the limits, false otherwise.
     */
    checkDeviceAttributeLimit(device, attribute) {
        if (typeof (device) == 'string') device = this.getDevice(device);
        if (device == null) return false;
        // this.logDebug(Object.keys(attribute), attribute[Object.keys(attribute)]);
        Object.keys(attribute).forEach(key => {
            switch (key) {
                case 'isOn':
                    if (typeof (attribute['isOn']) != 'boolean') {
                        attribute['isOn'] = false;
                    }
                    break;

                case 'lightLevel':
                    attribute['lightLevel'] = attribute['lightLevel'] < 0 ? 0 : attribute['lightLevel'];
                    attribute['lightLevel'] = attribute['lightLevel'] > 100 ? 100 : attribute['lightLevel'];
                    break;

                case 'colorTemperature':
                    attribute['colorTemperature'] = attribute['colorTemperature'] < device.attributes.colorTemperatureMax ? device.attributes.colorTemperatureMax : attribute['colorTemperature'];
                    attribute['colorTemperature'] = attribute['colorTemperature'] > device.attributes.colorTemperatureMin ? device.attributes.colorTemperatureMin : attribute['colorTemperature'];
                    break;

                default:
                    break;
            }
        })
        return attribute;
    }

    startListeningForUpdates(callback) {
        if (!this.access_token) {
            throw new Error('Access token is missing.')
        }
        const ip = this.ip;
        const access_token = this.access_token;
        initializeWebSocket(
            ip,
            access_token,
            callback
        )
    }
    stopListeningForUpdates() {
        closeWebSocket()
    }

    logDebug(...args) {
        if (this.state.debug) {
            var newDate = new Date();
            args.unshift(`> Dirigera | ${newDate.toLocaleString()} > `)
            console.log(args.join(' '));
        }
    }
    setDebug(isDebug = false) {
        this.state.debug = isDebug;
    }
}

module.exports = { Dirigera };
