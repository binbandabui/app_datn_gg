const expressJwt = require("express-jwt");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const mongoose = require("mongoose");
const multer = require("multer");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // Import crypto for generating OTPs

// Mapping of file types for upload validation
const FILE_TYPES_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPES_MAP[file.mimetype];
    let uploadError = new Error("Invalid image type");
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPES_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({
  limits: { fileSize: 1024 * 1024 * 5 },
  storage: storage,
});
////////////////////////////////
router.get(`/:id`, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false });
  }
  res.status(200).json(user);
});
router.get(`/`, async (req, res) => {
  const userList = await User.find();
  if (!userList) {
    return res.status(404).json({ success: false });
  }
  res.status(200).json(userList);
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
    if (bcrypt.compareSync(req.body.password, user.passwordHash)) {
      const token = jwt.sign(
        {
          userId: user.id,
          isAdmin: user.isAdmin,
        },
        secret,
        { expiresIn: "1d" }
      );
      res.status(200).send({ user: user.email, token: token });
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
    const { name, email, password, phone, isAdmin, image, paymentInfo } =
      req.body;

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
    const userCount = await User.countDocuments();
    res.send({ userCount: userCount });
  } catch (error) {
    res.status(404).json({ success: false, message: "No user found" });
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
router.put(`/:id`, uploadOptions.single("image"), async (req, res) => {
  try {
    // Find the category by ID
    let category = await User.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Process the uploaded file, if any
    const file = req.file;
    let imagePath = category.image; // Default to the existing image path
    if (file) {
      const fileName = file.filename;
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${fileName}`;
    }

    // Update the category
    category = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || category.name,
        phone: req.body.phone || category.phone,
        email: req.body.email || category.email,
        paymentInfo: req.body.paymentInfo || category.paymentInfo,
        image: imagePath,
        isAdmin: req.body.isAdmin || category.isAdmin,
        isVerified: req.body.isVerified || category.isVerified,
      },
      { new: true }
    );

    // If no category is found after update, return a 404 error
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Send the updated category as a response
    res.status(200).json(category);
  } catch (error) {
    console.error("Error updating category: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// Update user
router.put(`/edituser/:id`, uploadOptions.single("image"), async (req, res) => {
  // Validate ObjectId
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    // Find the category by ID
    let category = await User.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Process the uploaded file, if any
    const file = req.file;
    let imagePath = category.image; // Default to the existing image path
    if (file) {
      const fileName = file.filename;
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${fileName}`;
    }

    // Update the category
    category = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || category.name,
        phone: req.body.phone || category.phone,
        email: req.body.email || category.email,
        paymentInfo: req.body.paymentInfo || category.paymentInfo,
        image: imagePath,
      },
      { new: true }
    );

    // If no category is found after update, return a 404 error
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Send the updated category as a response
    res.status(200).json(category);
  } catch (error) {
    console.error("Error updating category: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

    res.status(200).json({
      message: "OTP verified successfully, you can reset your password.",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error); // Log the error for debugging
    res.status(500).json({ message: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Save the user with the new password
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error); // Log the error for debugging
    res.status(500).json({ message: error.message });
  }
});
//

module.exports = router;
