  const { User } = require('../models/User');

const allUsersController = async (req, res) => {
  try {
      // console.log(req.user)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optional search by name or email
    const search = req.query.search
      ? {
          $or: [
            { firstname: { $regex: req.query.search, $options: 'i' }    },
            { lastname: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    // Fetch all users except passwords
    const users = await User.find({ ...search, isDeleted: { $ne: true } })
  .select('-password -transactionPin -refreshToken -emailVerificationCode')
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(search);
        console.log(users)
    res.status(200).json({
      success: true,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

module.exports = { allUsersController };
