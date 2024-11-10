// paymentRouter.js
const express = require("express");
const router = express.Router();
const { createPayment } = require("../helper/createPayment");
const authJwt = require("../helper/jwt");

router.post("/create-payment", createPayment, authJwt);

module.exports = router;
