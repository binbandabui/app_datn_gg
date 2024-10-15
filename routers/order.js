const Order = require("../models/order");
const { OrderItem } = require("../models/order-item"); // Ensure this import is correct
const Attribute = require("../models/attribute");
const express = require("express");
const Restaurant = require("../models/restaurant");

const router = express.Router();
//control
// router.get(`/`, async (req, res) => {
//   const orderList = await Order.find()
//     .populate("user", "name")
//     .sort({ dateCreated: -1 });
//   if (!orderList) {
//     res.status(404).json({ success: false });
//   }
//   res.send(orderList);
// });
// router.get(`/:id`, async (req, res) => {
//   const order = await Order.findById(req.params.id)
//     .populate("user", "name")
//     // .populate("orderItems");
//     .populate({
//       path: "orderItems",
//       populate: { path: "product", populate: "category" },
//     });

//   if (!order) {
//     return res.status(404).json({ success: false });
//   }
//   res.send(order);
// });

// router.put("/:id", async (req, res) => {
//   const order = await Order.findByIdAndUpdate(
//     req.params.id,
//     { status: req.body.status },
//     {
//       new: true,
//     }
//   );
//   if (!order) {
//     return res.status(404).json({ success: false, message: "order not found" });
//   }
//   res.status(200).send(order);
// });
// router.delete(`/:id`, async (req, res) => {
//   try {
//     const order = await Order.findByIdAndDelete(req.params.id);

//     if (order) {
//       // Loop through the orderItems and delete each one
//       await Promise.all(
//         order.orderItems.map(async (orderItem) => {
//           await OrderItem.findByIdAndDelete(orderItem);
//         })
//       );

//       return res
//         .status(200)
//         .json({ success: true, message: "Order and associated items deleted" });
//     } else {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found" });
//     }
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// });
// //admin
// router.get("/get/totalsales", async (req, res) => {
//   const totalSales = await Order.aggregate([
//     { $group: { _id: null, totalsales: { $sum: "$totalPrice" } } },
//   ]);
//   if (!totalSales) {
//     return res.status(404).json({ success: false, message: "No sales found" });
//   }
//   res.send({ totalsales: totalSales.pop().totalsales });
// });
// router.get("/get/count", async (req, res) => {
//   try {
//     const orderCount = await Order.countDocuments();
//     if (orderCount === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No products found" });
//     }
//     res.status(200).json({ success: true, orderCount: orderCount });
//   } catch (error) {
//     console.error("Error fetching product count:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });
// // read user order
// router.get(`/get/userorders/:userid`, async (req, res) => {
//   const userorderList = await Order.find({ user: req.params.userid })
//     .populate({
//       path: "orderItems",
//       populate: { path: "product", populate: "category" },
//     })
//     .sort({ dateCreated: -1 });
//   if (!userorderList) {
//     res.status(404).json({ success: false });
//   }
//   res.send(userorderList);
// });
router.get(`/`, async (req, res) => {
  const orderList = await Order.find()
    .populate("user", "name")
    .sort({ dateCreated: -1 });
  if (!orderList) {
    res.status(404).json({ success: false });
  }
  res.send(orderList);
});
router.post(`/`, async (req, res) => {
  try {
    // Log the incoming request body for debugging
    console.log("Request Body:", req.body);

    // Validate the attribute ID and fetch it for each order item
    const orderItemIds = await Promise.all(
      req.body.orderItems.map(async (orderItem) => {
        // Check if the attribute exists and retrieve it
        const attribute = await Attribute.findById(
          orderItem.attribute
        ).populate("productId"); // Populate the productId

        if (!attribute) {
          throw new Error(
            `Invalid Attribute ID for order item: ${orderItem.attribute}`
          );
        }

        // Create a new OrderItem
        let newOrderItem = new OrderItem({
          quantity: orderItem.quantity,
          drink: orderItem.drink,
          excluded: orderItem.excluded,
          attribute: orderItem.attribute, // Use the attribute ID from orderItem
          product: attribute.productId, // Set the product ID from the attribute
        });

        newOrderItem = await newOrderItem.save();
        return newOrderItem._id; // Return the newly created OrderItem ID
      })
    );

    // Calculate total price using the attribute price
    const totalPrices = await Promise.all(
      orderItemIds.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate(
          "attribute"
        );
        const totalPrice = orderItem.quantity * orderItem.attribute.price; // Use the attribute price
        return totalPrice;
      })
    );
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (!restaurant) {
      throw new Error("Invalid Restaurant ID");
    }
    const total = totalPrices.reduce((a, b) => a + b, 0);

    // Create and save the new order
    let order = new Order({
      orderItems: orderItemIds,
      shippingAddress1: req.body.shippingAddress1,
      status: req.body.status,
      totalPrice: total, // Use the calculated total price
      user: req.body.user,
      restaurant: restaurant, // Use the restaurant ID from the request body
      transactionId: req.body.transactionId,
    });

    order = await order.save();

    // Check if the order was successfully saved
    if (!order) return res.status(404).json("Order not found");

    res.send(order);
  } catch (error) {
    console.error("Error creating order:", error); // Log error for debugging
    res.status(500).json({ message: error.message });
  }
});
router.get(`/:id`, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: { path: "product", populate: "category" },
    });
  if (!order) {
    return res.status(404).json({ success: false });
  }
  res.send(order);
});
router.put("/:id", async (req, res) => {
  const { status } = req.body; // Destructure the status from the request body

  // Validate that the status is provided and is a string
  if (typeof status !== "string" || !status.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status provided." });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: status }, // Use the validated status
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators on the updated document
      }
    );

    // Check if the order was found and updated
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res.status(200).send(order);
  } catch (error) {
    console.error("Error updating order status:", error); // Log error for debugging
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
