const mongoose = require("mongoose");

const favoriteSchema = mongoose.Schema(
  {
    dateCreated: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { strictPopulate: false }
);
const Favorite = mongoose.model("Favorite", favoriteSchema);
module.exports = Favorite;
