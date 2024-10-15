const mongoose = require("mongoose");

const attributeSchema = mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
});
const Attribute = mongoose.model("Attribute", attributeSchema);
module.exports = Attribute;
