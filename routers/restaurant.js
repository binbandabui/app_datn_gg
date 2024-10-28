const Restaurant = require("../models/restaurant");
const express = require("express");

const mongoose = require("mongoose");
const multer = require("multer");
// const FILE_TYPES_MAP = {
//   "image/png": "png",
//   "image/jpeg": "jpeg",
//   "image/jpg": "jpg",
// };
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

//Cloud
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "dtjfbyjod", // Replace with your Cloud Name
  api_key: "524635429587295", // Replace with your API Key
  api_secret: "h-pB0GQB-aalTkMPhlbzOLuNCQY", // Replace with your API Secret
});
const router = express.Router();
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "branch", // Specify the folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"], // Allowed formats
  },
});

const uploadOptions = multer({ storage: storage });
router.get(`/`, async (req, res) => {
  const restaurantList = await Restaurant.find();
  if (!restaurantList) {
    res.status(404).json({ success: false });
  }
  res.status(200).send(restaurantList);
});
router.post(`/`, uploadOptions.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      console.log("No file received");
      return res.status(400).send("No image file provided");
    }
    const imageUrl = file.path; // This is the URL returned by Cloudinary

    const restaurant = new Category({
      name: req.body.name,
      address: req.body.address,
      review: req.body.review,
      image: imageUrl,
      isActive: req.body.isActive,
    });
    restaurant = await restaurant.save();
    res.send(restaurant);
  } catch (err) {
    console.error(err);
    res.status(400).send(err);
  }
});
router.get(`/:id`, async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    return res
      .status(404)
      .json({ success: false, message: "Restaurant not found" });
  }
  res.status(200).send(restaurant);
});
router.put(`/:id`, uploadOptions.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      console.log("No file received");
      return res.status(400).send("No image file provided");
    }
    const imageUrl = file.path; // This is the URL returned by Cloudinary
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || restaurant.name,
        address: req.body.address || restaurant.address,
        review: req.body.review || restaurant.review,
        image: imageUrl,
        isActive: req.body.isActive || restaurant.isActive,
      },
      { new: true }

      // If no restaurant is found after update, return a 404 error
    );
    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    // Send the updated restaurant as a response
    res.status(200).json(restaurant);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.delete(`/:id`, async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (restaurant) {
      return res
        .status(200)
        .json({ success: true, message: "Restaurant was removed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
// Upload multiple images for a product
router.put(
  "/gallery-images/:id",
  uploadOptions.array("gallery", 10),
  async (req, res) => {
    // Validate the restaurant ID
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send("Invalid Restaurant Id");
    }

    const files = req.files;
    let imagesPaths = [];

    // Check if files are received and map them to image URLs from Cloudinary
    if (files && files.length > 0) {
      imagesPaths = files.map((file) => file.path); // Cloudinary returns the path directly
    }

    try {
      // Find and update the restaurant's gallery images
      const restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { gallery: imagesPaths }, // Update the gallery with new image URLs
        { new: true } // Return the updated document
      );

      // Check if the restaurant was found and updated
      if (!restaurant) {
        return res.status(404).send("Restaurant not found");
      }

      // Respond with the updated restaurant data
      res.status(200).json(restaurant);
    } catch (error) {
      // Handle errors and respond with an appropriate message
      console.error("Error updating gallery images: ", error);
      res
        .status(500)
        .send("An error occurred while updating the gallery images");
    }
  }
);

router.get("/get/active/", async (req, res) => {
  try {
    const verifiedUsers = await Restaurant.find({ isActive: true });
    res.send(verifiedUsers);
  } catch (error) {
    console.error("Error fetching verified users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.get("/get/un_active/", async (req, res) => {
  try {
    const verifiedUsers = await Restaurant.find({ isActive: false });
    res.send(verifiedUsers);
  } catch (error) {
    console.error("Error fetching verified users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
module.exports = router;
