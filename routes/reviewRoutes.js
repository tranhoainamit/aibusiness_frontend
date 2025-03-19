const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');

/**
 * Routes yêu cầu xác thực người dùng
 */
// Áp dụng middleware xác thực cho tất cả các route
router.use(auth);

/**
 * Routes quản lý đánh giá
 */
// Tạo đánh giá mới
router.post('/', reviewController.reviewValidation, reviewController.create);

// Cập nhật đánh giá
router.put('/:id', reviewController.reviewValidation, reviewController.update);

// Xóa đánh giá
router.delete('/:id', reviewController.delete);

/**
 * Routes truy vấn đánh giá
 */
// Lấy danh sách đánh giá
router.get('/', reviewController.getAll);

// Lấy thông tin chi tiết đánh giá
router.get('/:id', reviewController.getById);

// Lấy thống kê đánh giá của khóa học
router.get('/course/:courseId/stats', reviewController.getCourseStats);

module.exports = router; 