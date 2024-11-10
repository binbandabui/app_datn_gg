// paymentRouter.js
const express = require("express");
const router = express.Router();
const {
  createPayment,
  getPaymentInfo,
  cancelPayment,
} = require("../helper/paymentController");
const { createHmac } = require("crypto");
const authJwt = require("../helper/jwt");

router.post("/create-payment", createPayment, authJwt);
router.get("/payment-info/:id", getPaymentInfo, authJwt); // New route for getting payment info
router.post("/payment-cancel/:id", cancelPayment, authJwt); // New route for getting payment info
const checksumKey = process.env.CHECKSUM_KEY;
// Function to sort object keys
function sortObjDataByKey(object) {
  return Object.keys(object)
    .sort()
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

// Convert object data to query string format
function convertObjToQueryStr(object) {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];
      // Sort nested object arrays
      if (value && Array.isArray(value)) {
        value = JSON.stringify(value.map((val) => sortObjDataByKey(val)));
      }
      // Set empty string if value is null or undefined
      if ([null, undefined, "undefined", "null"].includes(value)) {
        value = "";
      }
      return `${key}=${value}`;
    })
    .join("&");
}

// Function to validate the webhook data by comparing signatures
// Function to validate the webhook data by comparing signatures
function isValidData(data, currentSignature) {
  const sortedDataByKey = sortObjDataByKey(data);
  const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
  // Replace with your actual checksum key
  console.log("Data to be signed:", dataQueryStr); // Log the query string

  // Calculate the expected signature
  const dataToSignature = createHmac("sha256", checksumKey)
    .update(dataQueryStr)
    .digest("hex");

  console.log("Calculated signature:", dataToSignature); // Log the generated signature
  console.log("Received signature:", currentSignature); // Log the received signature

  // Return true if the generated signature matches the received signature
  return dataToSignature === currentSignature;
}

// Webhook route to handle PayOS webhook
router.post("/webhook", (req, res) => {
  const webhookData = req.body; // Data received in the request body
  const { data, signature } = webhookData;
  if (!data || !signature) {
    return res
      .status(400)
      .json({ message: "Missing webhook data or signature" });
  }

  const isValid = isValidData(data, signature);

  if (isValid) {
    console.log("Webhook signature is valid!");
    // Proceed with your business logic (e.g., update payment status)
    return res
      .status(200)
      .json({ message: "Webhook received and verified successfully" });
  } else {
    console.log("Invalid webhook signature!");
    return res.status(400).json({ message: "Invalid webhook signature" });
  }
});

module.exports = router;
