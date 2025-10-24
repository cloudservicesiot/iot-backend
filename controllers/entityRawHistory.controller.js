const entityRawHistorySchema = require('../models/entityRawHistory.model');

async function entityRawHistoryController(entity, entityId, deviceId, newState) {
  // Exclude energy meters, since those are handled separately
  // if (
  //   entity.entityName !== 'PZEM-004T V3 Energy' &&
  //   entity.entityName !== 'PZEM-004T V3 Energy-1' &&
  //   entity.entityName !== 'PZEM-004T V3 Energy-2' &&
  //   entity.entityName !== 'PZEM-004T V3 Energy-3'
  // )
  //  {
  //   await entityRawHistorySchema.create({ entityId, deviceId, value: newState, time: new Date() });
  //   console.log(`Entity raw history recorded for entity ${entityId} with value ${newState}`);
  // }

   
    await entityRawHistorySchema.create({ entityId, deviceId, value: newState, time: new Date() });
    // console.log(`Entity raw history recorded for entity ${entityId} with value ${newState}`);
  
}

module.exports = { entityRawHistoryController };