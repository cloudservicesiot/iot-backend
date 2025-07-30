const express = require("express");
const router = express.Router();

const { AddDevice,getallDevices, getAllDeviceswithEntities,getEntitiesByDeviceId,editDevice,deleteDevice } = require("../controllers/device.controller");
// Add Device 
router.route("/add").post(AddDevice);
// Edit Device
router.route("/edit/:deviceId").put(editDevice);
// Delete Device
router.route("/delete/:deviceId").delete(deleteDevice);
// Get Device
router.route("/getall").get(getallDevices);
// get with entities
router.route("/devicewithentities").get(getAllDeviceswithEntities);
router.route("/get/:id").get(getEntitiesByDeviceId);
module.exports = router;