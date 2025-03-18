const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

const courseController = {
  // Create new course
  create: async (req, res) => {
    try {
      // Validate input
      await body('title').notEmpty().withMessage('Title is required').run(req);
      await body('description').notEmpty().withMessage('Description is required').run(req);
      await body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number').run(req);
      await body('instructor_id').isInt().withMessage('Invalid instructor ID').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const courseData = {
        ...req.body,
        instructor_id: req.user.id // Set instructor as current user
      };

      const courseId = await Course.create(courseData);

      // Add categories if provided
      if (req.body.categories) {
        for (const categoryId of req.body.categories) {
          await Course.addCategory(courseId, categoryId);
        }
      }

      res.status(201).json({
        message: 'Course created successfully',
        courseId
      });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({ message: 'Error creating course' });
    }
  },

  // Get all courses with filters
  getAll: async (req, res) => {
    try {
      const filters = {
        instructor_id: req.query.instructor_id,
        level: req.query.level,
        is_published: req.query.is_published === 'true',
        search: req.query.search
      };

      const courses = await Course.findAll(filters);
      res.json({ courses });
    } catch (error) {
      console.error('Get all courses error:', error);
      res.status(500).json({ message: 'Error fetching courses' });
    }
  },

  // Get course by ID
  getById: async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Get course categories
      const categories = await Course.getCategories(course.id);
      course.categories = categories;

      res.json({ course });
    } catch (error) {
      console.error('Get course by id error:', error);
      res.status(500).json({ message: 'Error fetching course' });
    }
  },

  // Update course
  update: async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is instructor or admin
      if (course.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to update this course' });
      }

      const updated = await Course.update(courseId, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Update categories if provided
      if (req.body.categories) {
        // Remove existing categories
        const existingCategories = await Course.getCategories(courseId);
        for (const category of existingCategories) {
          await Course.removeCategory(courseId, category.id);
        }

        // Add new categories
        for (const categoryId of req.body.categories) {
          await Course.addCategory(courseId, categoryId);
        }
      }

      res.json({ message: 'Course updated successfully' });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ message: 'Error updating course' });
    }
  },

  // Delete course
  delete: async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is instructor or admin
      if (course.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to delete this course' });
      }

      const deleted = await Course.delete(courseId);
      if (!deleted) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ message: 'Error deleting course' });
    }
  },

  // Publish/Unpublish course
  togglePublish: async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is instructor or admin
      if (course.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to publish this course' });
      }

      const updated = await Course.update(courseId, {
        is_published: !course.is_published
      });

      if (!updated) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json({
        message: `Course ${course.is_published ? 'unpublished' : 'published'} successfully`
      });
    } catch (error) {
      console.error('Toggle publish error:', error);
      res.status(500).json({ message: 'Error toggling course publish status' });
    }
  }
};

module.exports = courseController; 