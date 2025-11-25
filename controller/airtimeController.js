// controllers/airtimePurchase.js
const axios = require("axios");
const mongoose = require("mongoose");

const { AirtimeTransaction } = require("../models/AirtimeTransaction");
const { User } = require("../models/User");
const { Wallet } = require("../models/Wallet");
const { generateRequestId } = require("../utils/index");
const { requeryVTpass  } = require("../utils/index");


const airtimePurchase = async (req, res) => {
  const { phone, amount, network } = req.body;
  const userId = req.user?.id || req.user?._id;
   
  if (!phone || !amount || !network) {
    return res.status(400).json({
      success: false,
      message: "phone, amount and network are required.",
    });
  }

  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount." });
  }

  // Validate phone number format (Nigeria)
  const sanitizedPhone = phone.replace(/\s+/g, "");
  if (
    !/^0\d{9,10}$/.test(sanitizedPhone) &&
    !/^\+?234\d{9}$/.test(sanitizedPhone)
  ) {
    return res.status(400).json({ success: false, message: "Invalid phone number format." });
  }

  const request_Id = generateRequestId();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get Wallet inside session
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    if (wallet.balance < amt) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Deduct the balance FIRST
    wallet.balance = Number(wallet.balance) - amt;
    await wallet.save({ session });

    
    const airtimeTx = await AirtimeTransaction.create(
      [
        {
          user: userId,
          phoneNumber: sanitizedPhone,
          network,
          amount: amt,
          status: "pending",
          request_Id,
        },
      ],
      { session }
    );

    const airtimeRecord = airtimeTx[0];

    // Prepare provider request
    const vtPayload = {
      serviceID: network,
      phone: sanitizedPhone,
      amount: amt,
      request_id:request_Id,
    };

    const vtUrl = `${process.env.VTPASS_BASE_URL}/pay`;

    const axiosConfig = {
  headers: {
    "api-key": process.env.VTPASS_API_KEY,
    "secret-key": process.env.VTPASS_SECRET_KEY,
    "Content-Type": "application/json",
  },
  timeout: 30000,
};

    let providerRes;
    try {
      providerRes = await axios.post(vtUrl, vtPayload, axiosConfig);
    } catch (err) {
      const providerErr = err.response?.data || { message: err.message };

      // Mark transaction failed + Refund wallet
      airtimeRecord.status = "failed";
      airtimeRecord.provider_response = providerErr;
      await airtimeRecord.save({ session });

      wallet.balance = Number(wallet.balance) + amt;
      await wallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(502).json({
        success: false,
        message: "Failed to reach airtime provider",
        provider_response: providerErr,
      });
    }

    const providerData = providerRes.data || {};
let isSuccess =
  providerData?.code === "000" ||
  /success|delivered/i.test(providerData?.response_description || "");

// If not success, try REQUERY
if (!isSuccess) {
 
await new Promise(resolve => setTimeout(resolve, 3000)); const requeryRes = await requeryVTpass(request_Id); 
  

  const requerySuccess =
    requeryRes?.code === "000" ||
    /success|delivered/i.test(requeryRes?.response_description || "");

  if (requerySuccess) {
    isSuccess = true;
    providerData = requeryRes; // overwrite response
  }
}

if (isSuccess) {
  airtimeRecord.status = "successful";
  airtimeRecord.provider_response = providerData;
  await airtimeRecord.save({ session });

  await session.commitTransaction();
  session.endSession();

  const updatedWallet = await Wallet.findOne({ user: userId });

  return res.status(200).json({
    success: true,
    message: "Airtime purchase successful",
    data: {
      transaction: airtimeRecord,
      provider_response: providerData,
      balance: updatedWallet.balance,
    },
  });
}

// Failed after requery
airtimeRecord.status = "failed";
airtimeRecord.provider_response = providerData;
await airtimeRecord.save({ session });

wallet.balance += amt;
await wallet.save({ session });

await session.commitTransaction();
session.endSession();

return res.status(400).json({
  success: false,
  message: "Airtime purchase failed",
  provider_response: providerData,
});

  } catch (error) {
    console.error("Airtime error:", error);

    try {
      await session.abortTransaction();
    } catch {}

    session.endSession();
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const airtimeTransactionHistory = async (req, res) =>{
  // try{
  //    const userID = req.user.userId
  //    console.log(userID)
  //    const userAirtimePurchase =await  User.findOne({user})
  // }
  // catch(err){
  //     console.log(err)
  // }

}

module.exports = { 
  airtimePurchase,
  // airtimeTransactionHistory


};
