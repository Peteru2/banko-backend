const jwt = require("jsonwebtoken");
const {User} = require("./models/User.js")
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is missing' });
  }

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
  // const user = await User.findById(decoded.userId).select("-password");
  //   if (!user) return res.status(404).json({ message: "User not found" });

  //   req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware