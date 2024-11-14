const Attribute = require("../models/attribute");
const Product = require("../models/products");

const express = require("express");
const multer = require("multer");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const router = express.Router();
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "public", // Specify the folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"], // Allowed formats
  },
});

const uploadOptions = multer({ storage: storage });
router.get(`/`, async (req, res) => {
  const attributeList = await Attribute.find();
  if (!attributeList) {
    res.status(404).json({ success: false });
  }
  res.status(200).send(attributeList);
});
router.post("/", async (req, res) => {
  const productId = await Product.findById(req.body.productId);
  if (!productId) {
    return res.status(404).send("Invalid productId");
  }
  const attribute = new Attribute({
    size: req.body.size,
    price: req.body.price,
    productId: req.body.productId,
  });
  const newAttribute = await attribute.save();
  if (!newAttribute) {
    return res
      .status(400)
      .json({ success: false, message: "Failed to create attribute" });
  }
  res.status(201).send(newAttribute);
});
router.get("/:id", async (req, res) => {
  const productId = await Product.findById(req.body.productId);

  const attribute = await Attribute.findById(req.params.id).populate(
    "productId",
    "name"
  ); // Populate the 'productId' with 'name'
  if (!productId) {
    return res.status(404).send("Invalid productId");
  }
  if (!attribute) {
    return res
      .status(404)
      .json({ success: false, message: "attribute not found" });
  }
  res.status(200).send(attribute);
});
router.put("/:id", uploadOptions.single("image"), async (req, res) => {
  try {
    let attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });
    }

    // Checking if attribute can be deactivated
    if (req.body.isActive === false) {
      const activeProductsCount = await Product.countDocuments({
        attributes: req.params.id,
        isActive: true,
      });

      if (activeProductsCount > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot deactivate attribute while active products are assigned to it.",
        });
      }
    }

    const file = req.file;
    let imagePath = attribute.image; // Default to the existing image path
    if (file) {
      imagePath = file.path; // Get the Cloudinary URL for the new image
    }

    attribute = await Attribute.findByIdAndUpdate(
      req.params.id,
      {
        size: req.body.size || attribute.size,
        image: imagePath,
        isActive:
          req.body.isActive !== undefined
            ? req.body.isActive
            : attribute.isActive,
        productId: req.body.productId || attribute.productId,
      },
      { new: true }
    ).populate("productId", "name"); // Populate the 'productId' with 'name'

    if (!attribute) {
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });
    }

    res.status(200).send(attribute);
  } catch (error) {
    console.error("Error updating attribute:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get(`/by-product/:productId`, async (req, res) => {
  const { productId } = req.params;

  try {
    // Check if the product exists
    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({ message: "Invalid productId" });
    }

    // Find all active attributes related to the productId
    const attributes = await Attribute.find({
      productId,
      isActive: true, // Add condition to filter only active attributes
    });

    if (attributes.length === 0) {
      return res
        .status(404)
        .json({ message: "No active attributes found for this product" });
    }

    // Response with the productId and the list of active attributes
    const result = {
      productId,
      attributes,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// router.post("/add/multiple", async (req, res) => {
//   const { productId, attributes } = req.body; // Expecting { productId, attributes: [{ size, price }, ...] }

//   if (!productId || !Array.isArray(attributes) || attributes.length === 0) {
//     return res.status(400).json({ success: false, message: "Invalid input" });
//   }

//   try {
//     // Optionally, you can check if the product exists
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     // Save each attribute
//     const savedAttributes = [];
//     for (const attribute of attributes) {
//       const newAttribute = new Attribute({
//         size: attribute.size,
//         price: attribute.price,
//         productId: productId,
//         isActive: attribute.isActive,
//       });
//       const savedAttribute = await newAttribute.save();
//       savedAttributes.push(savedAttribute);
//     }

//     res.status(201).json({ success: true, attributes: savedAttributes });
//   } catch (error) {
//     console.error("Error saving attributes:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });
router.post(
  "/add/single",
  uploadOptions.single("image"), // Single image upload per attribute
  async (req, res) => {
    const { productId, size, price, defaultPrice, isActive } = req.body;
    const file = req.file;

    // Log incoming request for debugging
    console.log("Incoming Request Data:", req.body);

    if (!file) {
      return res.status(400).send("An image file is required.");
    }

    const imageUrl = file.path; // Path of the uploaded image

    if (
      !productId ||
      !size ||
      !price ||
      !defaultPrice ||
      isActive === undefined
    ) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    try {
      // Retrieve the product and check if it exists
      const product = await Product.findById(productId).populate("attributes");
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      // Create the new attribute
      const newAttribute = new Attribute({
        size,
        price,
        image: imageUrl, // Single image for this attribute
        defaultPrice,
        productId: productId,
        isActive,
      });

      const savedAttribute = await newAttribute.save();

      // Update the product's attributes array with the new attribute ID
      product.attributes.push(savedAttribute._id);
      await product.save();

      // Respond with the updated product, including all attributes
      res.status(201).json({
        success: true,
        product: {
          _id: product._id,
          name: product.name,
          description: product.description,
          image: product.image,
          category: product.category,
          attributes: await Product.findById(productId).populate("attributes"), // re-fetch product with updated attributes
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          dateCreated: product.dateCreated,
        },
      });
    } catch (error) {
      console.error("Error saving attribute:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

module.exports = router;
