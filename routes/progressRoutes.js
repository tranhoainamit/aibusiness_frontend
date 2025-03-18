const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { auth, checkRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Progress tracking
router.put('/lesson/:lessonId', progressController.updateProgress);
router.delete('/lesson/:lessonId', progressController.resetLessonProgress);

// Progress retrieval
router.get('/lesson/:lessonId', progressController.getLessonProgress);
router.get('/course/:courseId', progressController.getCourseProgress);
router.get('/user/:userId?', progressController.getUserProgress);

// Instructor statistics (restricted to instructors and admins)
router.get('/instructor/:instructorId?/stats', checkRole([2, 3]), progressController.getInstructorStats);

module.exports = router; 