const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/course/:courseId', lessonController.getByCourseId);
router.get('/:id', lessonController.getById);

// Protected routes (require authentication)
router.post('/', auth, checkRole([2, 3]), lessonController.create); // Admin and instructors can create lessons
router.put('/:id', auth, lessonController.update); // Lesson owner or admin can update
router.delete('/:id', auth, lessonController.delete); // Lesson owner or admin can delete
router.put('/course/:courseId/reorder', auth, lessonController.reorder); // Course owner or admin can reorder lessons

// Navigation routes
router.get('/course/:courseId/lesson/:currentLessonId/next', auth, lessonController.getNext);
router.get('/course/:courseId/lesson/:currentLessonId/previous', auth, lessonController.getPrevious);

module.exports = router; 