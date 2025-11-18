const express = require("express");
const router = express.Router();
const {
  getAllEntities,
  getEntityHistory,
  getEntityRawHistoryByEntityIdAndDate,
  getEntityRawHistoryByEntityIdAndDateRange
} = require("../controllers/entityHistory.controller");

router.route('/history').get(getAllEntities);
router.route('/history/detail/:entityId').get(getEntityHistory);
router.get("/entity-raw-history-by-date", getEntityRawHistoryByEntityIdAndDate);
router.get("/entity-raw-history-by-date-range", getEntityRawHistoryByEntityIdAndDateRange);

module.exports = router;