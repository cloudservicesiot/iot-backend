const express = require("express");
const router = express.Router();
const {getAllEntities,getEntityHistory,getEntityRawHistoryByEntityIdAndDate}= require("../controllers/entityHistory.controller")

router.route('/history').get(getAllEntities);
router.route('/history/detail/:entityId').get(getEntityHistory);
router.get("/entity-raw-history-by-date", getEntityRawHistoryByEntityIdAndDate);

module.exports = router;