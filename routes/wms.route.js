// const express=require("express");
// const router=express.Router();
// const {getWmsMotors,getWmsMotorsHistory,getWfsPulseCounter}=require("../controllers/wms.controller")
// router.route('/motors').get(getWmsMotors);
// router.route('/wfs/pulse/counter').get(getWfsPulseCounter);
// router.route('/motors/history/detail/:entityId').get(getWmsMotorsHistory);

// module.exports=router;
const express=require("express");
const router=express.Router();
const {getWmsMotors,getWmsMotorsHistory,getWfsPulseCounter,getAllWmsEntities,getMotorTimeSlotsByEntityIdAndDateRange,getMotorHistoryByEntityIdAndDateRange}=require("../controllers/wms.controller")
router.route('/motors').get(getWmsMotors);
router.route('/wfs/pulse/counter').get(getWfsPulseCounter);
router.route('/motors/history/detail/:entityId').get(getWmsMotorsHistory);
router.route('/get-all-wms-entities').get(getAllWmsEntities);
router.get("/motor-time-slots", getMotorTimeSlotsByEntityIdAndDateRange);
router.get("/motor-history-by-date-range", getMotorHistoryByEntityIdAndDateRange);

module.exports=router;