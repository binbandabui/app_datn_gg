const mongoose = require("mongoose");

const restaurantSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  review: {
    type: Number,
  },
  image: {
    type: String,
    default: "",
  },
  gallery: {
    type: Array,
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});
restaurantSchema.index({ location: "2dsphere" });
const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
