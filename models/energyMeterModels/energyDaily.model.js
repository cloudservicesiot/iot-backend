const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyDailySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    totalEnergyConsumption: { type: Number,}, // Total meter reading at end of day
    timestamp: { type: Date, required: true },
});

const energyDailyModel = mongoose.model('EnergyDaily', energyDailySchema);
module.exports = energyDailyModel;