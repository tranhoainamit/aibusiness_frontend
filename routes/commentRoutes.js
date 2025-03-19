const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * Routes công khai - không cần xác thực
 */
// Lấy danh sách bình luận
router.get('/', commentController.getAll);

// Lấy số lượng bình luận
router.get('/counts', commentController.getCounts);

// Lấy chi tiết bình luận theo ID
router.get('/:id', commentController.getById);

// Lấy danh sách phản hồi cho bình luận
router.get('/:id/replies', commentController.getReplies);

/**
 * Routes yêu cầu xác thực người dùng
 */
// Áp dụng middleware xác thực cho tất cả các route bên dưới
router.use(auth);

/**
 * Routes quản lý bình luận
 */
// Tạo bình luận mới
router.post('/', commentController.commentValidation, commentController.create);

// Cập nhật bình luận - chỉ chủ sở hữu bình luận hoặc admin có thể cập nhật
router.put('/:id', commentController.updateValidation, commentController.update);

// Xóa bình luận - chỉ chủ sở hữu bình luận hoặc admin có thể xóa
router.delete('/:id', commentController.delete);

module.exports = router; 