const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { auth, checkRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Enrollment management
router.post('/enroll', enrollmentController.enroll);
router.delete('/course/:courseId', enrollmentController.unenroll);

// Enrollment retrieval
router.get('/', enrollmentController.getAll);
router.get('/:id', enrollmentController.getById);

// Statistics (restricted to instructors and admins)
router.get('/course/:courseId/stats', checkRole([2, 3]), enrollmentController.getCourseStats);
router.get('/instructor/:instructorId?/stats', checkRole([2, 3]), enrollmentController.getInstructorStats);

module.exports = router; 