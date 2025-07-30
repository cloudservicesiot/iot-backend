const mqttClient = require('../mqtt/mqttClient'); // your existing connected MQTT client
const AirConditioner = require('../models/airConditioner.model');
const AirConditionerHistory = require('../models/airConditionerHistory.model');

const acHistoricFunction = async () => {
  try {
    const devices = await AirConditioner.find({ isActive: true });

    if (!devices.length) {
      console.warn('No active air conditioners found for subscription.');
      return;
    }

    devices.forEach(device => {
      const topic = `thecldiot/head_office_b17_b1/${device.deviceID}/mode`;

      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    });

    mqttClient.on('message', async (topic, message) => {
      try {
        const parts = topic.split('/');
        const deviceID = parts[2]; // assuming topic format is: theiot/head/${deviceId}/mode
        const mode = message.toString();

        const airConditioner = await AirConditioner.findOne({ deviceID });

        if (!airConditioner) {
          console.warn(`Received update for unknown deviceId: ${deviceID}`);
          return;
        }

        // Save to AirConditionerHistory
        const historyEntry = new AirConditionerHistory({
          airConditioner: airConditioner._id,
          mode,
        });
        await historyEntry.save();

        // Optionally, update mode in main model
        airConditioner.mode = mode;
        await airConditioner.save();

        console.log(`Saved mode "${mode}" for deviceId: ${deviceID}`);
      } catch (err) {
        console.error('Error processing MQTT message:', err);
      }
    });

  } catch (err) {
    console.error('Error setting up MQTT mode listener:', err);
  }
};

module.exports = acHistoricFunction;