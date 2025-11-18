require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/connect');
const energyRawHistory = require('../models/energyMeterRawHistory.model');
const energyHourly = require('../models/energyMeterModels/energyHourly.model');
const energyDaily = require('../models/energyMeterModels/energyDaily.model');
const energyMonthly = require('../models/energyMeterModels/energyMonthly.model');
const energyYearly = require('../models/energyMeterModels/energyYearly.model');

// Test Results Storage
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to log test results
function logTest(testName, passed, message, details = {}) {
  const result = {
    test: testName,
    status: passed ? '✅ PASS' : '❌ FAIL',
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (passed) {
    testResults.passed.push(result);
    console.log(`✅ ${testName}: ${message}`);
  } else {
    testResults.failed.push(result);
    console.error(`❌ ${testName}: ${message}`);
    if (Object.keys(details).length > 0) {
      console.error('   Details:', JSON.stringify(details, null, 2));
    }
  }
}

function logWarning(testName, message, details = {}) {
  const result = {
    test: testName,
    status: '⚠️ WARNING',
    message,
    details,
    timestamp: new Date().toISOString()
  };
  testResults.warnings.push(result);
  console.warn(`⚠️ ${testName}: ${message}`);
}

// Test 1: Verify Hourly Calculations
async function testHourlyCalculations() {
  console.log('\n📊 Testing Hourly Calculations...\n');
  
  try {
    // Get a sample of hourly data
    const hourlySamples = await energyHourly.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    if (hourlySamples.length === 0) {
      logWarning('Hourly Calculations', 'No hourly data found to test');
      return;
    }
    
    for (const hourly of hourlySamples) {
      const entityId = hourly.entityId;
      const timestamp = hourly.timestamp;
      
      // Get previous hour
      const previousHourTimestamp = new Date(timestamp.getTime() - 60 * 60 * 1000);
      const previousHour = await energyHourly.findOne({
        entityId: entityId,
        timestamp: previousHourTimestamp
      }).lean();
      
      // Get raw data for this hour
      const hourStart = new Date(timestamp);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const rawData = await energyRawHistory.find({
        entityId: entityId,
        time: { $gte: hourStart, $lt: hourEnd }
      }).sort({ time: 1 }).lean();
      
      if (rawData.length === 0) {
        logWarning('Hourly Calculations', `No raw data for hour ${timestamp.toISOString()}`);
        continue;
      }
      
      const firstReading = typeof rawData[0].value === 'number' 
        ? rawData[0].value 
        : parseFloat(rawData[0].value);
      const lastReading = typeof rawData[rawData.length - 1].value === 'number'
        ? rawData[rawData.length - 1].value
        : parseFloat(rawData[rawData.length - 1].value);
      
      // Verify totalEnergyConsumption = last reading
      const expectedTotalEnergyConsumption = lastReading;
      const actualTotalEnergyConsumption = hourly.totalEnergyConsumption;
      
      if (Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption) > 0.01) {
        logTest(
          'Hourly totalEnergyConsumption',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalEnergyConsumption,
            actual: actualTotalEnergyConsumption,
            difference: Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption)
          }
        );
      } else {
        logTest(
          'Hourly totalEnergyConsumption',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()}`
        );
      }
      
      // Verify totalValue calculation
      let expectedTotalValue;
      if (previousHour && previousHour.totalEnergyConsumption !== null) {
        expectedTotalValue = lastReading - previousHour.totalEnergyConsumption;
      } else {
        expectedTotalValue = lastReading - firstReading;
      }
      
      // Handle meter reset
      if (expectedTotalValue < 0) {
        expectedTotalValue = lastReading;
      }
      
      const actualTotalValue = hourly.totalValue;
      const difference = Math.abs(actualTotalValue - expectedTotalValue);
      
      // Allow small floating point differences
      if (difference > 0.1) {
        logTest(
          'Hourly totalValue',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalValue,
            actual: actualTotalValue,
            difference: difference,
            previousHourLast: previousHour ? previousHour.totalEnergyConsumption : null,
            firstReading,
            lastReading
          }
        );
      } else {
        logTest(
          'Hourly totalValue',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()} (${actualTotalValue.toFixed(2)} kWh)`
        );
      }
    }
  } catch (error) {
    logTest('Hourly Calculations', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Test 2: Verify Daily Calculations
async function testDailyCalculations() {
  console.log('\n📅 Testing Daily Calculations...\n');
  
  try {
    const dailySamples = await energyDaily.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    if (dailySamples.length === 0) {
      logWarning('Daily Calculations', 'No daily data found to test');
      return;
    }
    
    for (const daily of dailySamples) {
      const entityId = daily.entityId;
      const timestamp = daily.timestamp;
      
      // Get all hourly data for this day
      const dayStart = new Date(timestamp);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(timestamp);
      dayEnd.setHours(23, 59, 59, 999);
      
      const hourlyData = await energyHourly.find({
        entityId: entityId,
        timestamp: { $gte: dayStart, $lte: dayEnd }
      }).sort({ timestamp: 1 }).lean();
      
      if (hourlyData.length === 0) {
        logWarning('Daily Calculations', `No hourly data for day ${timestamp.toISOString()}`);
        continue;
      }
      
      // Verify totalValue = sum of hourly totalValues
      const expectedTotalValue = hourlyData.reduce((sum, h) => sum + (h.totalValue || 0), 0);
      const actualTotalValue = daily.totalValue;
      const difference = Math.abs(actualTotalValue - expectedTotalValue);
      
      if (difference > 0.1) {
        logTest(
          'Daily totalValue',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalValue,
            actual: actualTotalValue,
            difference: difference,
            hourlyCount: hourlyData.length
          }
        );
      } else {
        logTest(
          'Daily totalValue',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()} (${actualTotalValue.toFixed(2)} kWh)`
        );
      }
      
      // Verify totalEnergyConsumption = last hour's totalEnergyConsumption
      const lastHour = hourlyData[hourlyData.length - 1];
      const expectedTotalEnergyConsumption = lastHour.totalEnergyConsumption;
      const actualTotalEnergyConsumption = daily.totalEnergyConsumption;
      
      if (Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption) > 0.01) {
        logTest(
          'Daily totalEnergyConsumption',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalEnergyConsumption,
            actual: actualTotalEnergyConsumption,
            difference: Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption),
            lastHourTimestamp: lastHour.timestamp
          }
        );
      } else {
        logTest(
          'Daily totalEnergyConsumption',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()}`
        );
      }
    }
  } catch (error) {
    logTest('Daily Calculations', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Test 3: Verify Monthly Calculations
async function testMonthlyCalculations() {
  console.log('\n🗓️ Testing Monthly Calculations...\n');
  
  try {
    const monthlySamples = await energyMonthly.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    if (monthlySamples.length === 0) {
      logWarning('Monthly Calculations', 'No monthly data found to test');
      return;
    }
    
    for (const monthly of monthlySamples) {
      const entityId = monthly.entityId;
      const timestamp = monthly.timestamp;
      
      // Get all daily data for this month
      const monthStart = new Date(timestamp);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(timestamp);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const dailyData = await energyDaily.find({
        entityId: entityId,
        timestamp: { $gte: monthStart, $lte: monthEnd }
      }).sort({ timestamp: 1 }).lean();
      
      if (dailyData.length === 0) {
        logWarning('Monthly Calculations', `No daily data for month ${timestamp.toISOString()}`);
        continue;
      }
      
      // Verify totalValue = sum of daily totalValues
      const expectedTotalValue = dailyData.reduce((sum, d) => sum + (d.totalValue || 0), 0);
      const actualTotalValue = monthly.totalValue;
      const difference = Math.abs(actualTotalValue - expectedTotalValue);
      
      if (difference > 0.1) {
        logTest(
          'Monthly totalValue',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalValue,
            actual: actualTotalValue,
            difference: difference,
            dailyCount: dailyData.length
          }
        );
      } else {
        logTest(
          'Monthly totalValue',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()} (${actualTotalValue.toFixed(2)} kWh)`
        );
      }
      
      // Verify totalEnergyConsumption = last day's totalEnergyConsumption
      const lastDay = dailyData[dailyData.length - 1];
      const expectedTotalEnergyConsumption = lastDay.totalEnergyConsumption;
      const actualTotalEnergyConsumption = monthly.totalEnergyConsumption;
      
      if (Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption) > 0.01) {
        logTest(
          'Monthly totalEnergyConsumption',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalEnergyConsumption,
            actual: actualTotalEnergyConsumption,
            difference: Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption)
          }
        );
      } else {
        logTest(
          'Monthly totalEnergyConsumption',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()}`
        );
      }
    }
  } catch (error) {
    logTest('Monthly Calculations', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Test 4: Verify Yearly Calculations
async function testYearlyCalculations() {
  console.log('\n📆 Testing Yearly Calculations...\n');
  
  try {
    const yearlySamples = await energyYearly.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    if (yearlySamples.length === 0) {
      logWarning('Yearly Calculations', 'No yearly data found to test');
      return;
    }
    
    for (const yearly of yearlySamples) {
      const entityId = yearly.entityId;
      const timestamp = yearly.timestamp;
      
      // Get all monthly data for this year
      const yearStart = new Date(timestamp);
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date(timestamp);
      yearEnd.setMonth(11, 31);
      yearEnd.setHours(23, 59, 59, 999);
      
      const monthlyData = await energyMonthly.find({
        entityId: entityId,
        timestamp: { $gte: yearStart, $lte: yearEnd }
      }).sort({ timestamp: 1 }).lean();
      
      if (monthlyData.length === 0) {
        logWarning('Yearly Calculations', `No monthly data for year ${timestamp.toISOString()}`);
        continue;
      }
      
      // Verify totalValue = sum of monthly totalValues
      const expectedTotalValue = monthlyData.reduce((sum, m) => sum + (m.totalValue || 0), 0);
      const actualTotalValue = yearly.totalValue;
      const difference = Math.abs(actualTotalValue - expectedTotalValue);
      
      if (difference > 0.1) {
        logTest(
          'Yearly totalValue',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalValue,
            actual: actualTotalValue,
            difference: difference,
            monthlyCount: monthlyData.length
          }
        );
      } else {
        logTest(
          'Yearly totalValue',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()} (${actualTotalValue.toFixed(2)} kWh)`
        );
      }
      
      // Verify totalEnergyConsumption = last month's totalEnergyConsumption
      const lastMonth = monthlyData[monthlyData.length - 1];
      const expectedTotalEnergyConsumption = lastMonth.totalEnergyConsumption;
      const actualTotalEnergyConsumption = yearly.totalEnergyConsumption;
      
      if (Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption) > 0.01) {
        logTest(
          'Yearly totalEnergyConsumption',
          false,
          `Mismatch for entity ${entityId} at ${timestamp.toISOString()}`,
          {
            expected: expectedTotalEnergyConsumption,
            actual: actualTotalEnergyConsumption,
            difference: Math.abs(actualTotalEnergyConsumption - expectedTotalEnergyConsumption)
          }
        );
      } else {
        logTest(
          'Yearly totalEnergyConsumption',
          true,
          `Correct for entity ${entityId} at ${timestamp.toISOString()}`
        );
      }
    }
  } catch (error) {
    logTest('Yearly Calculations', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Test 5: Verify Data Consistency
async function testDataConsistency() {
  console.log('\n🔍 Testing Data Consistency...\n');
  
  try {
    // Check for negative values
    const negativeHourly = await energyHourly.countDocuments({ totalValue: { $lt: 0 } });
    const negativeDaily = await energyDaily.countDocuments({ totalValue: { $lt: 0 } });
    const negativeMonthly = await energyMonthly.countDocuments({ totalValue: { $lt: 0 } });
    const negativeYearly = await energyYearly.countDocuments({ totalValue: { $lt: 0 } });
    
    if (negativeHourly > 0) {
      logTest('Data Consistency', false, `Found ${negativeHourly} hourly records with negative totalValue`);
    }
    if (negativeDaily > 0) {
      logTest('Data Consistency', false, `Found ${negativeDaily} daily records with negative totalValue`);
    }
    if (negativeMonthly > 0) {
      logTest('Data Consistency', false, `Found ${negativeMonthly} monthly records with negative totalValue`);
    }
    if (negativeYearly > 0) {
      logTest('Data Consistency', false, `Found ${negativeYearly} yearly records with negative totalValue`);
    }
    
    if (negativeHourly === 0 && negativeDaily === 0 && negativeMonthly === 0 && negativeYearly === 0) {
      logTest('Data Consistency', true, 'No negative totalValue found');
    }
    
    // Check for null or invalid totalEnergyConsumption
    const nullHourly = await energyHourly.countDocuments({ 
      $or: [
        { totalEnergyConsumption: null },
        { totalEnergyConsumption: { $exists: false } }
      ]
    });
    
    if (nullHourly > 0) {
      logWarning('Data Consistency', `Found ${nullHourly} hourly records with null totalEnergyConsumption`);
    }
    
  } catch (error) {
    logTest('Data Consistency', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Test 6: Verify Calculation Logic for Specific Scenarios
async function testSpecificScenarios() {
  console.log('\n🧪 Testing Specific Scenarios...\n');
  
  try {
    // Scenario 1: Check consecutive hours have correct differences
    const consecutiveHours = await energyHourly.find({})
      .sort({ timestamp: 1 })
      .limit(20)
      .lean();
    
    for (let i = 1; i < consecutiveHours.length; i++) {
      const current = consecutiveHours[i];
      const previous = consecutiveHours[i - 1];
      
      if (current.entityId.toString() === previous.entityId.toString()) {
        const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime();
        const expectedDiff = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (Math.abs(timeDiff - expectedDiff) < 60000) { // Within 1 minute tolerance
          // Check if totalEnergyConsumption is increasing (or reset occurred)
          if (current.totalEnergyConsumption < previous.totalEnergyConsumption) {
            logWarning(
              'Consecutive Hours',
              `Meter reading decreased from ${previous.totalEnergyConsumption} to ${current.totalEnergyConsumption} (possible reset)`,
              {
                entityId: current.entityId,
                previousTimestamp: previous.timestamp,
                currentTimestamp: current.timestamp
              }
            );
          }
        }
      }
    }
    
    logTest('Consecutive Hours', true, 'Checked consecutive hour relationships');
    
  } catch (error) {
    logTest('Specific Scenarios', false, `Error: ${error.message}`, { error: error.stack });
  }
}

// Generate Summary Report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENERGY CALCULATION TEST REPORT');
  console.log('='.repeat(80));
  console.log(`\n✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log(`\nTotal Tests: ${testResults.passed.length + testResults.failed.length + testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('-'.repeat(80));
    testResults.failed.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.message}`);
      if (Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    console.log('-'.repeat(80));
    testResults.warnings.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log(`   Message: ${result.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Return exit code
  return testResults.failed.length === 0 ? 0 : 1;
}

// Main Test Runner
async function runAllTests() {
  console.log('🚀 Starting Energy Calculation Tests...\n');
  console.log('='.repeat(80));
  
  try {
    // Connect to database
    const mongodb_Url = process.env.MONGO_URI;
    await connectDB(mongodb_Url);
    console.log('✅ Connected to database\n');
    
    // Run all tests
    await testHourlyCalculations();
    await testDailyCalculations();
    await testMonthlyCalculations();
    await testYearlyCalculations();
    await testDataConsistency();
    await testSpecificScenarios();
    
    // Generate report
    const exitCode = generateReport();
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testHourlyCalculations,
  testDailyCalculations,
  testMonthlyCalculations,
  testYearlyCalculations,
  testDataConsistency,
  testSpecificScenarios
};

