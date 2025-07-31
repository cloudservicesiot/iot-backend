const express = require('express');
const router = express.Router();
const {saveAcData, getAllAc,getAcHistory,getAcHistoryByairConditionerIdAndDateRange} = require('../controllers/airConditioner.controller');

router.route("/addnew").post(saveAcData);
router.route("/get/allac").get(getAllAc);
router.get("/air-conditioner-history/:airConditionerId", getAcHistory);
router.get("/air-conditioner-history-byId", getAcHistoryByairConditionerIdAndDateRange);

module.exports = router;