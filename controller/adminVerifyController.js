const { User } = require("../models/User.js");

const adminVerifyController= async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);   
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }
          res.json({ message: "Welcome Admin" });
    } catch (error) {
        console.error("Error in admin verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
module.exports = {
    adminVerifyController
}