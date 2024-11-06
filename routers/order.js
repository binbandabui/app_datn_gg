const Order = require("../models/order");
const { OrderItem } = require("../models/order-item"); // Ensure this import is correct
const Attribute = require("../models/attribute");

const Restaurant = require("../models/restaurant");
const express = require("express");
const authJwt = require("../helper/jwt");
const User = require("../models/user");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
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
// router.get(`/`, async (req, res) => {
//   const orderList = await Order.find()
//     .populate("user", "name")
//     .sort({ dateCreated: -1 });
//   if (!orderList) {
//     res.status(404).json({ success: false });
//   }
//   res.send(orderList);
// }); // GET endpoint to retrieve orders based on status
router.get(`/`, async (req, res) => {
  try {
    // Get the status from query parameters
    const { status } = req.query;

    // Filter orders based on the status if provided
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .populate({
        path: "orderItems",
        populate: {
          path: "attribute",
          populate: {
            path: "productId", // Now populate the productId
            model: "Product", // Ensure to specify the model for the population
            select: "name", // Select only the name field from Product
          }, // Populate the attribute field first
        },
      })
      .populate("user", "email name phone")
      .populate("restaurant");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post(`/`, authJwt(), async (req, res) => {
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

        // Log the retrieved attribute for debugging
        console.log("Retrieved Attribute:", attribute);

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
          product: attribute.productId, // Set the product ID from the populated attribute
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
    const totalCost = await Promise.all(
      orderItemIds.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate(
          "attribute"
        );
        const totalCost = orderItem.quantity * orderItem.attribute.defaultPrice; // Use the attribute price
        return totalCost;
      })
    );
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (!restaurant) {
      throw new Error("Invalid Restaurant ID");
    }
    const userId = await User.findById(req.body.userId);
    if (!userId) {
      throw new Error("Invalid Restaurant ID");
    }
    const total = totalPrices.reduce((a, b) => a + b, 0);
    const cost = totalCost.reduce((a, b) => a + b, 0);

    const transactionId = uuidv4();
    // Create and save the new order
    let order = new Order({
      orderItems: orderItemIds,
      shippingAddress: req.body.shippingAddress,
      status: req.body.status,
      paymentMethob: req.body.paymentMethob,
      totalPrice: total,
      totalCost: cost,
      // Use the calculated total price
      user: userId,
      restaurant: restaurant, // Use the restaurant ID from the request body
      transactionId: transactionId,
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
  try {
    // Fetch the order by ID
    const order = await Order.findById(req.params.id)
      .populate("user", "email name phone ") // Populate user with only the name
      .populate({
        path: "orderItems",
        populate: {
          path: "attribute", // Populate the attribute field
          populate: {
            path: "productId", // Populate the productId from the attribute
            populate: "category", // Optionally populate the category from the product
          },
        },
      });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if the order's status matches the provided status

    res.send(order);
  } catch (error) {
    console.error("Error retrieving order:", error); // Log error for debugging
    res.status(500).json({ success: false, message: error.message });
  }
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
router.get("/user/:userId", async (req, res) => {
  try {
    // Get the status from query parameters
    const { status } = req.query;

    // Create a filter object based on the status if provided
    const filter = { user: req.params.userId }; // Always filter by userId
    if (status) {
      filter.status = status; // Add status to filter if provided
    }

    // Find orders with the specified filter and populate relevant fields
    const orders = await Order.find(filter)
      .populate({
        path: "orderItems",
        populate: [
          {
            path: "attribute",
            populate: {
              path: "productId",
              populate: { path: "category" },
            },
          },
        ],
      })
      .populate("user", "email name phone");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found for this user." });
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.status(200).json({ success: true, message: "Order was removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
const getTotalSales = async (req, res) => {
  const { type } = req.query; // Get aggregation type from query parameter
  let groupStage;

  // Define the group stage based on the type
  switch (type) {
    case "day":
      groupStage = {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$dateOrdered" },
        },
        totalSales: { $sum: "$totalPrice" },
        totalCost: { $sum: "$totalCost" },
        profit: { $sum: { $subtract: ["$totalPrice", "$totalCost"] } }, // Calculate profit
      };
      break;

    case "week":
      groupStage = {
        _id: {
          year: { $year: "$dateOrdered" },
          week: { $week: "$dateOrdered" },
        },
        dateToString: {
          $first: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateOrdered" },
          },
        },
        totalSales: { $sum: "$totalPrice" },
        totalCost: { $sum: "$totalCost" },
        profit: { $sum: { $subtract: ["$totalPrice", "$totalCost"] } }, // Calculate profit
      };
      break;

    case "month":
      groupStage = {
        _id: {
          year: { $year: "$dateOrdered" },
          month: { $month: "$dateOrdered" },
        },
        dateToString: {
          $first: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateOrdered" },
          },
        },
        totalSales: { $sum: "$totalPrice" },
        totalCost: { $sum: "$totalCost" },
        profit: { $sum: { $subtract: ["$totalPrice", "$totalCost"] } }, // Calculate profit
      };
      break;

    default:
      return res.status(400).json({
        success: false,
        message: "Invalid type parameter. Use 'day', 'week', or 'month'.",
      });
  }

  try {
    const result = await Order.aggregate([
      {
        $match: {
          status: "Success", // Only include orders with status "Success"
        },
      },
      {
        $group: groupStage, // Use the dynamically defined group stage
      },
      {
        $sort: {
          ...(type === "day" ? { _id: -1 } : { "_id.year": 1, "_id.week": 1 }), // Sort by date in descending order for daily and ascending for weekly/monthly
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No sales data found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error calculating total sales:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Define the route for total sales with a type parameter
router.get("/get/totalsales", getTotalSales);

router.get("/calculate-profit/:orderIds", async (req, res) => {
  try {
    const orderIds = req.params.orderIds.split(","); // Split the IDs into an array

    // Fetch all orders by their IDs
    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    // Calculate profits for each order
    const profits = orders.map((order) => {
      const grossProfit = order.totalPrice - order.totalCost;
      return {
        orderId: order._id,
        totalPrice: order.totalPrice,
        totalCost: order.totalCost,
        profit: grossProfit,
        // netProfit: grossProfit - additionalExpenses // Uncomment if needed
      };
    });

    res.json(profits); // Return an array of profits
  } catch (error) {
    console.error("Error calculating profits:", error);
    res.status(500).json({ message: error.message });
  }
});
// Route to calculate profits for all orders
router.get("/calculate-profit", async (req, res) => {
  try {
    // Fetch all orders from the database
    const orders = await Order.find();
    if (orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }

    // Calculate profits for each order
    const profits = orders.map((order) => {
      const grossProfit = order.totalPrice - order.totalCost;
      return {
        orderId: order._id,
        totalPrice: order.totalPrice,
        totalCost: order.totalCost,
        profit: grossProfit,
        // netProfit: grossProfit - additionalExpenses // Uncomment if needed
      };
    });

    res.json({ success: true, data: profits });
  } catch (error) {
    console.error("Error calculating profits:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
