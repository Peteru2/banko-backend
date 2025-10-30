const mongoose = require('mongoose');

const { Schema } = mongoose;

const registrationSchema = new Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneNumber:{
        type: String,
        required: function() {
        return !this.isGoogleAccount;
    },
    },
    password: {
        type: String,
        required: function() {
      return !this.isGoogleAccount;
    },
    },
    accountBalance: {
        type: Number,
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
        required: true,
        },
    status: {
        type: Boolean,
        required: true,
    },
    isGoogleAccount: { type: Boolean, default: false },
    profileImage: { type: String, default: "" },
    emailVerificationCode: String,
    transactionPin: String,
    kycLevel: String,
    bvn: String,
    bvnFingerprint:String,
    accountNumber:String,
    emailVerificationCodeExpiryDate:String,
    refreshToken:String,
  
})
const User = mongoose.model('User', registrationSchema);
module.exports = { User };
