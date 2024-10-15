const Restaurant = require("../models/restaurant");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const FILE_TYPES_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};
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
    console.log("File uploaded successfully:", file);
    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    let restaurant = new Restaurant({
      name: req.body.name,
      address: req.body.address,
      review: req.body.review,
      image: `${basePath}${fileName}`,
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

module.exports = router;
