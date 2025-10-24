const mongoose = require("mongoose");
const EntityHistory = require("../models/entityHistory.model");
const Entity = require("../models/entity.model");
const Device = require("../models/Device.model");
const EnergyHourly = require('../models/energyMeterModels/energyHourly.model');
const EnergyDaily = require('../models/energyMeterModels/energyDaily.model');
const EnergyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const EnergyYearly = require('../models/energyMeterModels/energyYearly.model');
const energyRawHistoryModel= require('../models/energyMeterRawHistory.model');


const getEnergyDataByFilter = async (req, res) => {
  try {
    const { entityId, type, start, end } = req.query;
   
    // Validate inputs
    if (!entityId || !type || !start || !end) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let Model;
    switch (type) {
      case 'hourly': Model = EnergyHourly; break;
      case 'daily': Model = EnergyDaily; break;
      case 'monthly': Model = EnergyMonthly; break;
      case 'yearly': Model = EnergyYearly; break;
      default: return res.status(400).json({ error: 'Invalid type parameter' });
    }

    // Convert string dates to Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);

    const data = await Model.find({
      entityId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // Return only the actual data without filling missing periods
    res.json(data);
  } catch (err) {
    console.error('Error fetching energy data:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
};
const getAllEnergyEntities = async (req, res) => {
  try {
    const result = await Entity.aggregate([
      {
        $match: {
          stateType: "sensor",
          entityName: {
            $regex: /PZEM-004T V3 Energy/i,
            $nin:["PZEM-004T V3 Energy-2", "PZEM-004T V3 Energy-3"]
          },
        },
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
        $unwind: "$deviceInfo",  // Flatten deviceInfo array
      },
      // Exclude inactive devices and specific device names
      {
        $match: {
          "deviceInfo.isActive": true,  // Ensure the device is active
          "deviceInfo.name": { 
            $nin: ["Sales-2 Office Smart Energy Meter","CEO-2 Office Smart Energy Meter"]  // Exclude this specific device name
          },
        },
      },
      {
        $project: {
          _id: 1,
          entityName: 1,
          deviceName: "$deviceInfo.name",  // Show device name
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


  const getEnergyHistory = async (req, res) => {
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
 
 const getEntityWithAllDeviceEntities = async (req, res) => {
  try {
    const entityId = req.params.entityId;

    // Step 1: Find the main entity
    const mainEntity = await Entity.findById(entityId);
    if (!mainEntity) {
      return res.status(404).json({ message: 'Entity not found' });
    }

    // Step 2: Get the device ID from the main entity
    const deviceId = mainEntity.device;

    // Step 3: Get all entities for the same device
    const allEntities = await Entity.find({ device: deviceId });

    // Step 4: Optionally get the device details too
    const device = await Device.findById(deviceId);

    res.json({
      device,
      associatedEntities: allEntities
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// from date-range get energy history values by device id
const getEnergyHistoryByDeviceIdAndDateRange = async (req, res) => {
  const { deviceId, startDate, endDate } = req.query;

  try {
    // Validate inputs
    if (!deviceId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert string dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch energy history for the device
const energyHistory = await energyRawHistoryModel.find({
  deviceId,
  time: { $gte: start, $lte: end }
}).sort({ time: 1 });

    if (!energyHistory.length) {
      return res.status(404).json({ message: 'No energy history found for this device in the specified date range.' });
    }

    res.status(200).json(energyHistory);
  } catch (err) {
    console.error('Error fetching energy history:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

// get the daily energy history for a entity by device id
const getDailyEnergyHistoryByDeviceIdAndDateRange = async (req, res) => {
  const { entityId, startDate, endDate } = req.query;

  try {
    // Validate inputs
    if (!entityId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert string dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch daily energy history for the given entityId in the date range
    const dailyHistory = await EnergyDaily.find({
      entityId,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });

    if (!dailyHistory.length) {
      return res.status(404).json({ message: 'No daily energy history found for this entity in the specified date range.' });
    }

    // Calculate the sum and average of all totalValue fields
    const total = dailyHistory.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const average = dailyHistory.length > 0 ? total / dailyHistory.length : 0;

    res.status(200).json({
      summary: { total, average },
      data: dailyHistory
    });
  } catch (err) {
    console.error('Error fetching daily energy history:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

const specialMeterPairs = {
  '686b58ec216df753a7cb6088': ['6801053b097550e68a379420'],
  '680102fc097550e68a37940e': ['686b6c24e3a6c731e66cc9a0'],
  '6856bc0a9829f2f0badf259d': ['6856bc689829f2f0badf259f', '6856bc8e9829f2f0badf25a1']
};

const specialParentIds = Object.keys(specialMeterPairs);
const specialChildIds = Object.values(specialMeterPairs).flat();

const getAllEnergyMetersWithDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Step 1: Get all entities (do NOT exclude special meters by name)
    const entities = await Entity.aggregate([
      {
        $match: {
          stateType: "sensor",
          entityName: {
            $regex: /PZEM-004T V3 Energy/i
          },
        },
      },
      {
        $lookup: {
          from: "devices",
          localField: "device",
          foreignField: "_id",
          as: "deviceInfo",
        },
      },
      { $unwind: "$deviceInfo" },
      {
        $match: {
          "deviceInfo.isActive": true
        },
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

    // Step 2: Build a map for quick lookup
    const entityMap = {};
    entities.forEach(e => { entityMap[e._id.toString()] = e; });

    // Step 3: For each entity, get total consumption from EnergyDaily
    const consumptionMap = {};
    await Promise.all(
      entities.map(async (entity) => {
        const dailyRecords = await EnergyDaily.find({
          entityId: entity._id,
          timestamp: { $gte: start, $lte: end }
        });
        const totalConsumption = dailyRecords.reduce(
          (sum, rec) => sum + (rec.totalValue || 0),
          0
        );
        consumptionMap[entity._id.toString()] = totalConsumption;
      })
    );

    // Step 4: Prepare the response, handling special meter pairs
    const response = [];

    // Handle special parents
    for (const parentId of specialParentIds) {
      if (entityMap[parentId]) {
        let sum = consumptionMap[parentId] || 0;
        for (const childId of specialMeterPairs[parentId]) {
          sum += consumptionMap[childId] || 0;
        }
        response.push({
          ...entityMap[parentId],
          totalConsumption: sum
        });
      }
    }

    // Handle normal entities (not special parents or children, and not excluded by name)
    for (const entity of entities) {
      const id = entity._id.toString();
      // Exclude special parents and children from normal list
      if (
        !specialParentIds.includes(id) &&
        !specialChildIds.includes(id) &&
        entity.entityName !== "PZEM-004T V3 Energy-2" &&
        entity.entityName !== "PZEM-004T V3 Energy-3" &&
        entity.deviceName !== "Sales-2 Office Smart Energy Meter" &&
        entity.deviceName !== "CEO-2 Office Smart Energy Meter"
      ) {
        response.push({
          ...entity,
          totalConsumption: consumptionMap[id] || 0
        });
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get hourly energy data for a specific date
const getHourlyEnergyDataForDate = async (req, res) => {
  try {
    const { entityId, date } = req.query;
    
    if (!entityId || !date) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert date string to start and end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    // Get hourly data for the specific date
    const hourlyData = await EnergyHourly.find({
      entityId,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: 1 });

    // Return only the actual data without filling missing periods
    res.json(hourlyData);
  } catch (err) {
    console.error('Error fetching hourly energy data for date:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
};
module.exports =  
{getEnergyHistory,
getAllEnergyEntities,
getEnergyDataByFilter,
getEntityWithAllDeviceEntities,
getEnergyHistoryByDeviceIdAndDateRange,
getDailyEnergyHistoryByDeviceIdAndDateRange,
getAllEnergyMetersWithDateRange,
getHourlyEnergyDataForDate
};