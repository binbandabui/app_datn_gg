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
  defaultPrice: {
    type: Number,
    required: true,
    default: 30000,
  },
  image: {
    type: String,
    require: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
});
const Attribute = mongoose.model("Attribute", attributeSchema);
module.exports = Attribute;
