const express = require("express");
const router = express.Router();
const {saveAutomation,getAutomationDataWithDetails,processAutomations}=require('../controllers/automation.controller');

router.route('/save').post(saveAutomation);
router.route("/get").get(getAutomationDataWithDetails);
router.route("/on").get(processAutomations)

module.exports =router;
