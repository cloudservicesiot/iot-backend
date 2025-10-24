const express = require("express");
const router = express.Router();
const {getAllEnergyEntities,getEnergyHistory,getEnergyDataByFilter,getEntityWithAllDeviceEntities,getEnergyHistoryByDeviceIdAndDateRange,getDailyEnergyHistoryByDeviceIdAndDateRange,getAllEnergyMetersWithDateRange,getHourlyEnergyDataForDate} = require("../controllers/energyHistory.controller");

router.route('/meters').get(getAllEnergyEntities);
router.route('/meters/detail/:entityId').get(getEnergyHistory);
router.route('/energy-meter-data').get(getEnergyDataByFilter);
router.route('/device-with-entities/:entityId').get(getEntityWithAllDeviceEntities);
router.route('/energy-history').get(getEnergyHistoryByDeviceIdAndDateRange);
router.route('/energy-daily-history').get(getDailyEnergyHistoryByDeviceIdAndDateRange);
router.route('/energy-meters-with-date-range').get(getAllEnergyMetersWithDateRange);
router.route('/hourly-energy-data').get(getHourlyEnergyDataForDate);

module.exports = router;