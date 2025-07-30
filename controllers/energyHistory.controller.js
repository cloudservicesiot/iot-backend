const mongoose = require("mongoose");
const EntityHistory = require("../models/entityHistory.model");
const Entity = require("../models/entity.model");
const Device = require("../models/Device.model");
const EnergyHourly = require('../models/energyMeterModels/energyHourly.model');
const EnergyDaily = require('../models/energyMeterModels/energyDaily.model');
const EnergyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const EnergyYearly = require('../models/energyMeterModels/energyYearly.model');

// Helper function to fill missing hours with zero values
function fillMissingHours(data, startDate, endDate, entityId) {
  const result = [];
  const hourMap = new Map();
 
  // Create a map of existing data by hour
  data.forEach(item => {
    const date = new Date(item.timestamp);
    const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    hourMap.set(hourKey, item);
  });

  // Generate all hours in the range
  const currentHour = new Date(startDate);
  while (currentHour <= endDate) {
    const hourKey = `${currentHour.getFullYear()}-${currentHour.getMonth()}-${currentHour.getDate()}-${currentHour.getHours()}`;
    const existingData = hourMap.get(hourKey);
   
    if (existingData) {
      result.push(existingData);
    } else {
      result.push({
        entityId,
        timestamp: new Date(currentHour),
        totalValue: 0,
        _id: `empty-${currentHour.getTime()}`
      });
    }
   
    currentHour.setHours(currentHour.getHours() + 1);
  }

  return result;
}

// Helper function to fill missing days with zero values
function fillMissingDays(data, startDate, endDate, entityId) {
  const result = [];
  const dayMap = new Map();
 
  // Create a map of existing data by day
  data.forEach(item => {
    const date = new Date(item.timestamp);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    dayMap.set(dayKey, item);
  });

  // Generate all days in the range
  const currentDay = new Date(startDate);
  while (currentDay <= endDate) {
    const dayKey = `${currentDay.getFullYear()}-${currentDay.getMonth()}-${currentDay.getDate()}`;
    const existingData = dayMap.get(dayKey);
   
    if (existingData) {
      result.push(existingData);
    } else {
      result.push({
        entityId,
        timestamp: new Date(currentDay),
        totalValue: 0,
        _id: `empty-${currentDay.getTime()}`
      });
    }
   
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return result;
}

// Helper function to fill missing months with zero values
function fillMissingMonths(data, startDate, endDate, entityId) {
  const result = [];
  const monthMap = new Map();

  // Create a map of existing data by month
  data.forEach(item => {
    const date = new Date(item.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    monthMap.set(monthKey, item);
  });

  // Generate all months in the range (including current month)
  const currentMonth = new Date(startDate);
  while (currentMonth <= endDate) {
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    const existingData = monthMap.get(monthKey);

    if (existingData) {
      result.push(existingData);
    } else {
      result.push({
        entityId,
        timestamp: new Date(currentMonth),
        totalValue: 0,
        _id: `empty-${currentMonth.getTime()}`
      });
    }

    currentMonth.setMonth(currentMonth.getMonth() + 1); // Increment month by 1
  }

  return result;
}


// Helper function to fill missing years with zero values
function fillMissingYears(data, startDate, endDate, entityId) {
  const result = [];
  const yearMap = new Map();
 
  // Create a map of existing data by year
  data.forEach(item => {
    const year = new Date(item.timestamp).getFullYear();
    yearMap.set(year, item);
  });

  // Generate all years in the range
  const currentYear = new Date(startDate);
  while (currentYear <= endDate) {
    const year = currentYear.getFullYear();
    const existingData = yearMap.get(year);
   
    if (existingData) {
      result.push(existingData);
    } else {
      result.push({
        entityId,
        timestamp: new Date(currentYear),
        totalValue: 0,
        _id: `empty-${currentYear.getTime()}`
      });
    }
   
    currentYear.setFullYear(currentYear.getFullYear() + 1);
  }

  return result;
}

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

    // Fill missing time periods based on the data type
    let filledData;
    switch (type) {
      case 'hourly':
        filledData = fillMissingHours(data, startDate, endDate, entityId);
        break;
      case 'daily':
        filledData = fillMissingDays(data, startDate, endDate, entityId);
        break;
      case 'monthly':
        filledData = fillMissingMonths(data, startDate, endDate, entityId);
        break;
      case 'yearly':
        filledData = fillMissingYears(data, startDate, endDate, entityId);
        break;
      default:
        filledData = data;
    }

    res.json(filledData);
  } catch (err) {
    console.error('Error fetching energy data:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
};

// // Helper function to fill missing months with zero values
// function fillMissingMonths(data, startDate, endDate, entityId) {
//   const result = [];
//   const monthMap = new Map();
 
//   // Create a map of existing data by month
//   data.forEach(item => {
//     const monthYear = `${new Date(item.timestamp).getMonth()}-${new Date(item.timestamp).getFullYear()}`;
//     monthMap.set(monthYear, item);
//   });

//   // Generate all months in the range
//   const currentMonth = new Date(startDate);
//   while (currentMonth <= endDate) {
//     const monthYear = `${currentMonth.getMonth()}-${currentMonth.getFullYear()}`;
//     const existingData = monthMap.get(monthYear);
   
//     if (existingData) {
//       result.push(existingData);
//     } else {
//       result.push({
//         entityId,
//         timestamp: new Date(currentMonth),
//         totalValue: 0,
//         _id: `empty-${currentMonth.getTime()}`
//       });
//     }
   
//     currentMonth.setMonth(currentMonth.getMonth() + 1);
//   }

//   return result;
// }
// const getEnergyDataByFilter = async (req, res) => {
//   try {
//     const { entityId, type, start, end } = req.query;
//     let Model;
//     switch (type) {
//       case 'hourly': Model = EnergyHourly; break;
//       case 'daily': Model = EnergyDaily; break;
//       case 'monthly': Model = EnergyMonthly; break;
//       case 'yearly': Model = EnergyYearly; break;
//       default: return res.status(400).json({ error: 'Invalid type' });
//     }

//     const query = {
//       entityId,
//       timestamp: { $gte: new Date(start), $lte: new Date(end) }
//     };

//     const data = await Model.find(query).sort({ timestamp: 1 });
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// const { startOfHour, addHours, startOfDay, addDays, startOfMonth, addMonths, format } = require('date-fns');

// const getEnergyDataByFilter = async (req, res) => {
//   try {
//     const { entityId, type, start, end } = req.query;
//     let Model, intervals = [], intervalFn, formatStr;

//     switch (type) {
//       case 'hourly':
//         Model = EnergyHourly;
//         intervalFn = addHours;
//         formatStr = 'yyyy-MM-dd HH:00';
//         // Generate 24 hours from 12am
//         {
//           let current = startOfDay(new Date(start));
//           for (let i = 0; i < 24; i++) {
//             intervals.push(format(addHours(current, i), formatStr));
//           }
//         }
//         break;
//       case 'daily':
//         Model = EnergyDaily;
//         intervalFn = addDays;
//         formatStr = 'yyyy-MM-dd';
//         // 7 or 30 days
//         {
//           let days = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
//           let current = startOfDay(new Date(start));
//           for (let i = 0; i < days; i++) {
//             intervals.push(format(addDays(current, i), formatStr));
//           }
//         }
//         break;
//       case 'monthly':
//         Model = EnergyMonthly;
//         intervalFn = addMonths;
//         formatStr = 'yyyy-MM';
//         // 12 months
//         {
//           let current = startOfMonth(new Date(start));
//           for (let i = 0; i < 12; i++) {
//             intervals.push(format(addMonths(current, i), formatStr));
//           }
//         }
//         break;
//       case 'yearly':
//         Model = EnergyYearly;
//         intervalFn = null;
//         formatStr = 'yyyy';
//         // You can implement yearly if needed
//         break;
//       default:
//         return res.status(400).json({ error: 'Invalid type' });
//     }

//     const query = {
//       entityId,
//       timestamp: { $gte: new Date(start), $lte: new Date(end) }
//     };

//     const data = await Model.find(query).sort({ timestamp: 1 });

//     // Map data to interval keys
//     const dataMap = {};
//     data.forEach(item => {
//       let key;
//       if (type === 'hourly') key = format(new Date(item.timestamp), 'yyyy-MM-dd HH:00');
//       if (type === 'daily') key = format(new Date(item.timestamp), 'yyyy-MM-dd');
//       if (type === 'monthly') key = format(new Date(item.timestamp), 'yyyy-MM');
//       dataMap[key] = item;
//     });

//     // Fill missing intervals
//     const result = intervals.map(key => {
//       if (dataMap[key]) {
//         return {
//           ...dataMap[key]._doc,
//           interval: key
//         };
//       } else {
//         return {
//           interval: key,
//           totalValue: 0,
//           timestamp: key
//         };
//       }
//     });

//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
// const getAllEnergyEntities = async (req, res) => {
//   try {
//     const result = await Entity.aggregate([
//       {
//         $match: { stateType: "sensor", entityName: /PZEM-004T V3 Energy/i },
//       },
//       {
//         $lookup: {
//           from: "devices",
//           localField: "device",
//           foreignField: "_id",
//           as: "deviceInfo",
//         },
//       },
//       {
//         $unwind: "$deviceInfo",
//       },
//       // exclude inactive devices
//       { $match: { "deviceInfo.isActive": true } },
//       {
//         $project: {
//           _id: 1,
//           entityName: 1,
//           deviceName: "$deviceInfo.name",
//           entityId: 1,
//           state: 1,
//         },
//       },
//     ]);

//     res.status(200).json(result);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
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
module.exports =  
{getEnergyHistory,
getAllEnergyEntities,
getEnergyDataByFilter,
getEntityWithAllDeviceEntities
};