const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * Các routes công khai - không cần xác thực
 */
// Lấy danh sách người dùng công khai
router.get('/', userController.publicGetAllUsers);

/**
 * Các routes yêu cầu xác thực người dùng
 */
// Lấy thông tin cá nhân của người dùng hiện tại
router.get('/profile', auth, userController.getProfile);

// Cập nhật thông tin cá nhân
router.put('/profile', auth, userController.updateProfile);

// Đổi mật khẩu
router.put('/change-password', auth, userController.changePassword);

// Xóa tài khoản
router.delete('/account', auth, userController.deleteAccount);

/**
 * Các routes dành cho quản trị viên (Admin)
 */
// Lấy tất cả người dùng (admin)
router.get('/admin/users', auth, checkRole([3]), userController.getAllUsers);

// Lấy thông tin người dùng theo ID (admin)
router.get('/admin/users/:id', auth, checkRole([3]), userController.getUserById);

// Cập nhật thông tin người dùng (admin)
router.put('/admin/users/:id', auth, checkRole([3]), userController.updateUser);

// Xóa người dùng (admin)
router.delete('/admin/users/:id', auth, checkRole([3]), userController.deleteUser);

module.exports = router; 