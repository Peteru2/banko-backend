const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models/User.js");
const { Wallet } = require("../models/Wallet.js");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignUpController = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;


    let user = await User.findOne({ email });
    if (user && user.isGoogleAccount === false) {
            return res.status(401).json({
      error: "Authenticating failed due to the following error: We already have a registered user with this email address. Log in to connect your google account.",
     
    });
    } 
    if (!user) {
      const [firstname, ...rest] = name.split(" ");
      const lastname = rest.join(" ");

      user = new User({
        firstname,
        lastname,
        email,
        phoneNumber: "",
        password: '',
        isGoogleAccount: true,
        accountBalance: 0,
        status: true,
        kycLevel: 0,
        transactionPin: 0,
        bvn: 0,
        kycLevel: 1,
        bvnFingerprint: 0,
        accountNumber: 0,
        profileImage: picture,
        createdAt: new Date()
      });

      await user.save(); 
      const wallet = new Wallet({
        user: user._id,
        accountNumber:null, 
      });

      await wallet.save();
    }

    
    const appToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: user.isGoogleAccount ? "Google login successful" : "User created",
      token: appToken,
      user,
    });

  } catch (error) {
    console.error("Google sign-up error:", error);
    res.status(500).json({ error: "Google login failed" });
  }
};

module.exports = { googleSignUpController };
