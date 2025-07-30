const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const entityHistorySchema = new Schema({
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device'},
    history: [
        {
            value: { type: String, required: true },
            time: { type: Date, default: Date.now },
        },
    ],
});

module.exports = mongoose.model('EntityHistory', entityHistorySchema);
