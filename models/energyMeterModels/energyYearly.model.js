const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyYearlySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    totalEnergyConsumption: { type: Number,}, // Total meter reading at end of year
    timestamp: { type: Date, required: true },
});

const energyYearlyModel = mongoose.model('EnergyYearly', energyYearlySchema);
module.exports = energyYearlyModel;
