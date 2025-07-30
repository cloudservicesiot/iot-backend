// energyLogger.js
const energyRawHistorySchema = require('../models/energyMeterRawHistory.model');
async function energyRawHistoryController(entity, entityId, deviceId, newState) {
// if (entity.entityName === 'PZEM-004T V3 Energy' && entity.entityName === 'PZEM-004T V3 Energy-1' && entity.entityName === 'PZEM-004T V3 Energy-2' && entity.entityName === 'PZEM-004T V3 Energy-3' ) {
if (entity.entityName === 'PZEM-004T V3 Energy' || entity.entityName === 'PZEM-004T V3 Energy-1' || entity.entityName === 'PZEM-004T V3 Energy-2' || entity.entityName === 'PZEM-004T V3 Energy-3' ) {  
await energyRawHistorySchema.create({ entityId, deviceId, value: newState, time: new Date() });
    console.log(`Energy raw history recorded for entity ${entityId} with value ${newState}`);
  }
}

module.exports = { energyRawHistoryController };
