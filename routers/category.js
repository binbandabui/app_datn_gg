const Category = require("../models/category");

const express = require("express");
const mongoose = require("mongoose");

const multer = require("multer");
const Product = require("../models/products");

//
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
////////////////////////////////////////////////////////////////
//Cloud
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const router = express.Router();
// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "public", // Specify the folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"], // Allowed formats
  },
});

const uploadOptions = multer({ storage: storage });
router.get(`/`, async (req, res) => {
  const categoryList = await Category.find({ isActive: true });
  if (!categoryList) {
    res.status(404).json({ success: false });
  }

  res.status(200).send(categoryList);
});
router.post(`/`, uploadOptions.single("image"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No image file provided");
  }

  const imageUrl = file.path; // This is the URL returned by Cloudinary

  const category = new Category({
    name: req.body.name,
    image: imageUrl,
    isActive: req.body.isActive,
  });

  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get(`/un-active`, async (req, res) => {
  const categoryList = await Category.find({ isActive: false });
  if (!categoryList) {
    res.status(404).json({ success: false });
  }

  res.status(200).send(categoryList);
});
// Get all active products by category ID
router.get("/active-products/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate categoryId
    if (!mongoose.isValidObjectId(categoryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    // Find all active products in the specified category
    const activeProducts = await Product.find({
      category: categoryId,
      isActive: true,
    });

    // Check if any active products were found
    if (activeProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active products found for this category",
      });
    }

    // Respond with the list of active products
    res.status(200).json({ success: true, products: activeProducts });
  } catch (error) {
    console.error("Error retrieving active products: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete(`/:id`, async (req, res) => {
  try {
    const activeProductsCount = await Product.countDocuments({
      category: req.params.id,
      isActive: true,
    });

    if (activeProductsCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category while active products are assigned to it.",
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (category) {
      return res
        .status(200)
        .json({ success: true, message: "The category was removed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/:id", uploadOptions.single("image"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Prevent deactivation if active products exist
    if (req.body.isActive === false) {
      const activeProductsCount = await Product.countDocuments({
        category: req.params.id,
        isActive: true,
      });

      if (activeProductsCount > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot deactivate category while active products are assigned to it.",
        });
      }
    }

    const file = req.file;
    let imagePath = category.image; // Default to the existing image path
    if (file) {
      imagePath = file.path; // Get the Cloudinary URL for the new image
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || category.name,
        image: imagePath,
        isActive:
          req.body.isActive !== undefined
            ? req.body.isActive
            : category.isActive,
      },
      { new: true }
    );

    res.status(200).json(category);
  } catch (error) {
    console.error("Error updating category: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get(`/:id`, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    // Find the category by ID using req.params.id
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    // Log the error and return a 500 status
    console.error("Error fetching category by ID: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
