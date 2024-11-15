
const { Dirigera } = require('../index.cjs');


var access_token = 'get this from Authenticate class'
var dirigeraIP = '192.168.0.2' // Get the IP address from Discover or Authenticate
var dirigera = new Dirigera(dirigeraIP, access_token);
dirigera.setDebug(true)

// dirigera.getDeviceList();

dirigera.pollAllAttributes(1000, (deviceId, attribute, newValue, prevValue, device) => {
    console.log(`Device ${device.attributes.customName || deviceId}'s ${attribute} attribute changed from  ${JSON.stringify(prevValue)} to: ${JSON.stringify(newValue)}`);
});

var lightID = 'd04a5a54-6922-48f1-9ec2-274914de962a_1';
setTimeout(() => {
    // dirigera.blinkLight(lightID);
    dirigera.setAttribute(lightID, { 'isOn': true, 'lightLevel': 20, 'colorTemperature': 4000 });
}, 1000);

setTimeout(() => {
    dirigera.turnOffRoom('70b6fc63-05ac-4502-968d-0d4149b5a682');

    dirigera.setRoomLightLevel('f2d06fd1-1d53-491d-afe1-07d1f9d097cd', 100)
    dirigera.setRoomAttribute('f2d06fd1-1d53-491d-afe1-07d1f9d097cd', { 'isOn': true, 'lightLevel': 180, 'colorTemperature': 100 });
    dirigera.setRoomAttribute('70b6fc63-05ac-4502-968d-0d4149b5a682', { 'isOn': true, 'lightLevel': 10, 'colorTemperature': 2700 });


    // dirigera.setRoomAttribute('f2d06fd1-1d53-491d-afe1-07d1f9d097cd', [{ 'isOn': true }, { 'lightLevel': 180 }, { 'colorTemperature': 100 }])
    // dirigera.setRoomAttribute('70b6fc63-05ac-4502-968d-0d4149b5a682', [{ 'isOn': true }, { 'lightLevel': 180 }, { 'colorTemperature': 2700 }])
}, 3500);

setTimeout(() => {
    dirigera.setRoomAttribute('f2d06fd1-1d53-491d-afe1-07d1f9d097cd', { 'lightLevel': 1, 'colorTemperature': 3100 });
    dirigera.setRoomAttribute('70b6fc63-05ac-4502-968d-0d4149b5a682', { 'lightLevel': 1, 'colorTemperature': 2700 });
}, 8000);
setTimeout(() => {
    dirigera.setRoomAttribute('f2d06fd1-1d53-491d-afe1-07d1f9d097cd', { 'lightLevel': 40, 'colorTemperature': 2200 }, 2200);
    dirigera.setRoomAttribute('70b6fc63-05ac-4502-968d-0d4149b5a682', { 'lightLevel': 80, 'colorTemperature': 2700 }, 2200);
}, 10000);
