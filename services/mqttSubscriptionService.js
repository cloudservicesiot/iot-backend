const mqttClient = require('../mqtt/mqttClient');
const Entity = require('../models/entity.model');

class MQTTSubscriptionService {
  constructor() {
    this.subscribedTopics = new Set();
  }

  // Subscribe to a single entity's topic
  async subscribeToEntity(entityId) {
    try {
      const entity = await Entity.findById(entityId);
      if (!entity) {
        console.error(`Entity with ID ${entityId} not found`);
        return false;
      }

      if (!entity.subscribeTopic) {
        console.error(`Entity ${entity.entityName} has no subscribe topic`);
        return false;
      }

      if (entity.isActive && !this.subscribedTopics.has(entity.subscribeTopic)) {
        return new Promise((resolve, reject) => {
          mqttClient.subscribe(entity.subscribeTopic, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${entity.subscribeTopic}:`, err);
              reject(err);
            } else {
              this.subscribedTopics.add(entity.subscribeTopic);
              console.log(`✅ Dynamically subscribed to topic: ${entity.subscribeTopic}`);
              resolve(true);
            }
          });
        });
      }
      return true;
    } catch (error) {
      console.error('Error subscribing to entity:', error);
      return false;
    }
  }

  // Unsubscribe from an entity's topic
  async unsubscribeFromEntity(entityId) {
    try {
      const entity = await Entity.findById(entityId);
      if (!entity || !entity.subscribeTopic) {
        return true;
      }

      if (this.subscribedTopics.has(entity.subscribeTopic)) {
        return new Promise((resolve, reject) => {
          mqttClient.unsubscribe(entity.subscribeTopic, (err) => {
            if (err) {
              console.error(`Failed to unsubscribe from ${entity.subscribeTopic}:`, err);
              reject(err);
            } else {
              this.subscribedTopics.delete(entity.subscribeTopic);
              console.log(`✅ Unsubscribed from topic: ${entity.subscribeTopic}`);
              resolve(true);
            }
          });
        });
      }
      return true;
    } catch (error) {
      console.error('Error unsubscribing from entity:', error);
      return false;
    }
  }

  // Subscribe to all active entities
  async subscribeToAllActiveEntities() {
    try {
      const entities = await Entity.find({ isActive: false });
      const subscriptionPromises = entities.map(entity => {
        if (entity.subscribeTopic && !this.subscribedTopics.has(entity.subscribeTopic)) {
          return new Promise((resolve, reject) => {
            mqttClient.subscribe(entity.subscribeTopic, (err) => {
              if (err) {
                console.error(`Failed to subscribe to ${entity.subscribeTopic}:`, err);
                reject(err);
              } else {
                this.subscribedTopics.add(entity.subscribeTopic);
                console.log(`✅ Subscribed to topic: ${entity.subscribeTopic}`);
                resolve(true);
              }
            });
          });
        }
        return Promise.resolve(true);
      });

      await Promise.all(subscriptionPromises);
      console.log(`✅ Total subscribed topics: ${this.subscribedTopics.size}`);
    } catch (error) {
      console.error('Error subscribing to all entities:', error);
    }
  }

  // Get list of currently subscribed topics
  getSubscribedTopics() {
    return Array.from(this.subscribedTopics);
  }

  // Check if a topic is subscribed
  isTopicSubscribed(topic) {
    return this.subscribedTopics.has(topic);
  }
}

// Create a singleton instance
const mqttSubscriptionService = new MQTTSubscriptionService();

module.exports = mqttSubscriptionService;
