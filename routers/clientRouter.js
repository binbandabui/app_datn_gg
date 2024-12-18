const expressJwt = require("express-jwt");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Order = require("../models/order");
const { OrderItem } = require("../models/order-item"); // Ensure this import is correct
const Attribute = require("../models/attribute");
const authJwt = require("../helper/jwt");

const Restaurant = require("../models/restaurant");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // Import crypto for generating OTPs

// // Mapping of file types for upload validation
// const FILE_TYPES_MAP = {
//   "image/png": "png",
//   "image/jpeg": "jpeg",
//   "image/jpg": "jpg",
// };

// // Multer storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const isValid = FILE_TYPES_MAP[file.mimetype];
//     let uploadError = new Error("Invalid image type");
//     if (isValid) {
//       uploadError = null;
//     }
//     cb(uploadError, "public/uploads");
//   },
//   filename: function (req, file, cb) {
//     const fileName = file.originalname.split(" ").join("-");
//     const extension = FILE_TYPES_MAP[file.mimetype];
//     cb(null, `${fileName}-${Date.now()}.${extension}`);
//   },
// });

// const uploadOptions = multer({
//   limits: { fileSize: 1024 * 1024 * 5 },
//   storage: storage,
// });
// ////////////////////////////////
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const router = express.Router();
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user", // Specify the folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"], // Allowed formats
  },
});

const uploadOptions = multer({ storage: storage });
router.get("/privacy-policy", (req, res) => {
  const filePath = __dirname + "/public/privacy-policy.html";
  console.log("Serving Privacy Policy from:", filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving file:", err);
      return res.status(500).send("Internal Server Error");
    }
  });
});
router.get("/terms-of-service", (req, res) => {
  const filePath = __dirname + "/public/terms-of-service.html";
  console.log("Serving Privacy Policy from:", filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving file:", err);
      return res.status(500).send("Internal Server Error");
    }
  });
});
// Google OAuth callback endpoint

router.get(`/:id`, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false });
  }
  res.status(200).json(user);
});
router.post("/", async (req, res) => {
  try {
    const { password } = req.body;

    // Regular expression to validate the password

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      passwordHash: bcrypt.hashSync(password, 10),
      phone: req.body.phone,
      isAdmin: req.body.isAdmin,
      paymentInfo: req.body.paymentInfo,
    });

    const savedUser = await user.save();
    res.send(savedUser);
  } catch (error) {
    res.status(400).send("User not created: " + error.message);
  }
});
// Signup user
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const secret = process.env.secret;
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "User not verified" });
    }
    if (!user.isActive) {
      return res.status(400).json({ message: "User not active" });
    }
    if (bcrypt.compareSync(req.body.password, user.passwordHash)) {
      const token = jwt.sign(
        {
          userId: user.id,
          isAdmin: user.isAdmin,
        },
        secret,
        { expiresIn: "1d" }
      );
      res.status(200).send({ user: user.email, token: token, userId: user.id });
    } else {
      res.status(400).json({ message: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Signin user
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      isAdmin,
      image,
      paymentInfo,
      gender,
    } = req.body;

    // Input validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{9,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/; // Adjust according to your region

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 9 characters long, and contain at least one uppercase and one lowercase letter.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const otpExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    // Create the new user but set verified status to false
    const user = new User({
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      phone,
      gender,
      isAdmin: isAdmin || false, // Default to false if not provided
      image: image || "", // Default to empty string if not provided
      paymentInfo: paymentInfo || "", // Default to empty string
      isVerified: false, // Verification status
      otp,
      otpExpiration,
    });

    // // Generate a verification token
    // const verificationToken = crypto.randomBytes(32).toString("hex");
    // user.verificationToken = verificationToken; // Store token in the user model
    // user.tokenExpiration = Date.now() + 3600000; // Token expires in 1 hour

    // Save the user to the database
    const savedUser = await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for registration",
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: "Error sending OTP email" });
      }
      res.status(200).json({ message: "OTP sent to your email", email });
    });
  } catch (error) {
    console.error("Registration error: ", error);
    res
      .status(500)
      .json({ message: "User registration failed: " + error.message });
  }
});
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    // Validate input
    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ message: "Missing email, OTP, or password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if OTP is correct and not expired
    if (user.otp !== otp || Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // After OTP is verified, complete the registration (set verified to true)
    user.isVerified = true;
    user.otp = null;
    user.otpExpiration = null;

    // Hash the password and save the user
    user.passwordHash = bcrypt.hashSync(password, 10);

    await user.save();

    res
      .status(200)
      .json({ message: "OTP verified, user registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP: " + error.message });
  }
});

// Count user
router.get("/get/count", async (req, res) => {
  try {
    // Count users where isActive is true
    const userCount = await User.countDocuments({ isVerified: true });
    res.send({ userCount: userCount });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// Delete user
router.delete(`/:id`, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) {
      return res
        .status(200)
        .json({ success: true, message: "User was removed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user
router.put(
  `/edituser/:id`,
  authJwt(),
  uploadOptions.single("image"),
  async (req, res) => {
    try {
      const currentProduct = await User.findById(req.params.id);
      if (!currentProduct) {
        return res.status(404).send("User not found");
      }

      const file = req.file;
      const imageUrl = file ? file.path : currentProduct.image; // Use the new file path if available, otherwise keep the original image

      // Determine the updated contact array
      let updatedContact;
      if (
        req.body.contact &&
        typeof req.body.contact === "object" &&
        !Array.isArray(req.body.contact)
      ) {
        updatedContact = Object.values(req.body.contact); // Convert object values to array
      } else if (
        Array.isArray(req.body.contact) &&
        req.body.contact.length > 0
      ) {
        updatedContact = req.body.contact; // Use array directly if provided and not empty
      } else {
        updatedContact = currentProduct.contact; // Keep existing contact if not provided or empty
      }

      // Update the user
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name || currentProduct.name,
          phone: req.body.phone || currentProduct.phone,
          email: req.body.email || currentProduct.email,
          paymentInfo: req.body.paymentInfo || currentProduct.paymentInfo,
          image: imageUrl,
          isAdmin:
            req.body.isAdmin !== undefined
              ? req.body.isAdmin
              : currentProduct.isAdmin,
          isVerified:
            req.body.isVerified !== undefined
              ? req.body.isVerified
              : currentProduct.isVerified,
          isActive:
            req.body.isActive !== undefined
              ? req.body.isActive
              : currentProduct.isActive,
          contact: updatedContact, // Use the updated or existing contact array here
          cart: Array.isArray(req.body.cart)
            ? req.body.cart
            : currentProduct.cart, // Ensure cart is an array
        },
        { new: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user: ", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.post(
  `/userCart/:id`, // Using POST to update the user's cart

  authJwt(),
  async (req, res) => {
    // Validate ObjectId
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User ID" });
    }

    try {
      // Find the user by ID
      let user = await User.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Ensure cart is an array and merge with existing cart
      const incomingCart = Array.isArray(req.body.cart) ? req.body.cart : [];
      user.cart = [...user.cart, ...incomingCart]; // Append new items to existing cart

      await user.save(); // Save the updated user object

      // Send the updated user as a response
      res.status(200).json({
        success: true,
        message: "User cart updated successfully",
        user,
      });
    } catch (error) {
      console.error("Error updating user: ", error); // Log error for debugging
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
);

router.post("/change-password", authJwt(), async (req, res) => {
  try {
    const { currentPassword, newPassword, userId } = req.body;

    // Input validation (you can expand this as needed)
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required." });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the current password matches
    const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash); // Assuming passwordHash holds the hashed password
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Hash the new password before saving
    user.passwordHash = bcrypt.hashSync(newPassword, 10); // Use 10 as the salt rounds (you can adjust this as needed)
    await user.save(); // Save the updated user

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "An error occurred." });
  }
});

// Endpoint to request password reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate a random OTP
    const otp = crypto.randomInt(100000, 999999).toString(); // Generates a 6-digit OTP

    // Store the OTP in the user's document (make sure to create a field for this)
    user.otp = otp;
    await user.save();

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or another service (e.g., 'SendGrid', 'Mailgun')
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is: ${otp}`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
        return res.status(500).json({ message: "Error sending email" });
      }
      res.status(200).json({ message: "OTP has been sent to your email" });
    });
  } catch (error) {
    console.error("Error in forgot password: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Input validation
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    // Hash the new password before saving
    user.passwordHash = bcrypt.hashSync(newPassword, 10); // Use 10 as the salt rounds (you can adjust this as needed)
    await user.save(); // Save the updated user
    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "An error occurred." });
  }
});
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ email });

    // Log the user object for debugging
    console.log("User found:", user);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Log the OTPs for comparison
    console.log("Received OTP:", otp);
    console.log("Stored OTP:", user.otp);
    console.log("OTP Expiration:", user.otpExpiration);
    console.log("Current Time:", Date.now());

    // Check if the OTP matches and if it has expired
    if (
      user.otp !== otp ||
      (user.otpExpiration && user.otpExpiration < Date.now())
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP is valid, allow user to reset the password
    user.otp = null; // Clear OTP after successful verification
    user.otpExpiration = null; // Clear expiration
    await user.save();
    const id = user.id;

    res.status(200).json({
      message: "OTP verified successfully, you can reset your password.",
      id, // include the token in the response
    });
  } catch (error) {
    console.error("Error verifying OTP:", error); // Log the error for debugging
    res.status(500).json({ message: error.message });
  }
});

// Example endpoint to clear user's cart

// Cart
router.delete("/:id/cart", authJwt(), async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = []; // Clear the cart
    await user.save();

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
router.put("/:userId/cart/:cartItemId", authJwt(), async (req, res) => {
  const { updateFields } = req.body; // Expecting cartItemId and updateFields in request body
  const { userId, cartItemId } = req.params; // Extract userId and cartItemId from URL parameters

  // Validate ObjectId for userId
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  // Validate request body fields
  if (!cartItemId || !updateFields) {
    return res.status(400).json({
      success: false,
      message: "cartItemId and updateFields are required",
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Find the cart item index using item.id
    const itemIndex = user.cart.findIndex((item) => item.id === cartItemId);
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    // Update the specific cart item
    user.cart[itemIndex] = {
      ...user.cart[itemIndex], // Keep existing item properties
      ...updateFields, // Update with new values from request body
    };

    // Save the updated user
    await user.save();

    // Return only the updated cart item
    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      updatedItem: user.cart[itemIndex], // Return the updated item
    });
  } catch (error) {
    console.error("Error updating cart item: ", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});
router.delete("/:userId/cart/:cartItemId", authJwt(), async (req, res) => {
  const { userId, cartItemId } = req.params; // Extract userId and cartItemId from URL parameters

  // Validate ObjectId for userId
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Find the cart item index using item.id
    const itemIndex = user.cart.findIndex((item) => item.id === cartItemId);
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    // Remove the cart item from the array
    user.cart.splice(itemIndex, 1);

    // Save the updated user
    await user.save();

    // Return a success response
    res.status(200).json({
      success: true,
      message: "Cart item removed successfully",
      cart: user.cart, // Optionally return the updated cart
    });
  } catch (error) {
    console.error("Error removing cart item: ", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});
//User
router.get("/user/:userId", authJwt(), async (req, res) => {
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
      .populate({
        path: "orderItems",
        populate: {
          path: "product", // Populate the attribute field
        },
      })

      .populate("user", "email name phone")
      .populate("restaurant", "name image");
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
router.put(
  `/uploadAvatar/:id`,
  authJwt(),
  uploadOptions.single("image"),
  async (req, res) => {
    try {
      const currentProduct = await User.findById(req.params.id);
      if (!currentProduct) {
        return res.status(404).send("User not found");
      }

      const file = req.file;
      const imageUrl = file ? file.path : currentProduct.image; // Use the new file path if available, otherwise keep the original image

      // Update the user
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          image: imageUrl,
        },
        { new: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user: ", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);
router.post("/branch/nearest", async (req, res) => {
  const { longitude, latitude } = req.body;

  if (!longitude || !latitude) {
    return res
      .status(400)
      .json({ success: false, message: "Longitude and latitude are required" });
  }

  try {
    // Find the nearest restaurants based on provided coordinates
    const restaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 5000, // example radius in meters
        },
      },
    });

    res.status(200).json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
