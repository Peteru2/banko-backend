const mongoose = require("mongoose");

const AirtimeTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  phoneNumber: { type: String, required: true },
  network: { type: String, required: true },
  amount: { type: Number, required: true },
  request_Id: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ["Pending", "Successful", "Failed"],
    default: "Pending",
  },
  date: {
      type: Date,
      default: Date.now
    },
  vtpassResponse: Object,
}, { timestamps: true });

const AirtimeTransaction = mongoose.model("AirtimeTransaction", AirtimeTransactionSchema);
module.exports = { AirtimeTransaction };