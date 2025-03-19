const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * Routes yêu cầu xác thực người dùng
 */
// Áp dụng middleware xác thực cho tất cả các route
router.use(auth);

/**
 * Routes quản lý đăng ký
 */
// Đăng ký khóa học
router.post('/enroll', enrollmentController.enrollValidation, enrollmentController.enroll);

// Hủy đăng ký khóa học
router.delete('/course/:courseId', enrollmentController.unenroll);

/**
 * Routes truy vấn đăng ký
 */
// Lấy danh sách đăng ký
router.get('/', enrollmentController.getAll);

// Lấy thông tin chi tiết đăng ký
router.get('/:id', enrollmentController.getById);

/**
 * Routes thống kê dành cho giảng viên và quản trị viên
 */
// Thống kê đăng ký theo khóa học
router.get('/course/:courseId/stats', checkRole([2, 3]), enrollmentController.getCourseStats);

// Thống kê đăng ký theo giảng viên
router.get('/instructor/:instructorId?/stats', checkRole([2, 3]), enrollmentController.getInstructorStats);

module.exports = router; 