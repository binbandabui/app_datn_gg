const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    default: "Other",
  },
  image: {
    type: String,
    default: "",
    // required: false,
    // validate: {
    //   validator: function (v) {
    //     return /^\d{3}-\d{3}-\d{4}$/.test(v);
    //   },
    //   message: "Invalid phone number",
    // },
    // select: false,
  },
  paymentInfo: {
    type: String,
    default: "",
    // required: false,
    // validate: {
    //   validator: function (v) {
    //     return /^(4[0-9]{12}(?:[0-9]{3})?)$/.test(v);
    //   },
    //   message: "Invalid credit card number",
    // },
    // select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  otp: { type: String, default: null },
  otpExpiration: { type: Date, default: null },
});
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
userSchema.set("toJSON", {
  virtuals: true,
});
const User = mongoose.model("User", userSchema);
module.exports = User;
