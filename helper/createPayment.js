const PayOS = require("@payos/node");
require("dotenv").config(); // Load environment variables

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

module.exports = { createPayment };
