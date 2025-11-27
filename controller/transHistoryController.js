const { Transaction } = require("../models/Transaction");
const { AirtimeTransaction } = require("../models/AirtimeTransaction");

const transferHistory = async (req, res) => {
  try {
    const userID = req.user.userId;

    const transferHistory = await Transaction.find({
      $or: [{ sender: userID }, { recipient: userID }]
    })
      .sort({ date: -1 }) // newest first
      .populate("sender recipient");

    const airtimes = await AirtimeTransaction.find({ user: userID })
      .sort({ date: -1 });

    const transferHistoryClean = transferHistory.map(t => ({
      _id: t._id,
      type: "transfer",
      sender: t.sender,
      recipient: t.recipient,
      amount: t.amount,
      status: t.status,
      date: new Date(t.date), // ensure Date object
      isAirtime: false
    }));

   
    const airtimeFormatted = airtimes.map(a => ({
      _id: a._id,
      type: "airtime",
      sender: userID,
      recipient: null,
      amount: a.amount,
      status: a.status,
      date: new Date(a.date), // ensure Date object
      network: a.network,
      phone: a.phoneNumber,
      reference: a.request_Id,
      isAirtime: true
    }));

  
    const allTransactions = [...transferHistoryClean, ...airtimeFormatted].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    
    res.status(200).json({ transferHistory: allTransactions });

  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { transferHistory };
