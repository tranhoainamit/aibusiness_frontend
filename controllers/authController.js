const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role_id: user.role_id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Login controller
const login = async (req, res) => {
  try {
    // Validate input
    await body('email').isEmail().withMessage('Email không hợp lệ').run(req);
    await body('password').notEmpty().withMessage('Mật khẩu là bắt buộc').run(req);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Tài khoản chưa được kích hoạt' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Đăng nhập thành công',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Register controller
const register = async (req, res) => {
  try {
    // Validate input
    await body('username').notEmpty().withMessage('Tên đăng nhập là bắt buộc').run(req);
    await body('email').isEmail().withMessage('Email không hợp lệ').run(req);
    await body('password').isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự').run(req);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { username, email, password, full_name, phone, bio, role_id = 1 } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }

    // Check if username exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    // Create new user
    const userId = await User.create({
      username,
      email,
      password,
      full_name,
      phone,
      bio,
      role_id, // Default role: User
      status: 'active'
    });

    // Get user data without password
    const user = await User.findById(userId);
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Đăng ký thành công',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Verify token controller
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Không có token xác thực' });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    res.json({
      message: 'Xác thực token thành công',
      data: {
        user: {
          id: user.id,
          name: user.full_name || user.username,
          email: user.email,
          role_id: user.role_id,
          avatar: user.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('Lỗi xác thực token:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Refresh token controller
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Yêu cầu refresh token' });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Làm mới token thành công',
      data: tokens
    });
  } catch (error) {
    console.error('Lỗi làm mới token:', error);
    res.status(401).json({ message: 'Refresh token không hợp lệ' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Lấy thông tin người dùng thành công',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, bio } = req.body;
    const userId = req.user.id;

    const updated = await User.update(userId, {
      full_name,
      phone,
      bio
    });

    if (!updated) {
      return res.status(400).json({ message: 'Không có thông tin hợp lệ để cập nhật' });
    }

    const user = await User.findById(userId);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Cập nhật thông tin thành công',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Lỗi cập nhật thông tin:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user and verify current password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Update password
    const updated = await User.updatePassword(userId, newPassword);
    if (!updated) {
      return res.status(400).json({ message: 'Cập nhật mật khẩu thất bại' });
    }

    res.json({ message: 'Cập nhật mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
];

const registerValidation = [
  body('username').notEmpty().withMessage('Tên đăng nhập là bắt buộc'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự')
];

const passwordChangeValidation = [
  body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới ít nhất 6 ký tự')
];

const authController = {
  login,
  register,
  refreshToken,
  verifyToken,
  getProfile,
  updateProfile,
  changePassword
};

module.exports = {
  ...authController,
  loginValidation,
  registerValidation,
  passwordChangeValidation
}; 