const cron = require('node-cron');
const energyRawHistory = require('../models/energyMeterRawHistory.model');
const energyHourly = require('../models/energyMeterModels/energyHourly.model');
const energyDaily = require('../models/energyMeterModels/energyDaily.model');
const energyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const energyYearly = require('../models/energyMeterModels/energyYearly.model');

// HOURLY AGGREGATION
async function aggregateHourly() {
  try {
    const now = new Date();
    // Process the previous COMPLETE hour (not the current incomplete hour)
    // If it's 2:30 PM, process 1:00 PM - 2:00 PM
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Calculate the start and end of the previous complete hour
    const hourEnd = new Date(now);
    hourEnd.setMinutes(0, 0, 0); // Set to start of current hour
    const hourStart = new Date(hourEnd.getTime() - 60 * 60 * 1000); // One hour before

    console.log(`📊 Processing hourly aggregation for: ${hourStart.toISOString()} to ${hourEnd.toISOString()}`);

    const hourlyData = await energyRawHistory.aggregate([
      { 
        $match: { 
          time: { $gte: hourStart, $lt: hourEnd } 
        } 
      },
      { $sort: { time: 1 } },
      {
        $group: {
          _id: {
            entityId: "$entityId",
            year: { $year: "$time" },
            month: { $month: "$time" },
            day: { $dayOfMonth: "$time" },
            hour: { $hour: "$time" }
          },
          first: { $first: "$value" },
          last: { $last: "$value" },
          count: { $sum: 1 } // Track number of readings
        }
      },
      {
        $project: {
          _id: 0,
          entityId: "$_id.entityId",
          first: 1,
          last: 1,
          timestamp: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
              hour: "$_id.hour"
            }
          },
          readingCount: "$count"
        }
      }
    ]);

    let upsertedCount = 0;
    for (const doc of hourlyData) {
      try {
        // Calculate totalValue with proper error handling
        let totalValue = 0;
        
        if (doc.readingCount > 1) {
          // Convert values to numbers (handles both string and number types)
          const firstVal = typeof doc.first === 'number' ? doc.first : parseFloat(doc.first) || 0;
          const lastVal = typeof doc.last === 'number' ? doc.last : parseFloat(doc.last) || 0;
          
          // Handle meter reset: if last < first, assume meter reset occurred
          if (lastVal < firstVal) {
            // Meter reset - use last value as consumption (meter went back to 0 or lower)
            totalValue = lastVal;
            console.log(`⚠️ Meter reset detected for entity ${doc.entityId}: ${firstVal} -> ${lastVal}`);
          } else {
            // Normal calculation: difference between last and first
            totalValue = lastVal - firstVal;
          }
          
          // Ensure non-negative and reasonable value
          totalValue = Math.max(0, Math.min(totalValue, 1000000)); // Cap at 1M kWh
        } else {
          // Single reading = 0 consumption (can't calculate difference)
          totalValue = 0;
        }
        
        // Validate the result
        if (typeof totalValue === 'number' && !isNaN(totalValue) && totalValue >= 0) {
          await energyHourly.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: totalValue,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping invalid hourly data for entity ${doc.entityId}: totalValue = ${totalValue}`);
        }
      } catch (error) {
        console.error(`❌ Error processing hourly data for entity ${doc.entityId}:`, error);
      }
    }

    console.log(`✅ Hourly aggregation complete. Processed ${hourlyData.length} entities, upserted ${upsertedCount} documents.`);

    // After hourly aggregation, trigger daily aggregation
    await aggregateDaily();  // Trigger daily aggregation immediately
  } catch (error) {
    console.error('❌ Error in hourly aggregation:', error);
    throw error;
  }
}

// DAILY AGGREGATION
async function aggregateDaily() {
  try {
    const dailyData = await energyHourly.aggregate([
      {
        $group: {
          _id: {
            entityId: "$entityId",
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" }
          },
          totalValue: { $sum: "$totalValue" },
          hourCount: { $sum: 1 } // Track number of hourly records
        }
      },
      {
        $project: {
          _id: 0,
          entityId: "$_id.entityId",
          totalValue: {
            $cond: {
              if: { $and: [{ $gte: ["$totalValue", 0] }, { $lte: ["$totalValue", 1000000] }] },
              then: "$totalValue",
              else: 0 // Invalid value, set to 0
            }
          },
          timestamp: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day"
            }
          }
        }
      }
    ]);

    let upsertedCount = 0;
    for (const doc of dailyData) {
      try {
        if (typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0) {
          await energyDaily.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping invalid daily data for entity ${doc.entityId}: totalValue = ${doc.totalValue}`);
        }
      } catch (error) {
        console.error(`❌ Error processing daily data for entity ${doc.entityId}:`, error);
      }
    }

    console.log(`✅ Daily aggregation complete. Processed ${dailyData.length} entities, upserted ${upsertedCount} documents.`);
  } catch (error) {
    console.error('❌ Error in daily aggregation:', error);
    throw error;
  }
}

// MONTHLY AGGREGATION (Updated to run more frequently)
async function aggregateMonthly() {
  try {
    const monthlyData = await energyDaily.aggregate([
      {
        $group: {
          _id: {
            entityId: "$entityId",
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" }
          },
          totalValue: { $sum: "$totalValue" }
        }
      },
      {
        $project: {
          _id: 0,
          entityId: "$_id.entityId",
          totalValue: {
            $cond: {
              if: { $and: [{ $gte: ["$totalValue", 0] }, { $lte: ["$totalValue", 10000000] }] },
              then: "$totalValue",
              else: 0 // Invalid value, set to 0
            }
          },
          timestamp: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: 1
            }
          }
        }
      }
    ]);

    let upsertedCount = 0;
    for (const doc of monthlyData) {
      try {
        if (typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0) {
          await energyMonthly.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping invalid monthly data for entity ${doc.entityId}: totalValue = ${doc.totalValue}`);
        }
      } catch (error) {
        console.error(`❌ Error processing monthly data for entity ${doc.entityId}:`, error);
      }
    }

    console.log(`✅ Monthly aggregation complete. Processed ${monthlyData.length} entities, upserted ${upsertedCount} documents.`);
  } catch (error) {
    console.error('❌ Error in monthly aggregation:', error);
    throw error;
  }
}

// YEARLY AGGREGATION (Updated to run daily)
async function aggregateYearly() {
  try {
    const yearlyData = await energyMonthly.aggregate([
      {
        $group: {
          _id: {
            entityId: "$entityId",
            year: { $year: "$timestamp" }
          },
          totalValue: { $sum: "$totalValue" }
        }
      },
      {
        $project: {
          _id: 0,
          entityId: "$_id.entityId",
          totalValue: {
            $cond: {
              if: { $and: [{ $gte: ["$totalValue", 0] }, { $lte: ["$totalValue", 100000000] }] },
              then: "$totalValue",
              else: 0 // Invalid value, set to 0
            }
          },
          timestamp: {
            $dateFromParts: {
              year: "$_id.year",
              month: 1,
              day: 1
            }
          }
        }
      }
    ]);

    let upsertedCount = 0;
    for (const doc of yearlyData) {
      try {
        if (typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0) {
          await energyYearly.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping invalid yearly data for entity ${doc.entityId}: totalValue = ${doc.totalValue}`);
        }
      } catch (error) {
        console.error(`❌ Error processing yearly data for entity ${doc.entityId}:`, error);
      }
    }

    console.log(`✅ Yearly aggregation complete. Processed ${yearlyData.length} entities, upserted ${upsertedCount} documents.`);
  } catch (error) {
    console.error('❌ Error in yearly aggregation:', error);
    throw error;
  }
}

// CRON SCHEDULERS
function scheduleAggregations() {
  // HOURLY: every hour at minute 1
  cron.schedule('1 * * * *', () => {
    console.log('🕐 Running Hourly Aggregation');
    aggregateHourly();
  });

  // DAILY: every day at 00:1 AM
  cron.schedule('1 0 * * *', () => {
    console.log('📅 Running Daily Aggregation');
    aggregateDaily();
  });

  // MONTHLY: every day at 00:20 AM (instead of once a month, this runs daily)
  cron.schedule('20 0 * * *', () => {
    console.log('🗓️ Running Monthly Aggregation');
    aggregateMonthly();
  });
  //   cron.schedule('* * * * *', () => {
  //   console.log('🗓️ Running Monthly Aggregation for testing');
  //   aggregateMonthly();
  // });


  // YEARLY: every day at 00:30 AM (instead of just Jan 1st, it runs daily)
  cron.schedule('30 0 * * *', () => {
    console.log('📆 Running Yearly Aggregation');
    aggregateYearly();
  });
  // cron.schedule('* * * * *', () => {
  //   console.log('🗓️ Running yearly Aggregation for testing');
  //   aggregateMonthly();
  // });

  console.log('🧭 Aggregation schedulers initialized.');
}

module.exports = {
  scheduleAggregations
};