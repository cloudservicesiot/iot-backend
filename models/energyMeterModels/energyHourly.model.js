const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyHourlySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    timestamp: { type: Date, required: true },
});

const energyHourlyModel = mongoose.model('EnergyHourly', energyHourlySchema);
module.exports = energyHourlyModel;
// const energyHourlySchema = new mongoose.Schema({
//   entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   year: Number,
//   month: Number,
//   day: Number,
//   totalValue: Number
// }, { timestamps: true }); // ← KEEP THIS

// module.exports = mongoose.model('EnergyHourly', energyHourlySchema);


