const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

const lessonController = {
  // Create new lesson
  create: async (req, res) => {
    try {
      // Validate input
      await body('course_id').isInt().withMessage('Invalid course ID').run(req);
      await body('title').notEmpty().withMessage('Title is required').run(req);
      await body('video_url').notEmpty().withMessage('Video URL is required').run(req);
      await body('duration').isInt({ min: 0 }).withMessage('Duration must be a positive number').run(req);
      await body('order_number').isInt({ min: 0 }).withMessage('Order number must be a positive number').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if course exists and user is authorized
      const course = await Course.findById(req.body.course_id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      if (course.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to add lessons to this course' });
      }

      const lessonId = await Lesson.create(req.body);
      res.status(201).json({
        message: 'Lesson created successfully',
        lessonId
      });
    } catch (error) {
      console.error('Create lesson error:', error);
      res.status(500).json({ message: 'Error creating lesson' });
    }
  },

  // Get all lessons for a course
  getByCourseId: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const lessons = await Lesson.findByCourseId(courseId);
      res.json({ lessons });
    } catch (error) {
      console.error('Get lessons by course error:', error);
      res.status(500).json({ message: 'Error fetching lessons' });
    }
  },

  // Get lesson by ID
  getById: async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      res.json({ lesson });
    } catch (error) {
      console.error('Get lesson by id error:', error);
      res.status(500).json({ message: 'Error fetching lesson' });
    }
  },

  // Update lesson
  update: async (req, res) => {
    try {
      const lessonId = req.params.id;
      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Check if user is instructor or admin
      if (lesson.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to update this lesson' });
      }

      const updated = await Lesson.update(lessonId, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      res.json({ message: 'Lesson updated successfully' });
    } catch (error) {
      console.error('Update lesson error:', error);
      res.status(500).json({ message: 'Error updating lesson' });
    }
  },

  // Delete lesson
  delete: async (req, res) => {
    try {
      const lessonId = req.params.id;
      const lesson = await Lesson.findById(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Check if user is instructor or admin
      if (lesson.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to delete this lesson' });
      }

      const deleted = await Lesson.delete(lessonId);
      if (!deleted) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      res.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
      console.error('Delete lesson error:', error);
      res.status(500).json({ message: 'Error deleting lesson' });
    }
  },

  // Reorder lessons
  reorder: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { lessonIds } = req.body;

      if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
        return res.status(400).json({ message: 'Invalid lesson IDs array' });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is instructor or admin
      if (course.instructor_id !== req.user.id && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Not authorized to reorder lessons' });
      }

      await Lesson.reorderLessons(courseId, lessonIds);
      res.json({ message: 'Lessons reordered successfully' });
    } catch (error) {
      console.error('Reorder lessons error:', error);
      res.status(500).json({ message: 'Error reordering lessons' });
    }
  },

  // Get next lesson
  getNext: async (req, res) => {
    try {
      const { courseId, currentLessonId } = req.params;
      const nextLesson = await Lesson.getNextLesson(courseId, currentLessonId);

      if (!nextLesson) {
        return res.status(404).json({ message: 'No next lesson found' });
      }

      res.json({ lesson: nextLesson });
    } catch (error) {
      console.error('Get next lesson error:', error);
      res.status(500).json({ message: 'Error fetching next lesson' });
    }
  },

  // Get previous lesson
  getPrevious: async (req, res) => {
    try {
      const { courseId, currentLessonId } = req.params;
      const previousLesson = await Lesson.getPreviousLesson(courseId, currentLessonId);

      if (!previousLesson) {
        return res.status(404).json({ message: 'No previous lesson found' });
      }

      res.json({ lesson: previousLesson });
    } catch (error) {
      console.error('Get previous lesson error:', error);
      res.status(500).json({ message: 'Error fetching previous lesson' });
    }
  }
};

module.exports = lessonController; 