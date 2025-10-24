const mongoose =require('mongoose');

const DeviceSchema=new mongoose.Schema(
{
    name:{
        type:String,
        required:true,
    },
    isActive:{
        type:Boolean,
        default:true
      },
      status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
},
deviceId:{
    type:String,
    unique:true
}

},
{timestamps:true},
)
const Device=new mongoose.model('Device',DeviceSchema);
module.exports=Device
