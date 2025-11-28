// controllers/airtimePurchase.js
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");



const { AirtimeTransaction } = require("../models/AirtimeTransaction");
const { Wallet } = require("../models/Wallet");
const { User } = require("../models/User");

const { generateRequestId } = require("../utils/index");
  const isSandbox = process.env.VTU_NAIJA_SANDBOX === "true";

const airtimeVerify = async(req, res) =>{
   const { phone, amount, network } = req.body;
  const userId = req.user?.id || req.user?._id;

   const sanitizedPhone = phone.replace(/\s+/g, "");
  const sandBoxPhone="08011111111"
 if (!phone || !amount || !network) {
    return res.status(400).json({
      success: false,
      message: "Phone, amount, and network are required.",
    });
  }
  if (!/^0\d{9,10}$/.test(sanitizedPhone) && !/^\+?234\d{9}$/.test(sanitizedPhone)) {
    return res.status(400).json({ success: false, message: "Invalid phone number format." });
  }

  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount." });
  }

  if (process.env.VTU_NAIJA_SANDBOX==="true" && sanitizedPhone!=sandBoxPhone){
    return res.status(400).json({ success: false, message: "Sandbox account only, use 08011111111" });
  }

  try{
   const wallet = await Wallet.findOne({ user: userId });
   const user = await User.findOne({ _id: userId });
   console.log(user.airtimePurchaseCount)
  
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    if (wallet.balance < amt) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }
    if (amt>50) {
      return res.status(400).json({ success: false, message: "You cannot buy more than ₦50" });
    }
  if(wallet.accountNumber != sanitizedPhone && !isSandbox){
      return res.status(400).json({ success: false, message: "This is not your registered mobile number" });
    }
    if (user.airtimePurchaseCount >= 1 && !isSandbox ){
      return res.status(400).json({ success: false, message: "You cannot buy more than once" });

    }
    return res.status(200).json({success:true})
    }
    catch(err){
      return res.status(500).json({success:false, message:err})
    }


}

const airtimePurchase = async (req, res) => {
  const { phone, amount, network, pin} = req.body;
  const userId = req.user?.id || req.user?._id;

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
      await session.abortTransaction();
      session.endSession();
           return res.status(400).json({ success:false, message: "Transaction Pin Incorrect" });
    }
   
    // Deduct wallet first
   const wallet = await Wallet.findOne({ user: userId }).session(session);
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
    const vtAPIk = isSandbox 
      ? process.env.VTU_NAIJA_SANDBOX_API_KEY
      : process.env.VTU_NAIJA_API_KEY
console.log(isSandbox)
    const vtPayload = {
      network: net, // 1=MTN,2=GLO,3=9Mobile,4=Airtel
      mobile_number: phoneToUse,
      Ported_number: true,
      amount: amt,
      airtime_type: "VTU",
    };
    console.log(vtPayload)
    
    const axiosConfig = {
      headers: {
        Authorization: `Token ${vtAPIk}`,
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
      await User.findByIdAndUpdate(userId, { $inc: { airtimePurchaseCount: 1 } });

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
