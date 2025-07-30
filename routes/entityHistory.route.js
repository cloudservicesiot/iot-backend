const express = require("express");
const router = express.Router();
const {getAllEntities,getEntityHistory}= require("../controllers/entityHistory.controller")

router.route('/history').get(getAllEntities);
router.route('/history/detail/:entityId').get(getEntityHistory);

module.exports = router;
