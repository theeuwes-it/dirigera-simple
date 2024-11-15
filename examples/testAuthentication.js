
import { Authenticate } from '../index.cjs'

/* Athentication: get access token from Hub
    This requires pressing the action button on your Dirigera Hub.
*/
var dirigeraIP = false;
var auth = new Authenticate(dirigeraIP, data => {
    console.log(data);
    var access_token = data.access_token;
    var dirigeraIP = data.ip;
    // Save this token in your config or in code!
})
