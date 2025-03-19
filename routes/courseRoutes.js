const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * Routes công khai - không cần xác thực
 */
// Lấy danh sách tất cả khóa học
router.get('/', courseController.getAll);

// Lấy danh sách khóa học nổi bật
router.get('/featured', courseController.getFeaturedCourses);

// Lấy thông tin chi tiết khóa học theo ID
router.get('/:id', courseController.getById);

/**
 * Routes yêu cầu xác thực người dùng
 */
// Áp dụng middleware xác thực cho tất cả các route bên dưới
router.use(auth);

/**
 * Routes cho giảng viên và quản trị viên
 */
// Tạo khóa học mới
router.post('/', checkRole([2, 3]), courseController.courseValidation, courseController.create);

// Cập nhật khóa học
router.put('/:id', checkRole([2, 3]), courseController.courseValidation, courseController.update);

// Xóa khóa học
router.delete('/:id', checkRole([2, 3]), courseController.delete);

// Bật/tắt trạng thái xuất bản khóa học
router.patch('/:id/toggle-publish', checkRole([2, 3]), courseController.togglePublish);

/**
 * Routes cho học viên
 */
// Đăng ký khóa học
router.post('/:id/enroll', checkRole([1, 2, 3]), courseController.enroll);

// Lấy danh sách khóa học đã đăng ký
router.get('/user/enrolled', auth, courseController.getEnrolled);

module.exports = router; 