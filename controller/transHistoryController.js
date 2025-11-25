const { Transaction } = require("../models/Transaction");
const { AirtimeTransaction } = require("../models/AirtimeTransaction");


 const transferHistory = async (req, res) =>
   { 
    try { const userID = req.user.userId; 
      const transferHistory = await Transaction.find({ $or: [{ sender: userID }, 
        { recipient: userID }], }).populate("sender recipient"); 
      const airtimes = await AirtimeTransaction.find({ user: userID });
const transferHistoryClean = transferHistory.map(t => ({
  _id: t._id,
  type: "transfer",
  sender: t.sender,
  recipient: t.recipient,
  amount: t.amount,
  status: t.status,
  date: t.date,
  isAirtime: false
}));
       const airtimeFormatted = airtimes.map(a => ({
      _id: a._id,
      type: "airtime",
      sender: userID,
      recipient: null,
      amount: a.amount,
      status: a.status,
      date: a.date,
      network: a.network,
      phone: a.phoneNumber,
      reference: a.request_Id,
      isAirtime: true
    }));
      // MERGE BOTH
    const all = [...transferHistoryClean, ...airtimeFormatted];

    // // SORT NEWEST → OLDEST
    //  all.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (!transferHistory || transferHistory.length === 0) 
    {
       return res.status(200).json({transferHistory:[]}); 
      } 
       res.json({ transferHistory: all });
    
    }
  catch (error) { 
    console.error("Error fetching user data:", error); 
    res.status(500).json({ error: "Internal server error" }); } }; 
    
    module.exports = { transferHistory }