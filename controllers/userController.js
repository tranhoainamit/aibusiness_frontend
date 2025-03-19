const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation rules
const userValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tên đăng nhập phải có từ 3 đến 50 ký tự')
    .matches(/^[a-zA-Z0-9_\.]+$/)
    .withMessage('Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới và dấu chấm'),
  
  body('email')
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ'),
  
  body('full_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Họ tên không được vượt quá 100 ký tự'),
  
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('Số điện thoại không được vượt quá 15 ký tự'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Tiểu sử không được vượt quá 1000 ký tự')
];

const passwordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

const userController = {
  // Lấy danh sách người dùng công khai
  publicGetAllUsers: async (req, res) => {
    try {
      const { limit = 10, page = 1 } = req.query;
      const offset = (page - 1) * limit;
      
      // Chỉ lấy người dùng có vai trò giảng viên (role_id = 2) và đang active
      const query = `
        SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.role_id = 2 AND u.status = 'active'
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const [users] = await db.execute(query, [parseInt(limit), offset]);
      
      // Lấy tổng số lượng người dùng giảng viên
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM users WHERE role_id = 2 AND status = "active"'
      );
      
      const total = countResult[0].total;
      
      res.json({
        message: 'Lấy danh sách người dùng thành công',
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        message: 'Lấy thông tin người dùng thành công',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      const userId = req.user.id;
      const { full_name, phone, avatar_url, bio } = req.body;

      const updateData = {
        full_name,
        phone,
        avatar_url,
        bio
      };

      const success = await User.update(userId, updateData);
      if (!success) {
        return res.status(400).json({ message: 'Không có trường hợp lệ để cập nhật' });
      }

      // Get updated user data
      const updatedUser = await User.findById(userId);
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({
        message: 'Cập nhật thông tin người dùng thành công',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Lỗi cập nhật thông tin người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật thông tin người dùng' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updateData = { password: hashedPassword };
      const success = await User.update(userId, updateData);

      if (!success) {
        return res.status(400).json({ message: 'Không thể cập nhật mật khẩu' });
      }

      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      res.status(500).json({ message: 'Lỗi khi đổi mật khẩu' });
    }
  },

  // Delete account
  deleteAccount: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
      
      // Delete user
      const success = await User.delete(userId);
      if (!success) {
        return res.status(400).json({ message: 'Không thể xóa tài khoản' });
      }
      
      res.json({ message: 'Xóa tài khoản thành công' });
    } catch (error) {
      console.error('Lỗi xóa tài khoản:', error);
      res.status(500).json({ message: 'Lỗi khi xóa tài khoản' });
    }
  },

  // Admin: Get all users
  getAllUsers: async (req, res) => {
    try {
      const { limit = 10, page = 1, search = '', role_id, status } = req.query;
      const offset = (page - 1) * limit;
      
      // Build query parts
      let query = `
        SELECT u.*, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Add search condition if provided
      if (search) {
        query += ` AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
      
      // Add role filter if provided
      if (role_id) {
        query += ` AND u.role_id = ?`;
        params.push(role_id);
      }
      
      // Add status filter if provided
      if (status) {
        query += ` AND u.status = ?`;
        params.push(status);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
      
      // Execute query
      const [users] = await db.execute(query, params);
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Count total users with the same filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE 1=1
      `;
      
      const countParams = [];
      
      // Add the same filters to count query
      if (search) {
        countQuery += ` AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }
      
      if (role_id) {
        countQuery += ` AND u.role_id = ?`;
        countParams.push(role_id);
      }
      
      if (status) {
        countQuery += ` AND u.status = ?`;
        countParams.push(status);
      }
      
      // Execute count query
      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      res.json({
        message: 'Lấy danh sách người dùng thành công',
        data: {
          users: usersWithoutPasswords,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng' });
    }
  },

  // Admin: Get user by ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get user with role information
      const user = await User.findById(id, true);
      
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        message: 'Lấy thông tin người dùng thành công',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
    }
  },

  // Admin: Update user
  updateUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }
      
      const { id } = req.params;
      const { username, email, full_name, phone, avatar_url, bio, role_id, status } = req.body;
      
      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
      
      // Prepare update data
      const updateData = {};
      
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (bio !== undefined) updateData.bio = bio;
      if (role_id !== undefined) updateData.role_id = role_id;
      if (status !== undefined) updateData.status = status;
      
      // Update user
      const success = await User.update(id, updateData);
      
      if (!success) {
        return res.status(400).json({ message: 'Không có trường hợp lệ để cập nhật' });
      }
      
      // Get updated user data
      const updatedUser = await User.findById(id, true);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json({
        message: 'Cập nhật thông tin người dùng thành công',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Lỗi cập nhật thông tin người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật thông tin người dùng' });
    }
  },

  // Admin: Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
      
      // Delete user
      const success = await User.delete(id);
      
      if (!success) {
        return res.status(400).json({ message: 'Không thể xóa người dùng' });
      }
      
      res.json({ message: 'Xóa người dùng thành công' });
    } catch (error) {
      console.error('Lỗi xóa người dùng:', error);
      res.status(500).json({ message: 'Lỗi khi xóa người dùng' });
    }
  },

  userValidation,
  passwordValidation
};

module.exports = userController; 