// controllers/airtimePurchase.js
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");



const { AirtimeTransaction } = require("../models/AirtimeTransaction");
const { Wallet } = require("../models/Wallet");
const { User } = require("../models/User");

const { generateRequestId } = require("../utils/index");

const airtimeVerify = async(req, res) =>{
   const { phone, amount, network } = req.body;
  const userId = req.user?.id || req.user?._id;

  if (!phone || !amount || !network) {
    return res.status(400).json({
      success: false,
      message: "Phone, amount, and network are required.",
    });
  }


  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount." });
  }

}

const airtimePurchase = async (req, res) => {
  const { phone, amount, network, pin} = req.body;
  const userId = req.user?.id || req.user?._id;

  if (!phone || !amount || !network) {
    return res.status(400).json({
      success: false,
      message: "Phone, amount, and network are required.",
    });
  }


  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount." });
  }

  
  let net;

  if (network === "mtn") {
  net = "1";
} else if (network === "airtel") {
  net = "2";
} else if (network === "glo") {
  net = "3";
} else if (network === "9mobile") {
  net = "4";
} else {
  // optional: handle invalid network
  throw new Error("Invalid network");
}

  const sanitizedPhone = phone.replace(/\s+/g, "");
  if (!/^0\d{9,10}$/.test(sanitizedPhone) && !/^\+?234\d{9}$/.test(sanitizedPhone)) {
    return res.status(400).json({ success: false, message: "Invalid phone number format." });
  }

  // Sandbox requirement: must use 08011111111
  const isSandbox = process.env.VTU_NAIJA_SANDBOX === "true";
  const phoneToUse = isSandbox ? "08011111111" : sanitizedPhone;

  const requestId = generateRequestId();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user  
    const user = await User.findById(req.user.userId);
    if(!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const pinMatch = await bcrypt.compare(
      pin,
      user.transactionPin
    );
    if (!pinMatch){
           return res.status(400).json({ success:false, message: "Transaction Pin Incorrect" });
    }
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

    // Deduct wallet first
    wallet.balance -= amt;
    await wallet.save({ session });

    // Create AirtimeTransaction
    const airtimeTx = await AirtimeTransaction.create(
      [
        {
          user: userId,
          phoneNumber: sanitizedPhone,
          network,
          amount: amt,
          status: "Pending",
          request_Id: requestId,
        },
      ],
      { session }
    );

    const airtimeRecord = airtimeTx[0];

    // Prepare VTU Naija API request
    const vtUrl = isSandbox
      ? "https://sandbox.vtunaija.com.ng/api/topup/"
      : "https://vtunaija.com.ng/api/topup/";
console.log(isSandbox)
    const vtPayload = {
      network: net, // 1=MTN,2=GLO,3=9Mobile,4=Airtel
      mobile_number: phoneToUse,
      Ported_number: true.toString(),
      amount: amt.toString(),
      airtime_type: "VTU",
    };
    console.log(vtPayload)
    console.log(process.env.VTU_NAIJA_API_KEY)

    const axiosConfig = {
      headers: {
        Authorization: `Token ${process.env.VTU_NAIJA_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    };

    let providerRes;
    try {
      providerRes = await axios.post(vtUrl, vtPayload, axiosConfig);
      console.log(providerRes)
      
    } catch (err) {
      const providerErr = err.response?.data || { message: err.message };
      console.log(providerErr)
      airtimeRecord.status = "Failed";
      airtimeRecord.provider_response = providerErr;
      await airtimeRecord.save({ session });

      wallet.balance += amt;
      await wallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(502).json({
        success: false,
        message: "Failed to reach airtime provider",
        provider_response: providerErr,
      });
    }

    const data = providerRes.data || {};
    const isSuccess =
      data?.Status?.toLowerCase() === "successful" ||
      data?.status?.toLowerCase() === "success";

    if (isSuccess) {
      airtimeRecord.status = "Successful";
      airtimeRecord.provider_response = data;
      await airtimeRecord.save({ session });

      await session.commitTransaction();
      session.endSession();

      const updatedWallet = await Wallet.findOne({ user: userId });

      return res.status(200).json({
        success: true,
        message: `Airtime purchase successful for ${sanitizedPhone}`,
        data: {
          transaction: airtimeRecord,
          provider_response: data,
          balance: updatedWallet.balance,
        },
      });
    }

    // Failed transaction
    airtimeRecord.status = "Failed";
    airtimeRecord.provider_response = data;
    await airtimeRecord.save({ session });

    wallet.balance += amt;
    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(400).json({
      success: false,
      message: "Airtime purchase failed",
      provider_response: data,
    });
  } catch (error) {
    console.error("Airtime VTU Naija error:", error);
    try {
      await session.abortTransaction();
    } catch {}
    session.endSession();
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { 
  airtimeVerify,
  airtimePurchase
 };
