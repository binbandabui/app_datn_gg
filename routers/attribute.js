const Attribute = require("../models/attribute");
const Product = require("../models/products");

const express = require("express");

const router = express.Router();
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
router.put("/:id", async (req, res) => {
  try {
    const productId = await Product.findById(req.body.productId);
    if (!productId) {
      return res.status(404).send("Invalid productId");
    }
    const attribute = await Attribute.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("productId", "name"); // Populate the 'productId' with 'name'
    if (!attribute) {
      return res
        .status(404)
        .json({ success: false, message: "attribute not found" });
    }
    res.status(200).send(attribute);
  } catch (error) {
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

    // Find all attributes related to the productId
    const attributes = await Attribute.find({ productId });

    if (attributes.length === 0) {
      return res
        .status(404)
        .json({ message: "No attributes found for this product" });
    }

    // Response with the productId and the list of attributes
    const result = {
      productId,
      attributes,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
