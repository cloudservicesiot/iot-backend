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

const getEntityRawHistoryByEntityIdAndDateRange = async (req, res) => {
  try {
    const { entityId, startDate, endDate } = req.query;
    if (!entityId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Parse dates and set time boundaries
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Find all history for that entity in the date range
    const history = await entityRawHistory.find({
      entityId,
      time: { $gte: start, $lte: end }
    }).sort({ time: 1 });

    res.status(200).json({ data: history });
  } catch (error) {
    console.error('Error fetching entity raw history by date range:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Optimized endpoint: Get matched entity values for specific timestamps
// This processes matching on backend and returns only needed data
const getMatchedEntityValuesForTimestamps = async (req, res) => {
  try {
    const { entityIds, startDate, endDate, energyTimestamps } = req.body;
    
    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({ error: "entityIds array is required" });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    if (!energyTimestamps || !Array.isArray(energyTimestamps) || energyTimestamps.length === 0) {
      return res.status(400).json({ error: "energyTimestamps array is required" });
    }

    // Parse dates and set time boundaries
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Time window for matching (5 minutes in milliseconds)
    const MATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    // Fetch raw history for all entities in parallel
    const entityHistories = await Promise.all(
      entityIds.map(async (entityId) => {
        try {
          const history = await entityRawHistory.find({
            entityId,
            time: { $gte: start, $lte: end }
          }).sort({ time: 1 }).lean();
          
          return { entityId, history };
        } catch (err) {
          console.error(`Error fetching history for entity ${entityId}:`, err);
          return { entityId, history: [] };
        }
      })
    );

    // Process matching: For each entity and each energy timestamp, find nearest value
    const result = {};
    
    entityHistories.forEach(({ entityId, history }) => {
      if (!history || history.length === 0) {
        result[entityId] = {};
        return;
      }

      const matchedValues = {};
      
      energyTimestamps.forEach((timestamp) => {
        const targetTime = new Date(timestamp).getTime();
        let nearest = null;
        let minDiff = Infinity;

        // Find nearest value within 5 minutes
        for (const item of history) {
          const itemTime = new Date(item.time).getTime();
          const diff = Math.abs(itemTime - targetTime);
          
          if (diff < minDiff && diff <= MATCH_WINDOW_MS) {
            minDiff = diff;
            nearest = item;
          }
        }

        if (nearest) {
          matchedValues[timestamp] = nearest;
        }
      });

      result[entityId] = matchedValues;
    });

    res.status(200).json({ data: result });
  } catch (error) {
    console.error('Error fetching matched entity values:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getAllEntities,
  getEntityHistory,
  getEntityRawHistoryByEntityIdAndDate,
  getEntityRawHistoryByEntityIdAndDateRange,
  getMatchedEntityValuesForTimestamps
}