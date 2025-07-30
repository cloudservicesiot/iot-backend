// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const AirConditionerSchema = new Schema(
//   {
//     devicename: {
//       type: String,
//       required: true,
//     },
//     deviceID: {
//       type: String,
//       required: true,
//     },
//     deviceStatus:{
//       state:{
//       type: String,
//       default: "online",
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     power: {
//       state: {
//         type: String,
//         default: "off",
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//       publishTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     mode: {
//       state: {
//         type: String,
//         default: "Heat",
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//       publishTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     targetTemperature: {
//       state: {
//         type: Number,
//         default: 26,
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//       publishTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     currentTemperature: {
//       state: {
//         type: Number,
//         default: 18,
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     swingMode: {
//       state: {
//         type: String,
//         default: "off",
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//       publishTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     fanMode: {
//       state: {
//         type: String,
//         default: "auto",
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//       publishTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     currentHumidity: {
//       state: {
//         type: Number,
//         default: 40,
//       },
//       subscribeTopic: {
//         type: String,
//         required: true,
//       },
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const AirConditionerModel = mongoose.model("Airconditioner", AirConditionerSchema);
// module.exports = AirConditionerModel;



const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AirConditionerSchema = new Schema({
  devicename: {
    type: String,
    required: true,
  },
  deviceID:{
    type: String,
    required: true,
  },
  power: {
   type:String,
   default: "off",
  },
  mode: {
    type: String,
    default: "Cool",
  },
  targetTemperature: {
     type: Number,
      default: 26,
  },
  currentTemperature: {
   type: Number,
    default: 30,
  },
  swingMode: {
    type: String,
    default: "off",
  },
  fanMode: {
    type: String,
    default: "auto",
  },
  currentHumidity: {
    type: Number,
    default: 40,
  },
  presetState: {
    type: String,
    default: "auto",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const AirConditionerModel = mongoose.model("Airconditioner", AirConditionerSchema);
module.exports = AirConditionerModel ;
