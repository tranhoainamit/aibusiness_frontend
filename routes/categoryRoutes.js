const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * ROUTES CÔNG KHAI - Không yêu cầu xác thực
 */
// Lấy tất cả danh mục
router.get('/', categoryController.getAll);

// Lấy cấu trúc cây danh mục
router.get('/tree', categoryController.getTree);

// Lấy thống kê về danh mục
router.get('/stats', categoryController.getStats);

// Lấy thông tin chi tiết một danh mục
router.get('/:id', categoryController.getById);

/**
 * ROUTES ĐƯỢC BẢO VỆ - Yêu cầu xác thực
 */
router.use(auth);

/**
 * ROUTES QUẢN TRỊ - Chỉ dành cho Admin (role_id = 3)
 */
// Tạo danh mục mới
router.post('/', checkRole([3]), categoryController.categoryValidation, categoryController.create);

// Cập nhật danh mục
router.put('/:id', checkRole([3]), categoryController.categoryValidation, categoryController.update);

// Xóa danh mục
router.delete('/:id', checkRole([3]), categoryController.delete);

module.exports = router;