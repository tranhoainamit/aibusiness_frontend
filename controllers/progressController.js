const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

const progressController = {
  // Update or create progress for a lesson
  updateProgress: async (req, res) => {
    try {
      // Validate input
      await body('progress_percentage').isFloat({ min: 0, max: 100 }).withMessage('Progress percentage must be between 0 and 100').run(req);
      await body('is_completed').isBoolean().withMessage('is_completed must be a boolean').run(req);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { lessonId } = req.params;
      const userId = req.user.id;

      // Check if lesson exists
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Check if user is enrolled in the course
      const course = await Course.findById(lesson.course_id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const progressId = await Progress.updateOrCreate(
        userId,
        course.id,
        lessonId,
        {
          progress_percentage: req.body.progress_percentage,
          is_completed: req.body.is_completed
        }
      );

      res.json({
        message: 'Progress updated successfully',
        progress_id: progressId
      });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ message: 'Error updating progress' });
    }
  },

  // Get progress for a specific lesson
  getLessonProgress: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;

      const progress = await Progress.findByUserAndLesson(userId, lessonId);
      if (!progress) {
        return res.json({
          progress_percentage: 0,
          is_completed: false,
          last_watched: null
        });
      }

      res.json(progress);
    } catch (error) {
      console.error('Get lesson progress error:', error);
      res.status(500).json({ message: 'Error fetching lesson progress' });
    }
  },

  // Get all progress for a course
  getCourseProgress: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;

      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const progress = await Progress.findAll({
        user_id: userId,
        course_id: courseId
      });

      const courseProgress = await Progress.getCourseProgress(userId, courseId);
      const lastWatched = await Progress.getLastWatched(userId, courseId);

      res.json({
        lessons: progress,
        summary: courseProgress,
        last_watched: lastWatched
      });
    } catch (error) {
      console.error('Get course progress error:', error);
      res.status(500).json({ message: 'Error fetching course progress' });
    }
  },

  // Get all progress for a user
  getUserProgress: async (req, res) => {
    try {
      const userId = req.params.userId || req.user.id;

      // Check authorization
      if (req.user.role_id !== 3 && req.user.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this user\'s progress' });
      }

      const progress = await Progress.findAll({ user_id: userId });
      res.json({ progress });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Error fetching user progress' });
    }
  },

  // Reset progress for a lesson
  resetLessonProgress: async (req, res) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;

      const progress = await Progress.findByUserAndLesson(userId, lessonId);
      if (!progress) {
        return res.status(404).json({ message: 'Progress not found' });
      }

      await Progress.delete(progress.id);
      res.json({ message: 'Progress reset successfully' });
    } catch (error) {
      console.error('Reset lesson progress error:', error);
      res.status(500).json({ message: 'Error resetting progress' });
    }
  },

  // Get progress statistics for an instructor's courses
  getInstructorStats: async (req, res) => {
    try {
      const instructorId = req.params.instructorId || req.user.id;

      // Check authorization
      if (req.user.role_id !== 3 && req.user.id !== instructorId) {
        return res.status(403).json({ message: 'Not authorized to view these statistics' });
      }

      // Get all courses by instructor
      const courses = await Course.findAll({ instructor_id: instructorId });
      
      // Get progress stats for each course
      const courseStats = await Promise.all(
        courses.map(async (course) => {
          const progress = await Progress.findAll({ course_id: course.id });
          const uniqueStudents = new Set(progress.map(p => p.user_id));
          
          return {
            course_id: course.id,
            course_title: course.title,
            total_students: uniqueStudents.size,
            average_progress: progress.length > 0 
              ? progress.reduce((sum, p) => sum + p.progress_percentage, 0) / progress.length 
              : 0,
            completed_students: progress.filter(p => p.is_completed).length
          };
        })
      );

      res.json({ courseStats });
    } catch (error) {
      console.error('Get instructor stats error:', error);
      res.status(500).json({ message: 'Error fetching instructor statistics' });
    }
  }
};

module.exports = progressController; 