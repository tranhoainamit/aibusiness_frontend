const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware using JWT
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực, quyền truy cập bị từ chối' });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Định dạng token không hợp lệ' });
    }

    // Get the token part
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database - check both id and userId properties
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Nội dung token không hợp lệ' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Không tìm thấy người dùng' });
    }

    // Check if user is active (use status or is_active depending on your schema)
    if (user.status === 'inactive' || (user.is_active === false)) {
      return res.status(401).json({ message: 'Tài khoản người dùng hiện không hoạt động' });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      userId: user.id, // Add both formats to avoid issues
      email: user.email,
      role_id: user.role_id
    };
    req.token = token;
    next();
  } catch (error) {
    console.error('Lỗi xác thực middleware:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống nội bộ' });
  }
};

/**
 * Role checking middleware
 * @param {Array} roles - Array of role IDs that are allowed to access the route
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Yêu cầu xác thực' });
      }

      const userRole = req.user.role_id;
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({ message: 'Quyền truy cập bị từ chối: Không đủ quyền' });
      }

      next();
    } catch (error) {
      console.error('Lỗi kiểm tra quyền middleware:', error);
      res.status(500).json({ message: 'Lỗi hệ thống khi xác minh quyền' });
    }
  };
};

module.exports = {
  auth,
  checkRole
}; 