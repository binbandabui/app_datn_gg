const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  counterAccountBankId: { type: String },
  counterAccountBankName: { type: String },
  counterAccountName: { type: String },
  counterAccountNumber: { type: String },
  description: { type: String },
  reference: { type: String },
  transactionDateTime: { type: Date, required: true },
  virtualAccountName: { type: String },
  virtualAccountNumber: { type: String },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
