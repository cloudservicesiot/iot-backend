const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyYearlySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    timestamp: { type: Date, required: true }, // Timestamp of that hour
});

const energyYearlyModel = mongoose.model('EnergyYearly', energyYearlySchema);
module.exports = energyYearlyModel;
