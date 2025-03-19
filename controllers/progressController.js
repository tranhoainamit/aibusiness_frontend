const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');

// Validation rules
const progressValidation = [
  body('progress_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Phần trăm tiến độ phải từ 0 đến 100'),
  
  body('is_completed')
    .isBoolean()
    .withMessage('Trạng thái hoàn thành phải là giá trị boolean')
];

// Update or create progress for a lesson
const updateProgress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { lessonId } = req.params;
    const userId = req.user.id;

    // Check if lesson exists
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học' });
    }

    // Check if user is enrolled in the course
    const course = await Course.findById(lesson.course_id);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
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
      message: 'Cập nhật tiến độ thành công',
      data: { progress_id: progressId }
    });
  } catch (error) {
    console.error('Lỗi cập nhật tiến độ:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật tiến độ' });
  }
};

// Get progress for a specific lesson
const getLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const progress = await Progress.findByUserAndLesson(userId, lessonId);
    if (!progress) {
      return res.json({
        message: 'Không có tiến độ cho bài học này',
        data: {
          progress_percentage: 0,
          is_completed: false,
          last_watched: null
        }
      });
    }

    res.json({
      message: 'Lấy tiến độ bài học thành công',
      data: progress
    });
  } catch (error) {
    console.error('Lỗi lấy tiến độ bài học:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tiến độ bài học' });
  }
};

// Get all progress for a course
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    }

    const progress = await Progress.findAll({
      user_id: userId,
      course_id: courseId
    });

    const courseProgress = await Progress.getCourseProgress(userId, courseId);
    const lastWatched = await Progress.getLastWatched(userId, courseId);

    res.json({
      message: 'Lấy tiến độ khóa học thành công',
      data: {
        lessons: progress,
        summary: courseProgress,
        last_watched: lastWatched
      }
    });
  } catch (error) {
    console.error('Lỗi lấy tiến độ khóa học:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tiến độ khóa học' });
  }
};

// Get all progress for a user
const getUserProgress = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Check authorization
    if (req.user.role_id !== 3 && req.user.id !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền xem tiến độ của người dùng này' });
    }

    const progress = await Progress.findAll({ user_id: userId });
    res.json({
      message: 'Lấy tiến độ người dùng thành công',
      data: progress
    });
  } catch (error) {
    console.error('Lỗi lấy tiến độ người dùng:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tiến độ người dùng' });
  }
};

// Reset progress for a lesson
const resetLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const progress = await Progress.findByUserAndLesson(userId, lessonId);
    if (!progress) {
      return res.status(404).json({ message: 'Không tìm thấy tiến độ' });
    }

    await Progress.delete(progress.id);
    res.json({ message: 'Đặt lại tiến độ thành công' });
  } catch (error) {
    console.error('Lỗi đặt lại tiến độ bài học:', error);
    res.status(500).json({ message: 'Lỗi khi đặt lại tiến độ' });
  }
};

// Get progress statistics for an instructor's courses
const getInstructorStats = async (req, res) => {
  try {
    const instructorId = req.params.instructorId || req.user.id;

    // Check authorization
    if (req.user.role_id !== 3 && req.user.id !== instructorId) {
      return res.status(403).json({ message: 'Bạn không có quyền xem thống kê này' });
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

    res.json({
      message: 'Lấy thống kê giảng viên thành công',
      data: { courseStats }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê giảng viên:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thống kê giảng viên' });
  }
};

module.exports = {
  updateProgress,
  getLessonProgress,
  getCourseProgress,
  getUserProgress,
  resetLessonProgress,
  getInstructorStats,
  progressValidation
}; 