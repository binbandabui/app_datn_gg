const axios = require("axios");
const crypto = require("crypto");

const createPayment = async (req, res) => {
  const {
    amount,
    orderCode,
    description,
    cancelUrl,
    returnUrl,
    items,
    expiredAt,
  } = req.body;

  const partnerCode = process.env.PARTNER_CODE; // PayOS Partner Code
  const apiKeyPay = process.env.API_KEY; // API Key
  const checksumKeyPay = process.env.CHECKSUM_KEY; // Checksum Key

  // Buyer Information (Optional)
  const { buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;

  // Payload to send to PayOS
  const payload = {
    partnerCode, // Your partner code from PayOS
    orderCode,
    amount,
    description,
    cancelUrl,
    returnUrl,
    expiredAt,
    items,
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerAddress,
  };

  // Create checksum signature
  const signatureString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  const signature = crypto
    .createHmac("sha256", checksumKeyPay)
    .update(signatureString)
    .digest("hex");

  payload.signature = signature;

  // Set headers
  const headers = {
    "x-client-idx-api-key": apiKeyPay,
    "x-partner-code": partnerCode,
  };

  try {
    // Send POST request to PayOS API to create the payment link
    const response = await axios.post(
      "https://api-merchant.payos.vn/v2/payment-requests", // Correct API endpoint for creating payment link
      payload,
      { headers }
    );

    res.json(response.data); // Assuming PayOS returns the payment link or success response
  } catch (error) {
    console.error(
      "Error creating payment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Payment creation failed",
      details: error.response ? error.response.data : error.message,
    });
  }
};

module.exports = { createPayment };
