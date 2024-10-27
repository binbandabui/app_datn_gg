const Product = require("../models/products");
const Category = require("../models/category");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Attribute = require("../models/attribute");
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
    // Validate Category ID
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).send("Invalid category");
    }

    // Handle file upload
    const file = req.file;
    console.log("File received: ", file);
    if (!file) {
      return res.status(400).send("No image file provided");
    }

    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

    // Create Product with attributes array
    let product = new Product({
      name: req.body.name,
      description: req.body.description,
      image: `${basePath}${fileName}`,
      category: req.body.category,
      isFeatured: req.body.isFeatured,
      isActive: req.body.isActive,
    });

    product = await product.save();
    res.status(201).send(product); // Use 201 status code for created resource
  } catch (error) {
    console.error("Error creating product: ", error);
    res.status(500).send("Internal server error");
  }
});
// Search products by name or description
router.get("/search", async (req, res) => {
  const searchQuery = req.query.input;
  if (!searchQuery) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  try {
    // Use regex to perform a case-insensitive search on name and description fields
    const products = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
    }).populate("category");

    if (!products.length) {
      return res
        .status(404)
        .json({ success: false, message: "No products found" });
    }

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// Get a product by ID
router.get(`/:id`, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("attributes");

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
    // Retrieve the current product data
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).send("Product not found");
    }

    // Validate Category ID if provided
    let category = currentProduct.category;
    if (req.body.category) {
      const validCategory = await Category.findById(req.body.category);
      if (!validCategory) {
        return res.status(404).send("Invalid category");
      }
      category = req.body.category;
    }

    // Validate Attributes array if provided
    let attributeIds = currentProduct.attributes;
    if (req.body.attributes) {
      if (
        !Array.isArray(req.body.attributes) ||
        req.body.attributes.length === 0
      ) {
        return res
          .status(400)
          .send("Attributes should be a non-empty array of valid IDs");
      }

      // Validate the attributes against the current product ID
      const validAttributes = await Attribute.find({
        _id: { $in: req.body.attributes },
        productId: currentProduct._id, // Ensure these attributes belong to the current product
      });

      if (validAttributes.length !== req.body.attributes.length) {
        return res
          .status(400)
          .send(
            "One or more attribute IDs are invalid or do not belong to the specified product"
          );
      }

      attributeIds = req.body.attributes; // Update the attribute IDs to the new ones
    }

    // Handle file upload for the image
    let imagePath = currentProduct.image;
    if (req.file) {
      const fileName = req.file.filename;
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${fileName}`;
    }

    // Update the Product with conditional checks for each field
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || currentProduct.name,
        description: req.body.description || currentProduct.description,
        category: category,
        image: imagePath,
        isFeatured:
          req.body.isFeatured !== undefined
            ? req.body.isFeatured
            : currentProduct.isFeatured,
        isActive:
          req.body.isActive !== undefined
            ? req.body.isActive
            : currentProduct.isActive,
        attributes: attributeIds,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(400).send("The product cannot be updated");
    }

    res.send(updatedProduct);
  } catch (error) {
    console.error("Error updating product: ", error);
    res.status(500).send("Internal server error");
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
router.get("/get/active/:count", async (req, res) => {
  const count = req.params.count ? parseInt(req.params.count) : 0;

  try {
    const products = await Product.find({ isActive: true }).limit(count);
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
router.get("/get/un_active/:count", async (req, res) => {
  const count = req.params.count ? parseInt(req.params.count) : 0;

  try {
    const products = await Product.find({ isActive: false }).limit(count);
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
