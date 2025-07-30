

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EntitySchema = new mongoose.Schema({
    device: {
        type: Schema.Types.ObjectId,
        ref: "Device", 
    },
    entityName: {
        type: String,
        required: true,
    },
    entityId: {
        type: String,
        required: true,
    },
    subscribeTopic: {
        type: String,
        required: true,
    },
    publishTopic: {
        type: String,
    },
    stateType: {
        type: String,
        enum: ['switch', 'sensor','dimmer'],
        required: true
    },
    state: {
        type: Schema.Types.Mixed, 
        required: true
    },
    isActive: {  
        type: Boolean,
        default: true
    }
}, {
    timestamps: true 
  
});

const EntityModel = mongoose.model('Entity', EntitySchema);
module.exports = EntityModel;
