const mongoose = require("mongoose");
const EntityHistory = require("../models/entityHistory.model");
const Entity = require("../models/entity.model");
const Device = require("../models/Device.model");
const entityRawHistory = require("../models/entityRawHistory.model");
const energyMeterRawHistory= require("../models/energyMeterRawHistory.model");

const getAllEntities = async (req, res) => {
  try {
    const result = await Entity.aggregate([
     
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
      { $match: { "deviceInfo.isActive": true } },
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


const getEntityHistory = async (req, res) => {
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

const getEntityRawHistoryByEntityIdAndDate = async (req, res) => {
  try {
    const { entityId, date } = req.query;
    if (!entityId || !date) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Parse date and get start/end of day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Find all history for that entity and day
    const history = await entityRawHistory.find({
      entityId,
      time: { $gte: dayStart, $lte: dayEnd }
    }).sort({ time: 1 });

    res.status(200).json({ data: history });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {getAllEntities,getEntityHistory,getEntityRawHistoryByEntityIdAndDate}