const PayOS = require("@payos/node");
require("dotenv").config(); // Load environment variables
const crypto = require("crypto");
// Initialize PayOS with credentials from .env file
const payos = new PayOS(
  process.env.CLIENT_ID,
  process.env.API_KEY,
  process.env.CHECKSUM_KEY,
  process.env.PARTNER_CODE
);

const createPayment = async (req, res) => {
  const { amount, orderCode, customer, returnUrl, cancelUrl } = req.body;

  try {
    const paymentData = {
      amount,
      orderCode, // Order code must be provided
      returnUrl, // Return URL for successful payment
      cancelUrl, // Cancel URL if the payment is canceled
      description: "Payment for order",
      customer,
    };

    const response = await payos.createPaymentLink(paymentData);
    res.status(200).json(response); // Send response back to client
  } catch (err) {
    console.error("Error creating payment:", err);
    res
      .status(500)
      .json({ message: "Error creating payment", error: err.message });
  }
};
const getPaymentInfo = async (req, res) => {
  const { id } = req.params; // Extract ID from the URL parameters

  try {
    // Make a request to the PayOS API to get the payment link info
    const response = await payos.getPaymentLinkInformation(id);
    res.status(200).json(response);
    console.log(response);
  } catch (err) {
    console.error("Error retrieving payment info:", err);
    res
      .status(500)
      .json({ message: "Error retrieving payment info", error: err.message });
  }
};
const cancelPayment = async (req, res) => {
  const { id } = req.params; // Extract ID from the URL parameters

  try {
    // Make a request to the PayOS API to get the payment link info
    const response = await payos.cancelPaymentLink(id);
    res.status(200).json(response);
    console.log(response);
  } catch (err) {
    console.error("Error cancel payment info:", err);
    res
      .status(500)
      .json({ message: "Error cancel payment", error: err.message });
  }
};

const verifySignature = (webhookBody, signature) => {
  const hmac = crypto.createHmac("sha256", process.env.PARTNER_CODE); // Use your partner key or API key
  const data = JSON.stringify(webhookBody);
  hmac.update(data);
  const computedSignature = hmac.digest("hex");
  return computedSignature === signature;
};
const verifyWebhookData = async (req, res) => {
  const webhookBody = req.body;
  const signature = req.headers["x-signature"]; // Adjust the header name if necessary

  console.log("Received webhook data:", webhookBody);
  console.log("Received signature:", signature);

  try {
    // Verify the webhook signature first
    const isValidSignature = verifySignature(webhookBody, signature);

    if (!isValidSignature) {
      return res.status(400).json({
        message: "Invalid signature",
      });
    }

    // Now verify the payment data
    const paymentData = payos.verifyPaymentWebhookData(webhookBody);

    if (paymentData) {
      // If payment data is valid, return the payment data
      res.status(200).json({
        message: "Webhook data verified successfully",
        paymentData,
      });
    } else {
      // If payment data is invalid, respond with an error
      res.status(400).json({
        message: "Invalid webhook data",
      });
    }
  } catch (err) {
    console.error("Error verifying webhook data:", err);
    res.status(500).json({
      message: "Error verifying webhook data",
      error: err.message,
    });
  }
};
module.exports = {
  createPayment,
  getPaymentInfo,
  cancelPayment,
  verifyWebhookData,
};
