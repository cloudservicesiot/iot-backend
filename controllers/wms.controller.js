const mongoose = require("mongoose");
const EntityHistory = require("../models/entityHistory.model");
const Entity = require("../models/entity.model");
const Device = require("../models/Device.model");
const { ObjectId } = require('mongoose').Types;

const getWmsMotors = async (req, res) => {
  try {
    const result = await Entity.aggregate([
        {
            $match: {
              
              $or: [
                { entityId: /wms-b17_motor_controller_1/i },
                { entityId: /wms-b17_motor_controller_2/i },
             
              ]
            }
          },
          
      {
        $lookup: {
          from: "devices",
          localField: "device",
          foreignField: "_id",
          as: "deviceInfo",
        },
      },
      {
        $unwind: "$deviceInfo",
      },
      {
        $project: {
          _id: 1,
          entityName: 1,
          deviceName: "$deviceInfo.name",
          entityId: 1,
          state: 1,
        },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
  
  const getWmsMotorsHistory = async (req, res) => {
    const { entityId } = req.params;

    try {
        const entityHistory = await EntityHistory.findOne({ entityId }).select('history');

        if (!entityHistory) {
            return res.status(404).json({ error: 'Entity history not found' });
        }

        res.status(200).json(entityHistory.history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
  

const getWfsPulseCounter = async (req, res) => {
  try {
    const result = await Entity.aggregate([
      {
        $match: {
          stateType: "sensor",
          $or: [
            { entityName: /WFS Pulse Counter 1/i },
            { entityName: /WFS Pulse Counter 2/i }
          ]
        }
      },
      {
        $lookup: {
          from: "devices",
          localField: "device",
          foreignField: "_id",
          as: "deviceInfo",
        },
      },
      {
        $unwind: "$deviceInfo",
      },
      {
        $project: {
          _id: 1,
          entityName: 1,
          deviceName: "$deviceInfo.name",
          entityId: 1,
          state: 1,
        },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllWmsEntities= async(req,res)=>{
  const deviceId= "67727f1fa2ab72f2309c9810";
  try{
    const wmsEntities= await Entity.find({
      device:new ObjectId(deviceId),
    })
    if(!wmsEntities || wmsEntities.length === 0){
      return res.status(404).json({
        message:"No WMS entities found"
      })
    }
    res.status(200).json({
      data:wmsEntities
    });
  }catch(error){
    res.status(500).json({
      error:error.message,
    })
  }
}


module.exports =  
{getWmsMotorsHistory, 
getWmsMotors,
getWfsPulseCounter,
getAllWmsEntities
};


