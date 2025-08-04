const mongoose = require("mongoose");
const EntityHistory = require("../models/entityHistory.model");
const Entity = require("../models/entity.model");
const Device = require("../models/Device.model");
const { ObjectId } = require('mongoose').Types;
const entityRawHistory = require("../models/entityRawHistory.model");


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

const getMotorTimeSlotsByEntityIdAndDateRange = async (req, res) => {
  try {
    const { entityId, startDate, endDate } = req.query;
    if (!entityId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all raw history records for the entity, sorted by time
    const history = await entityRawHistory.find({
      entityId,
      time: { $gte: start, $lte: end }
    }).sort({ time: 1 });

    if (!history.length) {
      return res.status(404).json({ message: "No motor history found for this entity in the specified date range." });
    }

    // Build grouped time slots
    const slots = [];
    let slotStart = history[0].time;
    let currentStatus = history[0].value === "OFF" ? "OFF" : "ON";

    for (let i = 1; i < history.length; i++) {
      const status = history[i].value === "OFF" ? "OFF" : "ON";
      if (status !== currentStatus) {
        // Status changed, close previous slot
        slots.push({
          start: slotStart,
          end: history[i].time,
          status: currentStatus
        });
        // Start new slot
        slotStart = history[i].time;
        currentStatus = status;
      }
    }
    // Add last slot
    slots.push({
      start: slotStart,
      end: null,
      status: currentStatus
    });

    res.status(200).json({ slots });
  } catch (error) {
    res.status(500).json({ message: "Error fetching motor time slots", error });
  }
};

const getMotorHistoryByEntityIdAndDateRange = async (req, res) => {
  try {
    const { entityId, startDate, endDate } = req.query;
    if (!entityId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all raw history records for the entity, sorted by time
    const history = await entityRawHistory.find({
      entityId,
      time: { $gte: start, $lte: end }
    }).sort({ time: 1 });

    res.status(200).json({ data: history });
  } catch (error) {
    res.status(500).json({ message: "Error fetching motor history", error });
  }
};

module.exports =  
{
  getWmsMotorsHistory, 
  getWmsMotors,
  getWfsPulseCounter,
  getAllWmsEntities,
  getMotorTimeSlotsByEntityIdAndDateRange,
  getMotorHistoryByEntityIdAndDateRange
};


