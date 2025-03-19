const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

// Validation rules
const lessonValidation = [
  body('course_id')
    .isInt()
    .withMessage('ID khóa học không hợp lệ'),
  
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề bài học là bắt buộc')
    .isLength({ max: 255 })
    .withMessage('Tiêu đề không được vượt quá 255 ký tự'),
  
  body('video_url')
    .notEmpty()
    .withMessage('URL video là bắt buộc')
    .isURL()
    .withMessage('URL video không hợp lệ'),
  
  body('duration')
    .isInt({ min: 0 })
    .withMessage('Thời lượng phải là số dương'),
  
  body('order_number')
    .isInt({ min: 0 })
    .withMessage('Số thứ tự phải là số dương'),
  
  body('description')
    .optional()
    .trim()
];

const lessonController = {
  // Create new lesson
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      // Check if course exists and user is authorized
      const course = await Course.findById(req.body.course_id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }

      if (course.instructor_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền thêm bài học vào khóa học này' });
      }

      const lessonId = await Lesson.create(req.body);
      const newLesson = await Lesson.findById(lessonId);
      
      res.status(201).json({
        message: 'Tạo bài học thành công',
        data: newLesson
      });
    } catch (error) {
      console.error('Lỗi tạo bài học:', error);
      res.status(500).json({ message: 'Lỗi khi tạo bài học' });
    }
  },

  // Get all lessons for a course
  getByCourseId: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }

      const lessons = await Lesson.findByCourseId(courseId);
      res.json({
        message: 'Lấy danh sách bài học thành công',
        data: lessons
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách bài học theo khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách bài học' });
    }
  },

  // Get lesson by ID
  getById: async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: 'Không tìm thấy bài học' });
      }

      res.json({
        message: 'Lấy thông tin bài học thành công',
        data: lesson
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin bài học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin bài học' });
    }
  },

  // Update lesson
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const lessonId = req.params.id;
      
      // Check if lesson exists
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Không tìm thấy bài học' });
      }
      
      // Check if user is authorized (instructor of the course or admin)
      const course = await Course.findById(lesson.course_id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      if (course.instructor_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật bài học này' });
      }
      
      // Update lesson
      await Lesson.update(lessonId, req.body);
      
      // Get updated lesson
      const updatedLesson = await Lesson.findById(lessonId);
      
      res.json({
        message: 'Cập nhật bài học thành công',
        data: updatedLesson
      });
    } catch (error) {
      console.error('Lỗi cập nhật bài học:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật bài học' });
    }
  },

  // Delete lesson
  delete: async (req, res) => {
    try {
      const lessonId = req.params.id;
      
      // Check if lesson exists
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Không tìm thấy bài học' });
      }
      
      // Check if user is authorized (instructor of the course or admin)
      const course = await Course.findById(lesson.course_id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      if (course.instructor_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bài học này' });
      }
      
      // Delete lesson
      await Lesson.delete(lessonId);
      
      res.json({
        message: 'Xóa bài học thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa bài học:', error);
      res.status(500).json({ message: 'Lỗi khi xóa bài học' });
    }
  },

  // Reorder lessons in a course
  reorder: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { lessonOrders } = req.body;
      
      if (!Array.isArray(lessonOrders)) {
        return res.status(400).json({ message: 'Dữ liệu không hợp lệ, cần mảng lessonOrders' });
      }
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if user is authorized
      if (course.instructor_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền sắp xếp lại bài học cho khóa học này' });
      }
      
      // Reorder lessons
      await Lesson.reorder(courseId, lessonOrders);
      
      // Get updated lessons
      const updatedLessons = await Lesson.findByCourseId(courseId);
      
      res.json({
        message: 'Sắp xếp lại bài học thành công',
        data: updatedLessons
      });
    } catch (error) {
      console.error('Lỗi sắp xếp lại bài học:', error);
      res.status(500).json({ message: 'Lỗi khi sắp xếp lại bài học' });
    }
  },

  // Get next lesson
  getNext: async (req, res) => {
    try {
      const { courseId, currentLessonId } = req.params;
      
      const nextLesson = await Lesson.getNextLesson(courseId, currentLessonId);
      
      if (!nextLesson) {
        return res.status(404).json({ message: 'Không có bài học tiếp theo' });
      }
      
      res.json({
        message: 'Lấy bài học tiếp theo thành công',
        data: nextLesson
      });
    } catch (error) {
      console.error('Lỗi lấy bài học tiếp theo:', error);
      res.status(500).json({ message: 'Lỗi khi lấy bài học tiếp theo' });
    }
  },

  // Get previous lesson
  getPrevious: async (req, res) => {
    try {
      const { courseId, currentLessonId } = req.params;
      
      const previousLesson = await Lesson.getPreviousLesson(courseId, currentLessonId);
      
      if (!previousLesson) {
        return res.status(404).json({ message: 'Không có bài học trước đó' });
      }
      
      res.json({
        message: 'Lấy bài học trước đó thành công',
        data: previousLesson
      });
    } catch (error) {
      console.error('Lỗi lấy bài học trước đó:', error);
      res.status(500).json({ message: 'Lỗi khi lấy bài học trước đó' });
    }
  }
};

module.exports = {
  ...lessonController,
  lessonValidation
}; 