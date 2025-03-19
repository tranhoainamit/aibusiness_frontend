const Course = require('../models/Course');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation rules
const courseValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề khóa học là bắt buộc')
    .isLength({ max: 255 })
    .withMessage('Tiêu đề không được vượt quá 255 ký tự'),
  
  body('description')
    .notEmpty()
    .withMessage('Mô tả khóa học là bắt buộc'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số dương'),
  
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Cấp độ khóa học không hợp lệ'),
  
  body('is_published')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái xuất bản phải là boolean')
];

const courseController = {
  // Create new course
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      // Đảm bảo dữ liệu khóa học phù hợp với schema
      const courseData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        sale_price: req.body.sale_price || null,
        thumbnail: req.body.thumbnail || null,
        instructor_id: req.user.id, // Set instructor as current user
        level: req.body.level || 'beginner',
        meta_title: req.body.meta_title || req.body.title,
        meta_description: req.body.meta_description || req.body.description,
        slug: req.body.slug || req.body.title.toLowerCase().replace(/\s+/g, '-'),
        canonical_url: req.body.canonical_url || null,
        is_published: req.body.is_published || false
      };

      const courseId = await Course.create(courseData);

      // Add categories if provided
      if (req.body.categories && Array.isArray(req.body.categories)) {
        for (const categoryId of req.body.categories) {
          await Course.addCategory(courseId, categoryId);
        }
      }

      // Lấy thông tin khóa học vừa tạo
      const newCourse = await Course.findById(courseId);

      res.status(201).json({
        message: 'Tạo khóa học thành công',
        data: newCourse
      });
    } catch (error) {
      console.error('Lỗi tạo khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi tạo khóa học' });
    }
  },

  // Get all courses with filters
  getAll: async (req, res) => {
    try {
      const { featured, limit = 10, page = 1, category, search } = req.query;
      
      // Xây dựng câu truy vấn
      let query = `
        SELECT c.*, 
               u.full_name as instructor_name, 
               u.avatar_url as instructor_avatar,
               COUNT(DISTINCT r.id) as review_count,
               AVG(r.rating) as average_rating
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN reviews r ON c.id = r.course_id
      `;

      const params = [];
      const conditions = ['c.is_published = 1'];

      if (featured) {
        conditions.push('c.is_featured = 1');
      }

      if (category) {
        conditions.push('c.id IN (SELECT course_id FROM category_items WHERE category_id = ?)');
        params.push(category);
      }

      if (search) {
        conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY c.id';
      query += ' ORDER BY c.created_at DESC';
      
      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [courses] = await db.execute(query, params);

      // Get total count for pagination
      const [countResult] = await db.execute(
        `SELECT COUNT(DISTINCT c.id) as total FROM courses c ${
          conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
        }`,
        params.slice(0, -2)
      );

      // Get categories for each course
      for (let course of courses) {
        const [categories] = await db.execute(
          `SELECT c.* FROM categories c
           INNER JOIN category_items ci ON c.id = ci.category_id
           WHERE ci.item_id = ? AND ci.item_type = 'course'`,
          [course.id]
        );
        course.categories = categories;
      }

      const total = countResult[0].total;

      res.json({
        message: 'Lấy danh sách khóa học thành công',
        data: {
          courses,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách khóa học' });
    }
  },

  // Get course by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const course = await Course.findById(id);
      
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // If course is not published, check if user is instructor or admin
      if (!course.is_published) {
        // If not authenticated or not the instructor/admin
        if (!req.user || (req.user.id !== course.instructor_id && req.user.role_id !== 3)) {
          return res.status(403).json({ message: 'Khóa học chưa được công bố' });
        }
      }
      
      // Get lessons
      const lessons = await Course.getLessons(id);
      course.lessons = lessons;
      
      // Get categories
      const categories = await Course.getCategories(id);
      course.categories = categories;
      
      res.json({
        message: 'Lấy thông tin khóa học thành công',
        data: course
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin khóa học' });
    }
  },

  // Update course
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }
      
      const { id } = req.params;
      
      // Check if course exists
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if user is the instructor or admin
      if (req.user.id !== course.instructor_id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật khóa học này' });
      }
      
      // Update course data
      const courseData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        sale_price: req.body.sale_price,
        thumbnail: req.body.thumbnail,
        level: req.body.level,
        meta_title: req.body.meta_title,
        meta_description: req.body.meta_description,
        slug: req.body.slug,
        canonical_url: req.body.canonical_url,
        is_published: req.body.is_published
      };
      
      // Remove undefined fields
      Object.keys(courseData).forEach(key => 
        courseData[key] === undefined && delete courseData[key]
      );
      
      const success = await Course.update(id, courseData);
      
      // Update categories if provided
      if (req.body.categories && Array.isArray(req.body.categories)) {
        await Course.clearCategories(id);
        for (const categoryId of req.body.categories) {
          await Course.addCategory(id, categoryId);
        }
      }
      
      // Get updated course
      const updatedCourse = await Course.findById(id);
      
      res.json({
        message: 'Cập nhật khóa học thành công',
        data: updatedCourse
      });
    } catch (error) {
      console.error('Lỗi cập nhật khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật khóa học' });
    }
  },

  // Delete course
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if course exists
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if user is the instructor or admin
      if (req.user.id !== course.instructor_id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa khóa học này' });
      }
      
      const success = await Course.delete(id);
      
      res.json({ message: 'Xóa khóa học thành công' });
    } catch (error) {
      console.error('Lỗi xóa khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi xóa khóa học' });
    }
  },

  // Toggle publish status
  togglePublish: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if course exists
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if user is the instructor or admin
      if (req.user.id !== course.instructor_id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền thay đổi trạng thái khóa học này' });
      }
      
      // Toggle publish status
      const newStatus = !course.is_published;
      const success = await Course.update(id, { is_published: newStatus });
      
      res.json({
        message: `Khóa học đã được ${newStatus ? 'xuất bản' : 'ẩn'}`,
        data: { is_published: newStatus }
      });
    } catch (error) {
      console.error('Lỗi thay đổi trạng thái khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi thay đổi trạng thái khóa học' });
    }
  },

  // Get featured courses
  getFeaturedCourses: async (req, res) => {
    try {
      const { limit = 6 } = req.query;
      
      const courses = await Course.findFeatured(parseInt(limit));
      
      res.json({
        message: 'Lấy danh sách khóa học nổi bật thành công',
        data: courses
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách khóa học nổi bật:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách khóa học nổi bật' });
    }
  },

  // Enroll in course
  enroll: async (req, res) => {
    try {
      const courseId = req.params.id;
      const userId = req.user.id;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học' });
      }
      
      // Check if course is published
      if (!course.is_published) {
        return res.status(403).json({ message: 'Khóa học chưa được xuất bản' });
      }
      
      // Check if already enrolled
      const isEnrolled = await Course.isUserEnrolled(userId, courseId);
      if (isEnrolled) {
        return res.status(400).json({ message: 'Bạn đã đăng ký khóa học này' });
      }
      
      // Create enrollment
      const enrollmentId = await Course.enrollUser(userId, courseId);
      
      res.status(201).json({
        message: 'Đăng ký khóa học thành công',
        data: { 
          enrollment_id: enrollmentId,
          course_id: parseInt(courseId),
          user_id: userId
        }
      });
    } catch (error) {
      console.error('Lỗi đăng ký khóa học:', error);
      res.status(500).json({ message: 'Lỗi khi đăng ký khóa học' });
    }
  },

  // Get enrolled courses for current user
  getEnrolled: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await Course.findEnrolledByUser(userId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      res.json({
        message: 'Lấy danh sách khóa học đã đăng ký thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách khóa học đã đăng ký:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách khóa học đã đăng ký' });
    }
  }
};

module.exports = {
  ...courseController,
  courseValidation
}; 