const awsIoT = require('aws-iot-device-sdk');
const crypto = require('crypto');
const endpointFile = require('./endpoint.json');
const deviceName = 'temp1_ehancoc4';
const tempID = 'temp1';
const userName = 'ehancoc4';

const device = awsIoT.device({
    keyPath: './certs/private.pem.key',
    certPath: './certs/certificate.pem.crt', //issue stoping the file with certPath
    caPath: './certs/root-CA.crt',
    clientId: deviceName,
    host: endpointFile.endpointAddress
});

device.on('connect', function() {
    console.log('Connected to AWS IoT');
    checkTemp();
});

const sensor = require('node-dht-sensor');
const sensorNumber = 11;
const pinNumber = 4;

var initialTemp;
var normalCheck = 1000, alertCheck = 30000;

setTimeout(initialCheck, 1000);
initialCheck();

function initialCheck(){
    sensor.read(sensorNumber, pinNumber, (err, temperature) => {
        if (!err) {
            return initialTemp = (temperature.toFixed(1)*1.8)+32;
        }
    });
}

function checkTemp(firstTemp, latestTemp){
    if(latestTemp >= 75){
        device.publish(userName + '/telemetry', JSON.stringify(getTemp()));
        console.log('The temp is over 75°F!\n     Temp: ' + latestTemp);
        setTimeout(getTemp, alertCheck);
    }else if(latestTemp >= firstTemp+3){
        device.publish(userName + '/telemetry', JSON.stringify(getTemp()));
        console.log('Temp has increased by 3°F or more!\n     Temp: ' + latestTemp);
        setTimeout(getTemp, alertCheck);
    }else{
        device.publish(userName + '/telemetry', JSON.stringify(getTemp()));
        setTimeout(getTemp, normalCheck);
    }
}


function getTemp(){
    var far;
    sensor.read(sensorNumber, pinNumber, (err, temperature, humidity) => {
        if (!err) {
            far = (temperature.toFixed(1)*1.8)+32;
            console.log('temp: ' + far + '°F, ' + 'humidity: ' + humidity.toFixed(1) +  '%');
            let message = {
                'event_id': crypto.randomBytes(15).toString('hex'),
                'temp_id': tempID,
                'initial_temp': initialTemp,
                'current_temp': far
            };
            checkTemp(initialTemp, far);
            return message;
        }
    });
}

setTimeout(getTemp, normalCheck);