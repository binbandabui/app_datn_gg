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
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: false }, // [longitude, latitude]
  },
});
restaurantSchema.index({ location: "2dsphere" });
const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
