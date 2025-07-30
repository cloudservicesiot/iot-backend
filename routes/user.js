const express = require("express");
const router = express.Router();

const { login, register, dashboard, getAllUsers } = require("../controllers/user");
const authMiddleware = require('../middleware/auth');
const {saveAcData}=require("../controllers/airConditioner.controller")

router.route("/login").post(login);
router.route("/signup").post(register);
router.route("/dashboard").get(authMiddleware, dashboard);
router.route("/users").get(getAllUsers);



module.exports = router;