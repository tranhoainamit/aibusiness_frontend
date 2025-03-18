const Review = require('../models/Review');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

const reviewController = {
  // Create a new review
  create: async (req, res) => {
    try {
      // Validate input
      await body('course_id').isInt().withMessage('Course ID must be an integer').run(req);
      await body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').run(req);
      await body('comment').optional().isString().withMessage('Comment must be a string').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { course_id, rating, comment } = req.body;
      const user_id = req.user.id;

      // Check if course exists
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user has already reviewed this course
      const existingReview = await Review.checkUserReview(user_id, course_id);
      if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this course' });
      }

      const reviewId = await Review.create({
        user_id,
        course_id,
        rating,
        comment
      });

      res.status(201).json({
        message: 'Review created successfully',
        review_id: reviewId
      });
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({ message: 'Error creating review' });
    }
  },

  // Get all reviews with filters
  getAll: async (req, res) => {
    try {
      const filters = {
        course_id: req.query.course_id,
        user_id: req.query.user_id,
        rating: req.query.rating,
        min_rating: req.query.min_rating
      };

      const reviews = await Review.findAll(filters);
      res.json({ reviews });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({ message: 'Error fetching reviews' });
    }
  },

  // Get review by ID
  getById: async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      res.json({ review });
    } catch (error) {
      console.error('Get review error:', error);
      res.status(500).json({ message: 'Error fetching review' });
    }
  },

  // Update review
  update: async (req, res) => {
    try {
      // Validate input
      await body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').run(req);
      await body('comment').optional().isString().withMessage('Comment must be a string').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      // Check authorization
      if (req.user.role_id !== 3 && req.user.id !== review.user_id) {
        return res.status(403).json({ message: 'Not authorized to update this review' });
      }

      const updated = await Review.update(req.params.id, {
        rating: req.body.rating,
        comment: req.body.comment
      });

      if (!updated) {
        return res.status(404).json({ message: 'Review not found' });
      }

      res.json({ message: 'Review updated successfully' });
    } catch (error) {
      console.error('Update review error:', error);
      res.status(500).json({ message: 'Error updating review' });
    }
  },

  // Delete review
  delete: async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      // Check authorization
      if (req.user.role_id !== 3 && req.user.id !== review.user_id) {
        return res.status(403).json({ message: 'Not authorized to delete this review' });
      }

      await Review.delete(req.params.id);
      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Delete review error:', error);
      res.status(500).json({ message: 'Error deleting review' });
    }
  },

  // Get course review statistics
  getCourseStats: async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const stats = await Review.getCourseStats(courseId);
      res.json({ stats });
    } catch (error) {
      console.error('Get course stats error:', error);
      res.status(500).json({ message: 'Error fetching course statistics' });
    }
  }
};

module.exports = reviewController; 