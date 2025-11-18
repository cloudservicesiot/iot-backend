const cron = require('node-cron');
const energyRawHistory = require('../models/energyMeterRawHistory.model');
const energyHourly = require('../models/energyMeterModels/energyHourly.model');
const energyDaily = require('../models/energyMeterModels/energyDaily.model');
const energyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const energyYearly = require('../models/energyMeterModels/energyYearly.model');

// Helper function to get last energy reading from raw history for a given time range
async function getLastEnergyReading(entityId, startTime, endTime) {
  try {
    const lastReading = await energyRawHistory
      .findOne({
        entityId: entityId,
        time: { $gte: startTime, $lte: endTime }
      })
      .sort({ time: -1 }) // Get the latest reading
      .select('value time')
      .lean();

    if (lastReading && lastReading.value !== undefined && lastReading.value !== null) {
      // Convert to number if it's a string
      const value = typeof lastReading.value === 'number' 
        ? lastReading.value 
        : parseFloat(lastReading.value);
      
      return isNaN(value) ? null : value;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error fetching last energy reading for entity ${entityId}:`, error);
    return null;
  }
}

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
        let totalEnergyConsumption = null;
        
        // Convert values to numbers (handles both string and number types)
        const firstVal = typeof doc.first === 'number' ? doc.first : parseFloat(doc.first) || 0;
        const lastVal = typeof doc.last === 'number' ? doc.last : parseFloat(doc.last) || 0;
        
        // Store the last value as totalEnergyConsumption (meter reading at end of hour)
        totalEnergyConsumption = isNaN(lastVal) ? null : lastVal;
        
        // For cumulative energy meters, we need to calculate consumption as:
        // currentHour.lastReading - previousHour.lastReading
        // First, try to get the previous hour's last reading from hourly aggregated data (faster and more reliable)
        const previousHourTimestamp = new Date(doc.timestamp.getTime() - 60 * 60 * 1000); // One hour before
        let previousHourLastReading = null;
        
        try {
          const previousHourData = await energyHourly.findOne({
            entityId: doc.entityId,
            timestamp: previousHourTimestamp
          }).select('totalEnergyConsumption').lean();
          
          if (previousHourData && previousHourData.totalEnergyConsumption !== undefined && previousHourData.totalEnergyConsumption !== null) {
            previousHourLastReading = typeof previousHourData.totalEnergyConsumption === 'number' 
              ? previousHourData.totalEnergyConsumption 
              : parseFloat(previousHourData.totalEnergyConsumption);
            if (isNaN(previousHourLastReading)) {
              previousHourLastReading = null;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching previous hour data for entity ${doc.entityId}:`, error);
        }
        
        // If not found in hourly data, try raw history as fallback
        if (previousHourLastReading === null || isNaN(previousHourLastReading)) {
          const previousHourEnd = new Date(hourStart.getTime() - 1); // One millisecond before current hour start
          const previousHourStart = new Date(previousHourEnd.getTime() - 60 * 60 * 1000); // One hour before
          previousHourLastReading = await getLastEnergyReading(doc.entityId, previousHourStart, previousHourEnd);
        }
        
        // Use previous hour's last reading as baseline, or current hour's first reading as fallback
        const baselineReading = previousHourLastReading !== null && !isNaN(previousHourLastReading) 
          ? previousHourLastReading 
          : (isNaN(firstVal) ? null : firstVal);
        
        if (baselineReading !== null && !isNaN(baselineReading) && !isNaN(lastVal)) {
          // Handle meter reset: if last < baseline, assume meter reset occurred
          if (lastVal < baselineReading) {
            // Meter reset - use last value as consumption (meter went back to 0 or lower)
            totalValue = lastVal;
            console.log(`⚠️ Meter reset detected for entity ${doc.entityId}: ${baselineReading} -> ${lastVal}`);
          } else {
            // Normal calculation: difference between current hour's last and previous hour's last (or current hour's first)
            totalValue = lastVal - baselineReading;
            // Debug logging for calculation verification
            if (previousHourLastReading !== null) {
              console.log(`📊 Entity ${doc.entityId} at ${doc.timestamp.toISOString()}: Previous hour last=${previousHourLastReading}, Current hour last=${lastVal}, Consumption=${totalValue.toFixed(2)}`);
            }
          }
          
          // Ensure non-negative and reasonable value
          totalValue = Math.max(0, Math.min(totalValue, 1000000)); // Cap at 1M kWh
        } else if (doc.readingCount > 1) {
          // Fallback: if we can't get baseline, use first reading of current hour
          if (!isNaN(firstVal) && !isNaN(lastVal)) {
            if (lastVal < firstVal) {
              totalValue = lastVal;
              console.log(`⚠️ Meter reset detected for entity ${doc.entityId}: ${firstVal} -> ${lastVal}`);
            } else {
              totalValue = lastVal - firstVal;
            }
            totalValue = Math.max(0, Math.min(totalValue, 1000000));
          } else {
            totalValue = 0;
          }
        } else {
          // Single reading = 0 consumption (can't calculate difference)
          totalValue = 0;
        }
        
        // Validate the result
        if (typeof totalValue === 'number' && !isNaN(totalValue) && totalValue >= 0) {
          // Validate totalEnergyConsumption - if null or NaN, try to get from raw history
          if (totalEnergyConsumption === null || isNaN(totalEnergyConsumption)) {
            // Try to get from raw history as fallback
            totalEnergyConsumption = await getLastEnergyReading(doc.entityId, hourStart, hourEnd);
          }
          
          // Ensure totalEnergyConsumption is valid before saving
          if (totalEnergyConsumption !== null && !isNaN(totalEnergyConsumption) && totalEnergyConsumption >= 0) {
            await energyHourly.updateOne(
              { entityId: doc.entityId, timestamp: doc.timestamp },
              { $set: { 
                entityId: doc.entityId, 
                totalValue: totalValue,
                totalEnergyConsumption: totalEnergyConsumption,
                timestamp: doc.timestamp
              } },
              { upsert: true }
            );
            upsertedCount++;
          } else {
            console.warn(`⚠️ Skipping hourly data for entity ${doc.entityId}: invalid totalEnergyConsumption = ${totalEnergyConsumption} at ${doc.timestamp}`);
          }
        } else {
          console.warn(`⚠️ Skipping invalid hourly data for entity ${doc.entityId}: totalValue = ${totalValue}`);
        }
      } catch (error) {
        console.error(`❌ Error processing hourly data for entity ${doc.entityId}:`, error);
      }
    }

    console.log(`✅ Hourly aggregation complete. Processed ${hourlyData.length} entities, upserted ${upsertedCount} documents.`);

    // After hourly aggregation, trigger daily aggregation (only if it's the first hour of the day)
    // This ensures daily aggregation runs after the last hour of the previous day is processed
    // Reuse the currentHour variable already declared at the start of the function
    if (currentHour === 1) { // Only trigger at 1 AM (after processing midnight hour)
      try {
        await aggregateDaily();
      } catch (error) {
        console.error('❌ Error triggering daily aggregation from hourly:', error);
        // Don't throw - let the cron job handle daily aggregation separately
      }
    }
  } catch (error) {
    console.error('❌ Error in hourly aggregation:', error);
    throw error;
  }
}

// DAILY AGGREGATION
async function aggregateDaily() {
  try {
    const now = new Date();
    // Process the previous COMPLETE day (not the current incomplete day)
    // If it's 2:30 PM on Aug 8, process Aug 7 (00:00 to 23:59:59)
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - 1); // Previous day
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(`📊 Processing daily aggregation for: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

    const dailyData = await energyHourly.aggregate([
      {
        $match: {
          timestamp: { $gte: dayStart, $lte: dayEnd }
        }
      },
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

    // Prepare all daily data with time ranges for batch processing
    const dailyDataWithRanges = dailyData
      .filter(doc => typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0)
      .map(doc => {
        const docDayStart = new Date(doc.timestamp);
        docDayStart.setHours(0, 0, 0, 0);
        const docDayEnd = new Date(doc.timestamp);
        docDayEnd.setHours(23, 59, 59, 999);
        return { ...doc, dayStart: docDayStart, dayEnd: docDayEnd };
      });

    let upsertedCount = 0;
    for (const doc of dailyDataWithRanges) {
      try {
        // Get totalEnergyConsumption: prefer last hour of the day from hourly aggregated data
        let totalEnergyConsumption = null;
        
        // Try to get from the last hour of the day (23:00) from hourly aggregated data
        const lastHourOfDay = new Date(doc.timestamp);
        lastHourOfDay.setHours(23, 0, 0, 0);
        
        try {
          const lastHourData = await energyHourly.findOne({
            entityId: doc.entityId,
            timestamp: lastHourOfDay
          }).select('totalEnergyConsumption').lean();
          
          if (lastHourData && lastHourData.totalEnergyConsumption !== undefined && lastHourData.totalEnergyConsumption !== null) {
            totalEnergyConsumption = typeof lastHourData.totalEnergyConsumption === 'number' 
              ? lastHourData.totalEnergyConsumption 
              : parseFloat(lastHourData.totalEnergyConsumption);
            if (isNaN(totalEnergyConsumption)) {
              totalEnergyConsumption = null;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching last hour data for daily aggregation (entity ${doc.entityId}):`, error);
        }
        
        // Fallback: if not found in hourly data, get from raw history
        if (totalEnergyConsumption === null || isNaN(totalEnergyConsumption)) {
          totalEnergyConsumption = await getLastEnergyReading(doc.entityId, doc.dayStart, doc.dayEnd);
        }
        
        if (totalEnergyConsumption !== null && !isNaN(totalEnergyConsumption) && totalEnergyConsumption >= 0) {
          await energyDaily.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              totalEnergyConsumption: totalEnergyConsumption,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping daily data for entity ${doc.entityId}: could not get totalEnergyConsumption for ${doc.timestamp}`);
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

    // Prepare all monthly data with time ranges for batch processing
    const monthlyDataWithRanges = monthlyData
      .filter(doc => typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0)
      .map(doc => {
        const monthStart = new Date(doc.timestamp);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(doc.timestamp);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0); // Last day of the month
        monthEnd.setHours(23, 59, 59, 999);
        return { ...doc, monthStart, monthEnd };
      });

    let upsertedCount = 0;
    for (const doc of monthlyDataWithRanges) {
      try {
        // Get totalEnergyConsumption: prefer last day of the month from daily aggregated data
        let totalEnergyConsumption = null;
        
        // Try to get from the last day of the month from daily aggregated data
        const lastDayOfMonth = new Date(doc.timestamp);
        lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1, 0); // Last day of the month
        lastDayOfMonth.setHours(0, 0, 0, 0);
        
        try {
          const lastDayData = await energyDaily.findOne({
            entityId: doc.entityId,
            timestamp: { $gte: lastDayOfMonth, $lt: new Date(lastDayOfMonth.getTime() + 24 * 60 * 60 * 1000) }
          }).sort({ timestamp: -1 }).select('totalEnergyConsumption').lean();
          
          if (lastDayData && lastDayData.totalEnergyConsumption !== undefined && lastDayData.totalEnergyConsumption !== null) {
            totalEnergyConsumption = typeof lastDayData.totalEnergyConsumption === 'number' 
              ? lastDayData.totalEnergyConsumption 
              : parseFloat(lastDayData.totalEnergyConsumption);
            if (isNaN(totalEnergyConsumption)) {
              totalEnergyConsumption = null;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching last day data for monthly aggregation (entity ${doc.entityId}):`, error);
        }
        
        // Fallback: if not found in daily data, get from raw history
        if (totalEnergyConsumption === null || isNaN(totalEnergyConsumption)) {
          totalEnergyConsumption = await getLastEnergyReading(doc.entityId, doc.monthStart, doc.monthEnd);
        }
        
        if (totalEnergyConsumption !== null && !isNaN(totalEnergyConsumption) && totalEnergyConsumption >= 0) {
          await energyMonthly.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              totalEnergyConsumption: totalEnergyConsumption,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping monthly data for entity ${doc.entityId}: could not get totalEnergyConsumption for ${doc.timestamp}`);
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

    // Prepare all yearly data with time ranges for batch processing
    const yearlyDataWithRanges = yearlyData
      .filter(doc => typeof doc.totalValue === 'number' && !isNaN(doc.totalValue) && doc.totalValue >= 0)
      .map(doc => {
        const yearStart = new Date(doc.timestamp);
        yearStart.setMonth(0, 1); // January 1st
        yearStart.setHours(0, 0, 0, 0);
        const yearEnd = new Date(doc.timestamp);
        yearEnd.setMonth(11, 31); // December 31st
        yearEnd.setHours(23, 59, 59, 999);
        // Ensure it's the last day of December (handle edge cases)
        if (yearEnd.getMonth() !== 11) {
          yearEnd.setFullYear(yearEnd.getFullYear() + 1, 0, 0); // Jan 0 = Dec 31 of previous year
        }
        return { ...doc, yearStart, yearEnd };
      });

    let upsertedCount = 0;
    for (const doc of yearlyDataWithRanges) {
      try {
        // Get totalEnergyConsumption: prefer last month of the year from monthly aggregated data
        let totalEnergyConsumption = null;
        
        // Try to get from December (last month) of the year from monthly aggregated data
        const lastMonthOfYear = new Date(doc.timestamp);
        lastMonthOfYear.setMonth(11, 1); // December 1st
        lastMonthOfYear.setHours(0, 0, 0, 0);
        
        try {
          const lastMonthData = await energyMonthly.findOne({
            entityId: doc.entityId,
            timestamp: lastMonthOfYear
          }).select('totalEnergyConsumption').lean();
          
          if (lastMonthData && lastMonthData.totalEnergyConsumption !== undefined && lastMonthData.totalEnergyConsumption !== null) {
            totalEnergyConsumption = typeof lastMonthData.totalEnergyConsumption === 'number' 
              ? lastMonthData.totalEnergyConsumption 
              : parseFloat(lastMonthData.totalEnergyConsumption);
            if (isNaN(totalEnergyConsumption)) {
              totalEnergyConsumption = null;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching last month data for yearly aggregation (entity ${doc.entityId}):`, error);
        }
        
        // Fallback: if not found in monthly data, get from raw history
        if (totalEnergyConsumption === null || isNaN(totalEnergyConsumption)) {
          totalEnergyConsumption = await getLastEnergyReading(doc.entityId, doc.yearStart, doc.yearEnd);
        }
        
        if (totalEnergyConsumption !== null && !isNaN(totalEnergyConsumption) && totalEnergyConsumption >= 0) {
          await energyYearly.updateOne(
            { entityId: doc.entityId, timestamp: doc.timestamp },
            { $set: { 
              entityId: doc.entityId, 
              totalValue: doc.totalValue,
              totalEnergyConsumption: totalEnergyConsumption,
              timestamp: doc.timestamp
            } },
            { upsert: true }
          );
          upsertedCount++;
        } else {
          console.warn(`⚠️ Skipping yearly data for entity ${doc.entityId}: could not get totalEnergyConsumption for ${doc.timestamp}`);
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
  cron.schedule('1 * * * *', async () => {
    try {
      console.log('🕐 Running Hourly Aggregation');
      await aggregateHourly();
    } catch (error) {
      console.error('❌ Error in hourly aggregation cron job:', error);
    }
  });

  // DAILY: every day at 00:1 AM
  cron.schedule('1 0 * * *', async () => {
    try {
      console.log('📅 Running Daily Aggregation');
      await aggregateDaily();
    } catch (error) {
      console.error('❌ Error in daily aggregation cron job:', error);
    }
  });


  // MONTHLY: every day at 00:20 AM (instead of once a month, this runs daily)
  cron.schedule('20 0 * * *', async () => {
    try {
      console.log('🗓️ Running Monthly Aggregation');
      await aggregateMonthly();
    } catch (error) {
      console.error('❌ Error in monthly aggregation cron job:', error);
    }
  });
  //   cron.schedule('* * * * *', () => {
  //   console.log('🗓️ Running Monthly Aggregation for testing');
  //   aggregateMonthly();
  // });


  // YEARLY: every day at 00:30 AM (instead of just Jan 1st, it runs daily)
  cron.schedule('30 0 * * *', async () => {
    try {
      console.log('📆 Running Yearly Aggregation');
      await aggregateYearly();
    } catch (error) {
      console.error('❌ Error in yearly aggregation cron job:', error);
    }
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