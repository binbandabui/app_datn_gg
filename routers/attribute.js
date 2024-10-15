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
module.exports = router;
