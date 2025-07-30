const express = require("express");
const router = express.Router();
const {getAllEnergyEntities,getEnergyHistory,getEnergyDataByFilter,getEntityWithAllDeviceEntities} = require("../controllers/energyHistory.controller");

router.route('/meters').get(getAllEnergyEntities);
router.route('/meters/detail/:entityId').get(getEnergyHistory);
router.route('/energy-meter-data').get(getEnergyDataByFilter);
router.route('/device-with-entities/:entityId').get(getEntityWithAllDeviceEntities);

module.exports = router;