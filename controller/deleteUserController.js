  const { User } = require("../models/User.js");
  const { Wallet } = require("../models/Wallet.js");
  const { Notification } = require("../models/Notification.js");
  const { Transaction } = require("../models/Transaction.js");

  const deleteUserController = async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Soft delete user and related data
    await Promise.all([
      User.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }),
      Wallet.updateMany({ user: id }, { isDeleted: true, deletedAt: new Date() }),
      Transaction.updateMany(
        { $or: [{ senderId: id }, { receiverId: id }] },
        { isDeleted: true, deletedAt: new Date() }
      ),
      Notification.updateMany(
        { $or: [{ senderId: id }, { receiverId: id }] },
        { isDeleted: true, deletedAt: new Date() }
      ),
    ]);

    res.status(200).json({ success: true, message: "User soft deleted successfully" });
  };

  module.exports = { deleteUserController };
