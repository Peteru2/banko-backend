const { User } = require('../models/User');
const { Wallet } = require('../models/Wallet');

const allUsersController = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optional search by name or email
    const search = req.query.search
      ? {
          $or: [
            { firstname: { $regex: req.query.search, $options: 'i' } },
            { lastname: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    // Fetch users
    const users = await User.find({ ...search, isDeleted: { $ne: true } })
      .select('-password -transactionPin -refreshToken -emailVerificationCode')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(); // Lean for plain JS objects (faster merging)

    const userIds = users.map((u) => u._id);

    // Fetch wallets for those users
    const wallets = await Wallet.find({ user: { $in: userIds } })
      .select('user accountNumber balance')
      .lean();

    // Merge wallet info into users
    const usersWithWallets = users.map((user) => {
      const wallet = wallets.find((w) => w.user.toString() === user._id.toString());
      return {
        ...user,
        wallet: wallet
          ? {
              accountNumber: wallet.accountNumber,
              balance: wallet.balance,
            }
          : {
              accountNumber: 'N/A',
              balance: 0,
            },
      };
    });

    const totalUsers = await User.countDocuments(search);

    // Send response
    res.status(200).json({
      success: true,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      users: usersWithWallets,
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

module.exports = { allUsersController };
