// const express=require("express");
// const router=express.Router();
// const {getWmsMotors,getWmsMotorsHistory,getWfsPulseCounter}=require("../controllers/wms.controller")
// router.route('/motors').get(getWmsMotors);
// router.route('/wfs/pulse/counter').get(getWfsPulseCounter);
// router.route('/motors/history/detail/:entityId').get(getWmsMotorsHistory);

// module.exports=router;
const express=require("express");
const router=express.Router();
const {getWmsMotors,getWmsMotorsHistory,getWfsPulseCounter,getAllWmsEntities}=require("../controllers/wms.controller")
router.route('/motors').get(getWmsMotors);
router.route('/wfs/pulse/counter').get(getWfsPulseCounter);
router.route('/motors/history/detail/:entityId').get(getWmsMotorsHistory);
router.route('/get-all-wms-entities').get(getAllWmsEntities);

module.exports=router;