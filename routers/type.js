// const Type = require("../models/type");
// const express = require("express");
// const router = express.Router();

// // Get all types
// router.get("/", async (req, res) => {
//   try {
//     const typeList = await Type.find();
//     if (!typeList.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No types found" });
//     }
//     res.status(200).send(typeList);
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Create a new type
// router.post("/", async (req, res) => {
//   const type = new Type({
//     type: req.body.type, // The value from the request body
//   });

//   try {
//     const savedType = await type.save(); // Save the new type to the database
//     res.status(201).json(savedType); // Respond with the saved type
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message }); // Handle errors
//   }
// });

// module.exports = router;
