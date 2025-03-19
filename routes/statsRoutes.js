const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/general', statsController.getGeneralStats);

// Protected routes
router.use(auth);

// Instructor stats
router.get('/instructor-courses', checkRole([2]), statsController.getInstructorCourses);
router.get('/instructor-students', checkRole([2]), statsController.getInstructorStudents);
router.get('/instructor-earnings', checkRole([2]), statsController.getInstructorEarningStats);

// Student stats
router.get('/student-courses', checkRole([1]), statsController.getStudentCourseStats);
router.get('/student-progress', checkRole([1]), statsController.getStudentProgressStats);
router.get('/student-certificates', checkRole([1]), statsController.getStudentCertificateStats);

// Admin stats
router.get('/users', checkRole([3]), statsController.getUserStats);
router.get('/courses', checkRole([3]), statsController.getCourseStats);
router.get('/revenue', checkRole([3]), statsController.getRevenueStats);

module.exports = router; 