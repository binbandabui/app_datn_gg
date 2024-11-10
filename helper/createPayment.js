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
  const { amount, currency, orderId, customer } = req.body;

  try {
    const paymentData = {
      amount,
      currency,
      order_id: orderId,
      customer,
      return_url: "your_return_url", // Replace with your actual return URL
      notify_url: "your_notify_url", // Replace with your actual notify URL
      description: "Payment for order",
    };

    const response = await payos.createPayment(paymentData);
    res.status(200).json(response); // Send response back to client
  } catch (err) {
    console.error("Error creating payment:", err);
    res
      .status(500)
      .json({ message: "Error creating payment", error: err.message });
  }
};

module.exports = { createPayment };
