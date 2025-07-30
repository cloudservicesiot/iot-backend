// mqtt.controller.js
const Entity = require('../models/entity.model');
const mqttClient = require('../mqtt/mqttClient');

const subscribeToTopics = async () => {
    try {
        const entities = await Entity.find({ isActive: true });

        entities.forEach((entity) => {
            mqttClient.subscribe(entity.subscribeTopic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to ${entity.subscribeTopic}`, err);
                } else {
                    console.log(`Subscribed to topic: ${entity.subscribeTopic}`);
                }
            });
        });
    } catch (error) {
        console.error('Error subscribing to topics:', error);
    }
};

const handleIncomingMessage = async (topic, message) => {
    const entity = await Entity.findOne({ subscribeTopic: topic });
    if (entity) {
        // Update state in the database
        entity.state = message;
        entity.updatedAt = new Date();
        entity.history.push({ value: message, time: new Date() });
        await entity.save();

        // Notify all connected WebSocket clients
        // io.emit('stateUpdate', {
        //     entityId: entity.entityId,
        //     state: entity.state,
        // });

        console.log(`Updated state for ${entity.entityName}: ${message}`);
    } else {
        console.log(`No entity found for topic: ${topic}`);
    }
};


module.exports = { subscribeToTopics,handleIncomingMessage };
