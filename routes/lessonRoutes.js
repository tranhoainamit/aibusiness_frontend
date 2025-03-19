const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { auth, checkRole } = require('../middleware/auth');

/**
 * Routes công khai - không cần xác thực
 */
// Lấy danh sách bài học theo khóa học
router.get('/course/:courseId', lessonController.getByCourseId);

// Lấy thông tin chi tiết bài học theo ID
router.get('/:id', lessonController.getById);

/**
 * Routes yêu cầu xác thực người dùng
 */
// Áp dụng middleware xác thực cho tất cả các route bên dưới
router.use(auth);

/**
 * Routes cho giảng viên và quản trị viên
 */
// Tạo bài học mới
router.post('/', checkRole([2, 3]), lessonController.lessonValidation, lessonController.create);

// Cập nhật bài học
router.put('/:id', checkRole([2, 3]), lessonController.lessonValidation, lessonController.update);

// Xóa bài học
router.delete('/:id', checkRole([2, 3]), lessonController.delete);

// Sắp xếp lại thứ tự bài học
router.put('/course/:courseId/reorder', checkRole([2, 3]), lessonController.reorder);

/**
 * Routes cho điều hướng bài học
 */
// Lấy bài học tiếp theo
router.get('/course/:courseId/lesson/:currentLessonId/next', lessonController.getNext);

// Lấy bài học trước đó
router.get('/course/:courseId/lesson/:currentLessonId/previous', lessonController.getPrevious);

module.exports = router; 