const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Coupon = require('../models/Coupon');
const { body, validationResult } = require('express-validator');

const enrollmentController = {
  // Enroll in a course
  enroll: async (req, res) => {
    try {
      // Validate input
      await body('course_id').isInt().withMessage('Course ID must be an integer').run(req);
      await body('coupon_code').optional().isString().withMessage('Invalid coupon code').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { course_id, coupon_code } = req.body;
      const user_id = req.user.id;

      // Check if course exists and get price
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if already enrolled
      const existing = await Enrollment.findByUserAndCourse(user_id, course_id);
      if (existing) {
        return res.status(400).json({ message: 'Already enrolled in this course' });
      }

      let coupon = null;
      let discount_amount = 0;
      let total_amount = course.price;

      // Apply coupon if provided
      if (coupon_code) {
        coupon = await Coupon.findByCode(coupon_code);
        if (coupon && coupon.is_active) {
          // Calculate discount
          if (coupon.discount_type === 'percentage') {
            discount_amount = (course.price * coupon.discount_value) / 100;
          } else {
            discount_amount = coupon.discount_value;
          }
          total_amount = course.price - discount_amount;
        }
      }

      // Create enrollment
      const enrollmentId = await Enrollment.create({
        user_id,
        course_id,
        coupon_id: coupon?.id,
        original_price: course.price,
        discount_amount,
        total_amount
      });

      res.status(201).json({
        message: 'Successfully enrolled in course',
        enrollment_id: enrollmentId
      });
    } catch (error) {
      console.error('Enrollment error:', error);
      res.status(500).json({ message: 'Error enrolling in course' });
    }
  },

  // Get all enrollments with filters
  getAll: async (req, res) => {
    try {
      const filters = {
        user_id: req.query.user_id,
        course_id: req.query.course_id,
        instructor_id: req.query.instructor_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      // Apply authorization checks
      if (req.user.role_id !== 3) { // Not admin
        if (req.user.role_id === 2) { // Instructor
          filters.instructor_id = req.user.id;
        } else { // Student
          filters.user_id = req.user.id;
        }
      }

      const enrollments = await Enrollment.findAll(filters);
      res.json({ enrollments });
    } catch (error) {
      console.error('Get enrollments error:', error);
      res.status(500).json({ message: 'Error fetching enrollments' });
    }
  },

  // Get enrollment by ID
  getById: async (req, res) => {
    try {
      const enrollment = await Enrollment.findById(req.params.id);
      
      if (!enrollment) {
        return res.status(404).json({ message: 'Enrollment not found' });
      }

      // Check authorization
      if (req.user.role_id !== 3 && // Not admin
          req.user.role_id !== 2 && // Not instructor
          req.user.id !== enrollment.user_id) { // Not the enrolled user
        return res.status(403).json({ message: 'Not authorized to view this enrollment' });
      }

      res.json({ enrollment });
    } catch (error) {
      console.error('Get enrollment error:', error);
      res.status(500).json({ message: 'Error fetching enrollment' });
    }
  },

  // Get course statistics
  getCourseStats: async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check if course exists and user has permission
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      if (req.user.role_id !== 3 && // Not admin
          req.user.id !== course.instructor_id) { // Not the course instructor
        return res.status(403).json({ message: 'Not authorized to view these statistics' });
      }

      const stats = await Enrollment.getCourseStats(courseId);
      res.json({ stats });
    } catch (error) {
      console.error('Get course stats error:', error);
      res.status(500).json({ message: 'Error fetching course statistics' });
    }
  },

  // Get instructor statistics
  getInstructorStats: async (req, res) => {
    try {
      const instructorId = req.params.instructorId || req.user.id;

      // Check authorization
      if (req.user.role_id !== 3 && // Not admin
          req.user.id !== instructorId) { // Not the instructor
        return res.status(403).json({ message: 'Not authorized to view these statistics' });
      }

      const stats = await Enrollment.getInstructorStats(instructorId);
      res.json({ stats });
    } catch (error) {
      console.error('Get instructor stats error:', error);
      res.status(500).json({ message: 'Error fetching instructor statistics' });
    }
  },

  // Unenroll from a course
  unenroll: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;

      const enrollment = await Enrollment.findByUserAndCourse(userId, courseId);
      if (!enrollment) {
        return res.status(404).json({ message: 'Enrollment not found' });
      }

      // Only allow admin or the enrolled user to unenroll
      if (req.user.role_id !== 3 && req.user.id !== enrollment.user_id) {
        return res.status(403).json({ message: 'Not authorized to unenroll' });
      }

      await Enrollment.delete(enrollment.id);
      res.json({ message: 'Successfully unenrolled from course' });
    } catch (error) {
      console.error('Unenroll error:', error);
      res.status(500).json({ message: 'Error unenrolling from course' });
    }
  }
};

module.exports = enrollmentController; 