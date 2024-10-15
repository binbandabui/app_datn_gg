const express = require("express");
const { OrderItem } = require("../models/order-item");
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const ingrediant = await OrderItem.find();
    if (!ingrediant.length) {
      return res
        .status(404)
        .json({ success: false, message: "No types found" });
    }
    res.status(200).send(ingrediant);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// PUT route to update OrderItem by its ID
router.put("/:id", async (req, res) => {
  try {
    // Find the OrderItem by ID and update its fields
    const updatedOrderItem = await OrderItem.findByIdAndUpdate(
      req.params.id,
      {
        quantity: req.body.quantity,
        excluded: req.body.excluded, // Should be sent as an array
        size: req.body.size || "Medium",
        drink: req.body.drink || "Water",
        product: req.body.product, // Reference to Product ID
      },
      { new: true } // Return the updated document
    );

    if (!updatedOrderItem) {
      return res
        .status(404)
        .json({ success: false, message: "OrderItem not found" });
    }

    res.status(200).json(updatedOrderItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
