const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

/**
 * Routes xác thực người dùng
 */
// Đăng nhập
router.post('/login', authController.loginValidation, authController.login);

// Đăng ký tài khoản
router.post('/register', authController.registerValidation, authController.register);

// Làm mới token
router.post('/refresh', authController.refreshToken);

// Xác thực token
router.get('/verify', authController.verifyToken);

/**
 * Routes quản lý thông tin người dùng đã đăng nhập
 */
// Lấy thông tin cá nhân
router.get('/profile', auth, authController.getProfile);

// Cập nhật thông tin cá nhân
router.put('/profile', auth, authController.updateProfile);

// Đổi mật khẩu
router.put('/change-password', auth, authController.passwordChangeValidation, authController.changePassword);

module.exports = router; 