const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

module.exports = authMiddleware;
