const Category = require("../models/category");

const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();
const multer = require("multer");

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

const uploadOptions = multer({ storage: storage });
router.get(`/`, async (req, res) => {
  const categoryList = await Category.find();
  if (!categoryList) {
    res.status(404).json({ success: false });
  }
  res.status(200).send(categoryList);
});
router.post(`/`, uploadOptions.single("image"), async (req, res) => {
  const file = req.file;
  console.log("File received: ", file);
  if (!file) {
    return res.status(400).send("No image file provided");
  }

  const fileName = file.filename;
  const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

  const category = new Category({
    name: req.body.name,
    image: `${basePath}${fileName}`,
  });
  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory); // This line sends the response, so the next line should be removed.
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete(`/:id`, async (req, res) => {
  Category.findByIdAndDelete(req.params.id)
    .then((category) => {
      if (category) {
        return res
          .status(200)
          .json({ success: true, message: "the category was removed" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "category not found" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, message: err });
    });
}),
  router.put("/:id", uploadOptions.single("image"), async (req, res) => {
    // Check if the category ID is valid
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    try {
      // Check if the category exists
      let category = await Category.findById(req.params.id);
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
      category = await Category.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name || category.name, // Update only if a new name is provided
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
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
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

    // Respond with the found category
    res.status(200).json(category);
  } catch (error) {
    // Log the error and return a 500 status
    console.error("Error fetching category by ID: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
