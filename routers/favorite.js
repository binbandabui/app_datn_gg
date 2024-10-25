const Favorite = require("../models/favorite"); // Change this to 'Favorite'
const express = require("express");
const User = require("../models/user");
const Product = require("../models/products");
const router = express.Router();
const authJwt = require("../helper/jwt");

// GET all favorite entries
router.get(`/`, async (req, res) => {
  try {
    const favoriteList = await Favorite.find()
      .populate("userId", "email") // Populate userId with 'email'
      .populate("productId", "name"); // Populate productId with 'name'

    if (!favoriteList) {
      return res
        .status(404)
        .json({ success: false, message: "No favorites found" });
    }

    res.status(200).send(favoriteList);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST to create a new favorite entry
router.post(`/`, authJwt(), async (req, res) => {
  try {
    const userId = await req.user.userId;
    if (!userId) {
      return res.status(404).send("Invalid user");
    }

    const productId = await Product.findById(req.body.productId);
    if (!productId) {
      return res.status(404).send("Invalid product");
    }

    const favorite = new Favorite({
      dateOrdered: req.body.dateOrdered,
      userId: userId, // Pass only IDs here
      productId: req.body.productId,
    });

    const newFavorite = await favorite.save();
    res.status(201).json(newFavorite);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a favorite entry by ID
router.delete(`/:id`, async (req, res) => {
  try {
    const favorite = await Favorite.findByIdAndDelete(req.params.id);
    if (!favorite) {
      return res
        .status(404)
        .json({ success: false, message: "Favorite not found" });
    }

    res.status(200).json({ success: true, message: "Favorite was removed" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET a favorite by ID
router.get("/:id", async (req, res) => {
  try {
    const favorite = await Favorite.findById(req.params.id)
      .populate("userId", "email") // Populate the 'userId' with 'email'
      .populate("productId", "name"); // Populate the 'productId' with 'name'

    if (!favorite) {
      return res
        .status(404)
        .json({ success: false, message: "Favorite not found" });
    }

    res.status(200).send(favorite);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT to update a favorite by ID
router.put("/:id", async (req, res) => {
  try {
    const favorite = await Favorite.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!favorite) {
      return res
        .status(404)
        .json({ success: false, message: "Favorite not found" });
    }

    res.status(200).send(favorite);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.put("/edituser/:id", async (req, res) => {
  try {
    const favorite = await Favorite.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!favorite) {
      return res
        .status(404)
        .json({ success: false, message: "Favorite not found" });
    }

    res.status(200).send(favorite);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
module.exports = router;
