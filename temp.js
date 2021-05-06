const awsIoT = require('aws-iot-device-sdk');
const crypto = require('crypto');
const endpointFile = require('./endpoint.json');
const deviceName = 'temp1';
const tempID = 'temp1';
const userName = 'temp1';

var Gpio = require('pigpio').Gpio, //include pigpio to interact with the GPIO
ledRed = new Gpio(23, {mode: Gpio.OUTPUT}), //use GPIO pin 4 as output for RED
ledGreen = new Gpio(24, {mode: Gpio.OUTPUT}), //use GPIO pin 17 as output for GREEN
ledBlue = new Gpio(25, {mode: Gpio.OUTPUT}), //use GPIO pin 27 as output for BLUE
redRGB = 0, //set starting value of RED variable to off (0 for common cathode)
greenRGB = 0, //set starting value of GREEN variable to off (0 for common cathode)
blueRGB = 0;

const destinationDeviceName = 'temp2';

const subTopic = 'messaging/' + deviceName;
const pubTopic = 'messaging/' + destinationDeviceName;

const device = awsIoT.device({
    keyPath: './certs/16a39ea0ec-private.pem.key',
    certPath: './certs/16a39ea0ec-certificate.pem.crt',
    caPath: './certs/AmazonRootCA1.pem.cert',
    clientId: deviceName,
    host: endpointFile.endpointAddress
});


device.on('connect', function() {
    console.log('Connected to AWS IoT');
    device.subscribe(subTopic);
    initialCheck();
});

const sensor = require('node-dht-sensor');
const sensorNumber = 11;
const pinNumber = 4;

var initialTemp;
var normalCheck = 5000, alertCheck = 30000;


function initialCheck(){
    sensor.read(sensorNumber, pinNumber, (err, temperature) => {
        if (!err) {
            initialTemp = (temperature.toFixed(1)*1.8)+32;
            checkTemp();
            console.log('Initial Temp:' + initialTemp);
            return initialTemp;
        }
    });
}

function checkTemp(){
    if(curTemp() > 70){
        console.log('temp over 70!!!');
        device.publish(userName + '/telemetry', JSON.stringify(getTemp()));
        device.publish(pubTopic, 'True');
        setTimeout(checkTemp, alertCheck);
    }else{
        setTimeout(checkTemp, normalCheck);
        ledRed.digitalWrite(0); 
        ledGreen.digitalWrite(0); 
        ledBlue.digitalWrite(0);
    }
    
}

device.on('message', function(topic, message) {
    if(message == 'True'){
        console.log('Alert Recieved from:' + topic);
        ledRed.digitalWrite(1); 
        ledGreen.digitalWrite(0); 
        ledBlue.digitalWrite(0);
    }else{
        ledRed.digitalWrite(0); 
        ledGreen.digitalWrite(1); 
        ledBlue.digitalWrite(0);
    }
});

var far;

function getTemp(){
    sensor.read(sensorNumber, pinNumber, (err, temperature, humidity) => {
        if (!err) {
            far = (temperature.toFixed(1)*1.8)+32;
            console.log('temp: ' + far + '°F, ' + 'humidity: ' + humidity.toFixed(1) +  '%');
        }
    });
    let message = {
        'event_id': crypto.randomBytes(15).toString('hex'),
        'temp_id': tempID,
        'initial_temp': initialTemp,
        'current_temp': far
    };
    return message;
}

function curTemp(){
    sensor.read(sensorNumber, pinNumber, (err, temperature, humidity) => {
        if (!err) {
            far = (temperature.toFixed(1)*1.8)+32;
        }
    });

    return far;

}

function unexportOnClose(){
    ledRed.digitalWrite(0); 
    ledGreen.digitalWrite(0); 
    ledBlue.digitalWrite(0);
    ledRed.unexport();
    ledGreen.unexport();
    ledBlue.unexport();
}

process.on('SIGINT', unexportOnClose);