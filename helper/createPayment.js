// paymentController.js
const { PayOS } = require("@payos/node");

const createPayment = async (req, res) => {
  const { amount, currency, orderId, customer } = req.body;

  // Tạo yêu cầu thanh toán với PayOS
  try {
    const paymentData = {
      amount,
      currency,
      order_id: orderId,
      customer,
      return_url: "your_return_url",
      notify_url: "your_notify_url",
      description: "Payment for order",
    };

    const response = await payos.createPayment(paymentData);
    res.status(200).json(response); // trả về kết quả thanh toán
  } catch (err) {
    res.status(500).json({ message: "Error creating payment", error: err });
  }
};

module.exports = { createPayment };
