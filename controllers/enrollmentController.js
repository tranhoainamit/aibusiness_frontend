const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Coupon = require('../models/Coupon');
const { body, validationResult } = require('express-validator');

// Validation rules
const enrollValidation = [
  body('course_id')
    .isInt()
    .withMessage('ID khóa học phải là một số nguyên'),
  
  body('coupon_code')
    .optional()
    .isString()
    .withMessage('Mã giảm giá không hợp lệ')
];

const enrollmentController = {
  // Enroll in a course
  enroll: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      const { course_id, coupon_code } = req.body;
      const user_id = req.user.id;

      // Check if course exists and get price
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }

      // Check if already enrolled
      const existing = await Enrollment.findByUserAndCourse(user_id, course_id);
      if (existing) {
        return res.status(400).json({ message: 'Bạn đã đăng ký khóa học này rồi' });
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

      // Ensure total is not negative
      if (total_amount < 0) total_amount = 0;

      // Create the enrollment
      const enrollmentId = await Enrollment.create({
        user_id,
        course_id,
        original_price: course.price,
        discount_amount,
        total_amount,
        coupon_id: coupon ? coupon.id : null
      });

      // Get the created enrollment
      const enrollment = await Enrollment.findById(enrollmentId);

      res.status(201).json({
        message: 'Đăng ký khóa học thành công',
        data: enrollment
      });
    } catch (error) {
      console.error('Lỗi đăng ký khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi đăng ký khóa học' });
    }
  },

  // Get all enrollments
  getAll: async (req, res) => {
    try {
      const { course_id, user_id, limit = 10, page = 1 } = req.query;
      
      // Only allow admins to see all enrollments or filter by user_id
      // Regular users can only see their own enrollments
      const queryUserId = req.user.role_id === 3 ? user_id : req.user.id;
      
      const result = await Enrollment.findAll({
        course_id,
        user_id: queryUserId,
        limit: parseInt(limit),
        page: parseInt(page)
      });
      
      res.json({
        message: 'Lấy danh sách đăng ký thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách đăng ký' });
    }
  },

  // Get enrollment by ID
  getById: async (req, res) => {
    try {
      const enrollmentId = req.params.id;
      const enrollment = await Enrollment.findById(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký' });
      }
      
      // Only allow users to see their own enrollments unless they are admins
      if (enrollment.user_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xem thông tin đăng ký này' });
      }
      
      res.json({
        message: 'Lấy thông tin đăng ký thành công',
        data: enrollment
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin đăng ký:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin đăng ký' });
    }
  },

  // Get course enrollment statistics
  getCourseStats: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if user is authorized (instructor of the course or admin)
      if (course.instructor_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xem thống kê của khóa học này' });
      }
      
      const stats = await Enrollment.getStatsByCourse(courseId);
      
      res.json({
        message: 'Lấy thống kê đăng ký khóa học thành công',
        data: stats
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê đăng ký khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thống kê đăng ký khóa học' });
    }
  },

  // Get instructor enrollment statistics
  getInstructorStats: async (req, res) => {
    try {
      const instructorId = req.params.instructorId || req.user.id;
      
      // Only allow instructor to see their own stats unless it's an admin
      if (instructorId !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xem thống kê của giảng viên khác' });
      }
      
      const stats = await Enrollment.getStatsByInstructor(instructorId);
      
      res.json({
        message: 'Lấy thống kê đăng ký của giảng viên thành công',
        data: stats
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê đăng ký của giảng viên:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thống kê đăng ký của giảng viên' });
    }
  },

  // Unenroll from a course
  unenroll: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const userId = req.user.id;
      
      // Check if enrollment exists
      const enrollment = await Enrollment.findByUserAndCourse(userId, courseId);
      if (!enrollment) {
        return res.status(404).json({ message: 'Bạn chưa đăng ký khóa học này' });
      }
      
      // Check if user is authorized (admin or the enrolled user)
      if (enrollment.user_id !== userId && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền hủy đăng ký khóa học của người khác' });
      }
      
      // Delete the enrollment
      const success = await Enrollment.delete(enrollment.id);
      
      res.json({
        message: 'Hủy đăng ký khóa học thành công'
      });
    } catch (error) {
      console.error('Lỗi hủy đăng ký khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi hủy đăng ký khóa học' });
    }
  }
};

module.exports = {
  ...enrollmentController,
  enrollValidation
}; 