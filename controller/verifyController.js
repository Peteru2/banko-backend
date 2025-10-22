//Post_login
const { User } = require("../models/User.js");
const { Wallet } = require("../models/Wallet.js");
const utils = require("../utils/index.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Notification } = require("../models/Notification.js");
const nodemailer = require("nodemailer");
const { Transaction } = require("../models/Transaction.js");
const crypto = require("crypto");
const { upload } = require("../utils/cloudinary.js");


const postSignUp = async (req, res) => {
  try {
    const { firstname, lastname, email, phoneNumber, password } = req.body;
    const formattedPhoneNumber = utils.convertPhoneToISO(phoneNumber);
    if (!formattedPhoneNumber) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // const newAccountNumber = utils.generateAccountNumber();
    const emailVerificationCode = utils.generateEmailVerificationCode();

    const user = new User({
      firstname,
      lastname,
      email,
      phoneNumber: formattedPhoneNumber,
      password: hashedPassword,
      accountBalance: 0,
      status: true,
      kycLevel: 1,
      transactionPin: 0,
      bvn: 0,
      bvnFingerprint:0,
      accountNumber: 0,
      emailVerificationCode: emailVerificationCode,
      emailVerificationCodeExpiryDate: Date.now() + 10 * 60 * 1000,
    });

    const wallet = new Wallet({         
      user: user._id,
      accountNumber: phoneNumber,
    });

    const checkMail = await User.findOne({ email: email });
    const checkNum = await User.findOne({ phoneNumber: formattedPhoneNumber });
    const checkAccNum = await Wallet.findOne({
      accountNumber: phoneNumber,
    });

    if (checkMail) {
      return res.status(401).json({ error: "This email already exist" });
    }
    if (checkNum) {
      return res.status(401).json({ error: "This phone number already exist" });
    }
    
      await user.save();
      await wallet.save();
    
    
    // utils.transporter(user, emailVerificationCode)
    res.status(201).json({ message: "Account successfully Created", user });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the account" });
  }
};

const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    const emailVerificationCode = utils.generateEmailVerificationCode();
    if (!user) {
      return res.status(404).json({ error: " User not found" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const userID = user._id;
    if (!user.status) {
      await User.findByIdAndUpdate(userID, {
        emailVerificationCode: emailVerificationCode,
        emailVerificationCodeExpiryDate: Date.now() + 10 * 60 * 1000,
      });
   
    // utils.transporter(user, emailVerificationCode)

      return res.status(401).json({ user: userID });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "2h" }
    ); 

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    user.refreshToken = refreshToken
    await user.save()

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });
    

    res.status(200).json({
      success: "Exist",
      token,
      message: "User logged In Succesfully",
      user,
    });
    console.log();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred while logging in" });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { userId, emailVerificationCode } = req.body;
    const userID = await User.findById(userId);
    console.log(userID.emailVerificationCode)
    console.log(emailVerificationCode)

    if (!userID) {
      return res.status(404).json({ error: "User not found" });
    }
    if (userID.emailVerificationCode !== emailVerificationCode)
      return res.status(400).json({ error: "Invalid Email Verification Code" });
    if (Date.now() > userID.emailVerificationCodeExpiryDate)
      return res.status(400).json({ error: "Verification Code expired" });
    // if (otp !== process.env.OTP) {
    //   return res.status(401).json({ error: "Invalid OTP" });
    // }
    await User.findByIdAndUpdate(userID, { status: true });
    res.json({ message: "Account verified, please proceed to log in" });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTransactionPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const hashedPin = await bcrypt.hash(pin, 10);

    await User.findByIdAndUpdate(req.user.userId, {
      transactionPin: hashedPin,
    });

    res.status(200).json({ message: "Transaction pin updated successfully" });
  } catch (error) {
    console.error("Failed to update transaction pin:", error);
    res.status(500).json({ error: "Failed to update transaction pin" });
  }
};

const updateKyc = async (req, res) => {
  try {
    const { bvn } = req.body;;

    const user = await User.findById(req.user.userId);
    const hashedBVN = await bcrypt.hash(bvn, 10);
    const bvnFingerprint = crypto.createHash("sha256").update(bvn).digest("hex");
    const existing = await User.findOne({ bvnFingerprint });

    if (user.bvn !== "0") {
      return res.status(401).json({ error: "KYC already Updated" });
    }
    if (existing) {
      return res.status(400).json({ error: "BVN already exists" });
    }

    await User.findByIdAndUpdate(req.user.userId, {
      kycLevel: "2",
      bvn: hashedBVN,
      bvnFingerprint,
    });
    
  
      res.status(200).json({ message: "KYC Level Upgraded successfully" });
  } catch (error) {
    console.error("Failed to update transaction pin:", error);
    res.status(500).json({ error: "Failed to update transaction pin" });
  }
};

const getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.userId });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json({ balance: wallet.balance, accountNum: wallet.accountNumber });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const validateTransfer = async (req, res) => {
  try {
    const { recipientAccountNumber, amount } = req.body;
    // Find sender's wallet
    if (recipientAccountNumber.length === 0) {
      return res.status(400).json({ error: "Recipient account number needed" });
    }
    if (recipientAccountNumber.length < 10) {
      return res.status(400).json({ error: "Invalid account number" });
    }

    const senderWallet = await Wallet.findOne({ user: req.user.userId });
    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    if (amount < 50) {
      return res
        .status(400)
        .json({ error: "Minimum amount to transfer is 50" });
    }
    if (senderWallet.accountNumber == recipientAccountNumber) {
      return res.status(400).json({
        error: `${recipientAccountNumber} is your Banko account number, you can only transfer to other accounts`,
      });
    }

    // Find recipient's wallet by account number
    const recipientWallet = await Wallet.findOne({
      accountNumber: recipientAccountNumber,
    });
    if (!recipientWallet) {
      return res.status(404).json({ error: "Recipient wallet not found" });
    }

    const recipientId = recipientWallet.user;
    const recipientData = await User.findOne({ _id: recipientId });
    res.json({ message: "success", user: recipientData });
  } catch (error) {
    console.error("Failed to transfer funds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const transfer = async (req, res) => {
  try {
    const { recipientAccountNumber, amount, transPin } = req.body;

    // Find sender's wallet
    if (recipientAccountNumber.length === 0) {
      return res.status(400).json({ error: "Recipient account number needed" });
    }
    if (recipientAccountNumber.length < 10) {
      return res.status(400).json({ error: "Invalid account number" });
    }
    const senderWallet = await Wallet.findOne({ user: req.user.userId });
    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const recipientWallet = await Wallet.findOne({
      accountNumber: recipientAccountNumber,
    });
    if (!recipientWallet) {
      return res.status(404).json({ error: "Recipient wallet not found" });
    }

    if (amount < 50) {
      return res
        .status(400)
        .json({ error: "Minimum amount transferable is 50" });
    }
    const userTransPin = await User.findById(req.user.userId);

    if (userTransPin.accountNumber === "0") {
      await User.findByIdAndUpdate(req.user.userId, {
        accountNumber: senderWallet.accountNumber,
      });
    }

    // Update recipient's account number if it is 0
    const recipientUser = await User.findById(recipientWallet.user);
    if (recipientUser.accountNumber === "0") {
      await User.findByIdAndUpdate(recipientWallet.user, {
        accountNumber: recipientWallet.accountNumber,
      });
    }
    if (!userTransPin) {
      return res.status(404).json({ error: "Transaction Pin not found" });
    }

    const pinMatch = await bcrypt.compare(
      transPin,
      userTransPin.transactionPin
    );
    if (!pinMatch) {
      return res.status(400).json({ error: "Transaction Pin Incorrect" });
    }

 
    senderWallet.balance -= amount;
    await senderWallet.save();

    recipientWallet.balance += parseInt(amount);
    await recipientWallet.save();

    const transaction = new Transaction({
      sender: senderWallet.user,
      recipient: recipientWallet.user,
      amount,
      status: "Successful",
    });
    await transaction.save();

    const notification = new Notification({
      type: "fund_transfer",
      message: `You received $${amount} from ${senderWallet.user}`,
      recipient: recipientWallet.user,
    });
    await notification.save();
    res.json({ message: "Funds transferred successfully" });
  } catch (error) {
    console.error("Failed to transfer funds:", error);
    res.status(50).json({ error: "Internal server error" });
  }
};


const notificationInfo = async (req, res) => {
  try {
    const userID = req.user.userId;
  } catch {}
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = req.file.path;

    if (req.user && req.user.userId) {
      const userId = req.user.userId;
      const user = await User.findByIdAndUpdate(
        userId,
        { profileImage: fileUrl },
        { new: true }
      );
      return res.json({
        message: "File uploaded successfully",
        fileUrl,
        user,
      });
    }

  
    res.json({ message: "File uploaded successfully", fileUrl });
  } catch (err) {
    console.error("Failed to save uploaded file to user:", err);
    res.status(500).json({ error: "Failed to save uploaded file" });
  }
};

module.exports = {
  postSignUp,
  postLogin,
  verifyEmail,
  updateTransactionPin,
  updateKyc,
  getBalance,
  validateTransfer,
  transfer,
  notificationInfo,
  upload,
  uploadImage,

};
