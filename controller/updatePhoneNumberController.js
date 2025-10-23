const { User } = require("../models/User.js");
const { Wallet } = require("../models/Wallet.js");
const {convertPhoneToISO, removeZero} = require("../utils/index.js");

const updatePhoneNumber = async (req, res)=> {
try {
    const { updatePhoneNumber } = req.body;
    
    const formattedPhoneNumber = convertPhoneToISO(updatePhoneNumber)
    const noZeroPhoneNumber = removeZero(updatePhoneNumber)
    if (!formattedPhoneNumber) {
      return res.status(401).json({ error: "Invalid phone number format" });
    }
    const checkNum = await User.findOne({ phoneNumber: formattedPhoneNumber });
    if(checkNum) {
        return res.status(401).json({ error: "Phone number already exist" });
    }
    await User.findByIdAndUpdate(req.user.userId, {
      phoneNumber: formattedPhoneNumber,
      accountNumber: noZeroPhoneNumber
    });

    await Wallet.findOneAndUpdate(
  { user: req.user.userId },
  { accountNumber: noZeroPhoneNumber }
);

    res.status(200).json({ message: "Phone Nubmer updated successfully" });
  } catch (error) {
    console.error("Failed to update phone number:", error);
    res.status(500).json({ error: "Failed to update phone number" });
  }
}
module.exports = {
    updatePhoneNumber
}