const cron = require('node-cron');
const energyRawHistory = require('../models/energyMeterRawHistory.model');
const energyHourly = require('../models/energyMeterModels/energyHourly.model');
const energyDaily = require('../models/energyMeterModels/energyDaily.model');
const energyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const energyYearly = require('../models/energyMeterModels/energyYearly.model');

// HOURLY AGGREGATION
async function aggregateHourly() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const hourlyData = await energyRawHistory.aggregate([
    { $match: { time: { $gte: oneHourAgo, $lt: now } } },
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
        last: { $last: "$value" }
      }
    },
    {
      $project: {
        _id: 0,
        entityId: "$_id.entityId",
        totalValue: {
          $subtract: [
            { $toDouble: "$last" },
            { $toDouble: "$first" }
          ]
        },
        timestamp: {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            hour: "$_id.hour"
          }
        }
      }
    }
  ]);

  for (const doc of hourlyData) {
    await energyHourly.updateOne(
      { entityId: doc.entityId, timestamp: doc.timestamp },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log(`✅ Hourly aggregation complete. Upserted ${hourlyData.length} documents.`);

  // After hourly aggregation, trigger daily aggregation
  await aggregateDaily();  // Trigger daily aggregation immediately
}

// DAILY AGGREGATION
async function aggregateDaily() {
  const dailyData = await energyHourly.aggregate([
    {
      $group: {
        _id: {
          entityId: "$entityId",
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" }
        },
        totalValue: { $sum: "$totalValue" }
      }
    },
    {
      $project: {
        _id: 0,
        entityId: "$_id.entityId",
        totalValue: 1,
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

  for (const doc of dailyData) {
    await energyDaily.updateOne(
      { entityId: doc.entityId, timestamp: doc.timestamp },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log(`✅ Daily aggregation complete. Upserted ${dailyData.length} documents.`);
}

// MONTHLY AGGREGATION (Updated to run more frequently)
async function aggregateMonthly() {
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
        totalValue: 1,
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

  for (const doc of monthlyData) {
    await energyMonthly.updateOne(
      { entityId: doc.entityId, timestamp: doc.timestamp },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log(`✅ Monthly aggregation complete. Upserted ${monthlyData.length} documents.`);
}

// YEARLY AGGREGATION (Updated to run daily)
async function aggregateYearly() {
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
        totalValue: 1,
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

  for (const doc of yearlyData) {
    await energyYearly.updateOne(
      { entityId: doc.entityId, timestamp: doc.timestamp },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log(`✅ Yearly aggregation complete. Upserted ${yearlyData.length} documents.`);
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