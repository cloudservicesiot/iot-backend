const mongoose = require('mongoose');

const entityRawSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.Mixed, // can be string, number, etc.
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

const entityRawHistorySchema = mongoose.model('EntityRaw', entityRawSchema);
module.exports = entityRawHistorySchema;