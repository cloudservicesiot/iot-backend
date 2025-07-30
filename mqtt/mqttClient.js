const mqtt = require('mqtt');
const dotenv = require('dotenv');
dotenv.config();
const {CLIENT_ID, MQTT_BROKER_URL, MQTT_BROKER_PORT, MQTT_BROKER_USERNAME, MQTT_BROKER_PASSWORD } = process.env;
// Define MQTT broker connection options
const options = {
    clientId: CLIENT_ID,
    username: MQTT_BROKER_USERNAME,
    password: MQTT_BROKER_PASSWORD
};
const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER_URL}:${MQTT_BROKER_PORT}`, options);

mqttClient.on('connect', () => {
    console.log(`Connected to MQTT Broker as client: ${options.clientId}`);
});

mqttClient.on('error', (error) => {
    console.error('MQTT Connection Error:', error);
});

module.exports = mqttClient;
