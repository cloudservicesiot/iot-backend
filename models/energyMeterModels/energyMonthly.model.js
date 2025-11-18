const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyMonthlySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    totalEnergyConsumption: { type: Number, required: true }, // Total meter reading at end of month
    timestamp: { type: Date, required: true },
});

const energyMonthlyModel = mongoose.model('EnergyMonthly', energyMonthlySchema);
module.exports = energyMonthlyModel;
