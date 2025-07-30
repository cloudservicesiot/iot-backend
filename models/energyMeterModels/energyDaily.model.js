const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const energyDailySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    totalValue: { type: Number, required: true },
    timestamp: { type: Date, required: true }, // Timestamp of that hour
});

const energyDailyModel = mongoose.model('EnergyDaily', energyDailySchema);
module.exports = energyDailyModel;
// const energyDailySchema = new mongoose.Schema({
//   entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   year: Number,
//   month: Number,
//   day: Number,
//   totalValue: Number
// }, { timestamps: true }); // ← KEEP THIS

// module.exports = mongoose.model('EnergyDaily', energyDailySchema);
