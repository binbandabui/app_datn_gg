const Product = require("../models/products");
const Category = require("../models/category");
const Restaurant = require("../models/restaurant");
const Type = require("../models/type");
const Ingrediant = require("../models/ingrediant");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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

const uploadOptions = multer({
  limits: { fileSize: 1024 * 1024 * 5 },
  storage: storage,
});

// Get all products with optional filtering by category
router.get(`/`, async (req, res) => {
  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(",") };
  }

  try {
    const productList = await Product.find(filter).populate("category");

    if (!productList.length) {
      return res
        .status(404)
        .json({ success: false, message: "No products found" });
    }
    res.send(productList);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// router.post(`/`, uploadOptions.single("image"), async (req, res) => {
//   try {
//     // Validate request body
//     const { name, description, category, restaurant, ingrediant } = req.body;
//     if (!name || !description || !category || !restaurant || !ingrediant) {
//       return res.status(400).send("All fields are required");
//     }

//     // Validate ObjectIDs
//     if (!mongoose.isValidObjectId(category)) {
//       return res.status(400).send("Invalid category ID");
//     }
//     if (!mongoose.isValidObjectId(restaurant)) {
//       return res.status(400).send("Invalid restaurant ID");
//     }
//     if (!mongoose.isValidObjectId(ingrediant)) {
//       return res.status(400).send("Invalid ingredient ID");
//     }

//     const categoryExists = await Category.findById(category);
//     if (!categoryExists) {
//       return res.status(404).send("Invalid category");
//     }

//     const restaurantExists = await Restaurant.findById(restaurant);
//     if (!restaurantExists) {
//       return res.status(404).send("Invalid restaurant");
//     }

//     const ingrediantExists = await Ingrediant.findById(ingrediant);
//     if (!ingrediantExists) {
//       return res.status(404).send("Invalid ingredient");
//     }

//     const file = req.file;
//     if (!file) {
//       return res.status(400).send("No image file provided");
//     }

//     const fileName = file.filename;
//     const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

//     let product = new Product({
//       name,
//       description,
//       image: `${basePath}${fileName}`,
//       category,
//       restaurant,
//       ingrediant,
//     });

//     product = await product.save();
//     res.status(201).send(product);
//   } catch (error) {
//     console.error(error); // Log the error for debugging
//     res.status(500).send("Internal server error");
//   }
// });

// Create a new product
router.post(`/`, uploadOptions.single("image"), async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).send("Invalid category");
    }

    const file = req.file;
    console.log("File received: ", file);
    if (!file) {
      return res.status(400).send("No image file provided");
    }

    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

    let product = new Product({
      name: req.body.name,
      description: req.body.description,
      image: `${basePath}${fileName}`,
      category: req.body.category,
    });

    product = await product.save();
    res.status(201).send(product); // Use 201 status code for created resource
  } catch (error) {
    console.error("Error creating product: ", error); // More specific logging
    res.status(500).send("Internal server error");
  }
});

// Get a product by ID
router.get(`/:id`, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a product by ID
router.put(`/:id`, uploadOptions.single("image"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  try {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).send("Invalid category");
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(400).send("Invalid product");

    const file = req.file;
    let imagePath = product.image;
    if (file) {
      const fileName = file.filename;
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${fileName}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        image: imagePath,
      },
      { new: true }
    );

    res.send(updatedProduct);
  } catch (error) {
    res.status(500).send("The product cannot be updated");
  }
});

// Delete a product by ID
router.delete(`/:id`, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (product) {
      return res
        .status(200)
        .json({ success: true, message: "The product was removed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Get product count
router.get("/get/count", async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No products found" });
    }
    res.status(200).json({ success: true, productCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get featured products with a limit
router.get("/get/featured/:count", async (req, res) => {
  const count = req.params.count ? parseInt(req.params.count) : 0;

  try {
    const products = await Product.find({ isFeatured: true }).limit(count);
    if (!products.length) {
      return res
        .status(500)
        .json({ success: false, message: "No featured products found" });
    }
    res.status(200).send(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload multiple images for a product
router.put(
  "/gallery-images/:id",
  uploadOptions.array("images", 10),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send("Invalid Product Id");
    }
    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

    if (files) {
      files.map((file) => {
        imagesPaths.push(`${basePath}${file.filename}`);
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPaths,
      },
      { new: true }
    );

    if (!product) return res.status(500).send("the gallery cannot be updated!");

    res.send(product);
  }
);

module.exports = router;
