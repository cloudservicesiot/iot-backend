const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AirConditionerHistorySchema = new Schema({
  airConditioner: { type: Schema.Types.ObjectId, ref: "Airconditioner", required: true },
  mode: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const AirConditionerHistory = mongoose.model("AirConditionerHistory", AirConditionerHistorySchema);
module.exports = AirConditionerHistory;