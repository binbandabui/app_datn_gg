// const Ingrediant = require("../models/ingrediant");
// const express = require("express");
// const router = express.Router();

// router.get("/", async (req, res) => {
//   try {
//     const ingrediant = await Ingrediant.find();
//     if (!ingrediant.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No types found" });
//     }
//     res.status(200).send(ingrediant);
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Create a new type
// router.post("/", async (req, res) => {
//   const ingrediant = new Ingrediant({
//     name: req.body.name, // The value from the request body
//     image: req.body.image,
//     price: req.body.price,
//   });

//   try {
//     const savedIngrediant = await ingrediant.save(); // Save the new type to the database
//     res.status(201).json(savedIngrediant); // Respond with the saved type
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message }); // Handle errors
//   }
// });

// module.exports = router;
