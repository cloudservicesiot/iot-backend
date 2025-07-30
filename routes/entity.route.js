const express = require('express');
const router = express.Router();
const { AddEntity, getAllEntities, getAllEntitieswithDevices, updateEntityState,getEntitiesByDeviceId , getEntityById,
    updateEntity,
    deleteEntity} = require('../controllers/entity.controller');

// Define routes
router.route('/add').post(AddEntity);
router.route('/get').get(getAllEntities);
router.route('/getByEntityId/:entityId').get(getEntityById);
router.route('/update/:entityId').put(updateEntity);
router.route('/delete/:id').delete(deleteEntity);
router.route('/getentities').get(getAllEntitieswithDevices);
router.route('/state').post(updateEntityState);
router.route('/getbydeviceId/:deviceId').get(getEntitiesByDeviceId);
module.exports = router;
