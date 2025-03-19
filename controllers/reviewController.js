const Review = require('../models/Review');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

// Validation rules
const reviewValidation = [
  body('course_id')
    .isInt()
    .withMessage('ID khóa học phải là số nguyên'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Đánh giá phải từ 1 đến 5 sao'),
  
  body('comment')
    .optional()
    .isString()
    .withMessage('Nội dung đánh giá phải là chuỗi ký tự')
];

const reviewController = {
  // Create a new review
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      const { course_id, rating, comment } = req.body;
      const user_id = req.user.id;

      // Check if course exists
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }

      // Check if user has already reviewed this course
      const existingReview = await Review.checkUserReview(user_id, course_id);
      if (existingReview) {
        return res.status(400).json({ message: 'Bạn đã đánh giá khóa học này rồi' });
      }

      const reviewId = await Review.create({
        user_id,
        course_id,
        rating,
        comment
      });

      // Get the newly created review
      const newReview = await Review.findById(reviewId);

      res.status(201).json({
        message: 'Tạo đánh giá thành công',
        data: newReview
      });
    } catch (error) {
      console.error('Lỗi tạo đánh giá:', error);
      res.status(500).json({ message: 'Lỗi khi tạo đánh giá' });
    }
  },

  // Get all reviews with filtering
  getAll: async (req, res) => {
    try {
      const { course_id, user_id, limit = 10, page = 1 } = req.query;
      
      const result = await Review.findAll({
        course_id,
        user_id,
        limit: parseInt(limit),
        page: parseInt(page)
      });
      
      res.json({
        message: 'Lấy danh sách đánh giá thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách đánh giá:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách đánh giá' });
    }
  },

  // Get review by ID
  getById: async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
      }
      
      res.json({
        message: 'Lấy thông tin đánh giá thành công',
        data: review
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin đánh giá:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin đánh giá' });
    }
  },

  // Update review
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }
      
      const reviewId = req.params.id;
      const { rating, comment } = req.body;
      const userId = req.user.id;
      
      // Check if review exists
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
      }
      
      // Check if the review belongs to the current user
      if (review.user_id !== userId) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật đánh giá này' });
      }
      
      // Update review
      const success = await Review.update(reviewId, { rating, comment });
      
      if (!success) {
        return res.status(400).json({ message: 'Cập nhật đánh giá thất bại' });
      }
      
      // Get updated review
      const updatedReview = await Review.findById(reviewId);
      
      res.json({
        message: 'Cập nhật đánh giá thành công',
        data: updatedReview
      });
    } catch (error) {
      console.error('Lỗi cập nhật đánh giá:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật đánh giá' });
    }
  },

  // Delete review
  delete: async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.user.id;
      
      // Check if review exists
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
      }
      
      // Check if the review belongs to the current user or user is admin
      if (review.user_id !== userId && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa đánh giá này' });
      }
      
      // Delete review
      const success = await Review.delete(reviewId);
      
      res.json({
        message: 'Xóa đánh giá thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa đánh giá:', error);
      res.status(500).json({ message: 'Lỗi khi xóa đánh giá' });
    }
  },

  // Get statistics for a course's reviews
  getCourseStats: async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      const stats = await Review.getStatsByCourse(courseId);
      
      res.json({
        message: 'Lấy thống kê đánh giá khóa học thành công',
        data: stats
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê đánh giá khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thống kê đánh giá khóa học' });
    }
  }
};

module.exports = {
  ...reviewController,
  reviewValidation
}; 