# Dirigera
A simple tool that can be used to set up a local controller for your new IKEA smart home system.

## Origin
The original project is located [here](https://bitbucket.org/fair2/dirigera-simple)

### *This is a work in progress!* 
Please feel free to open op pull requests and/or issues.

## Setup
```js
import { Dirigera } from 'dirigera-simple';
var dirigera = new Dirigera(dirigeraIP, access_token);
```

> You need to setup the access_token with an authentication routine.
This means you need to run `Authenticate` and then press the action button on your Dirigera hub.

&nbsp; 

## Authenticate
```js
import { Authenticate } from 'dirigera-simple';

var dirigeraIP = false;
var auth = new Authenticate(dirigeraIP, data => {
    console.log(data);
    var access_token = data.access_token;
    var dirigeraIP = data.ip;
    // Save this token in your config or in code!
})
```
When this code is running, the only way (at them moment) is to view the console to see what is happening. The gist is that, after starting the code, you will need to press the action button (on the bottom of the Dirigera). This will return a code to you. Save it somewhere and use it with the Dirigera class to connect to the hub.

&nbsp; 

## Turn on and off a device 
```js
dirigera.turnOnDevice(deviceId)
```

```js
dirigera.turnOffDevice(deviceId)
```

Want to find out what light/device it is, let it blink:
```js
dirigera.blinkLight(deviceId)
```

## Control a room
```js
dirigera.turnOffRoom(roomId);
```
```js
dirigera.setRoomAttribute(roomId, [
    { 'isOn': true }, 
    { 'lightLevel': 100 }, 
    { 'colorTemperature': 2200 }
]);
```

## Get a list of all devices
```js
dirigera.getDeviceList(devices => {
    console.log(devices);
})
```

## Poll device attribute changes
This method allows you to poll for changes in device attributes, and execute a callback function when a change is detected.

```js
dirigera.pollDeviceAttributes((deviceId, attribute, newValue, previousValue, device) => {
    console.log(`Attribute "${attribute}" of device "${deviceId}" has changed from ${previousValue} to ${newValue}`);
});
```

&nbsp; 

## Find Dirigera IP address
```js
import { Discover } from 'dirigera-simple';
new Discover((data) => {
    console.log("Found device on IP: " + data.ip)
});
```
Using mdns-server to retrive the IP address from the Dirigera Hub, this process is automated for the Authenticate code. 

Usefulle when IP address is auto asigned, and over time it might change.

&nbsp; 
&nbsp; 

## TODO
 - ~~Find IP address automatically~~
 - ~~Listen/observe device changes~~
 - Notify on device changes
 - Test more extensivly
 - Get device names, ids etc in list
 - Overview of device capabilites


&nbsp; 
&nbsp; 
&nbsp; 


"Special thanks to [OpenAI Assistance](https://openai.com/blog/openai-api-launch/) for their help in developing the Dirigera class."

&nbsp; 
