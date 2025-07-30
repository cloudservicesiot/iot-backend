const mongoose = require('mongoose');

const energyRawSchema = new mongoose.Schema({
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity',
    required: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  time: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

const energyRawHistorySchema = mongoose.model('EnergyRaw', energyRawSchema);
module.exports = energyRawHistorySchema;
