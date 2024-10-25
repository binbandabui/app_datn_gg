const mongoose = require("mongoose");

const orderItemSchema = mongoose.Schema({
  quantity: {
    type: Number,
    required: true,
  },
  excluded: {
    type: Array,
    required: true,
  },
  drink: {
    type: String,
    default: "Water",
  },
  attribute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attribute",
    required: true,
  },
});
const OrderItem = mongoose.model("OrderItem", orderItemSchema);
module.exports = { OrderItem };
