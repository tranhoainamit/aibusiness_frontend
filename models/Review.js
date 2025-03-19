const db = require('../config/database');
const { validationResult } = require('express-validator');

// Model đánh giá
const Review = {
  // Tạo đánh giá mới
  create: async (reviewData) => {
    try {
      const {
        user_id,
        course_id,
        rating,
        comment
      } = reviewData;

      // Validate dữ liệu đầu vào
      if (!user_id || !course_id || !rating) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Đánh giá phải từ 1 đến 5 sao');
      }

      // Kiểm tra xem người dùng đã đăng ký khóa học chưa
      const [enrollment] = await db.execute(
        'SELECT id FROM purchases WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );

      if (enrollment.length === 0) {
        throw new Error('Bạn phải đăng ký khóa học trước khi đánh giá');
      }

      // Kiểm tra xem người dùng đã đánh giá khóa học chưa
      const [existing] = await db.execute(
        'SELECT id FROM reviews WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );

      if (existing.length > 0) {
        throw new Error('Bạn đã đánh giá khóa học này rồi');
      }

      const [result] = await db.execute(
        `INSERT INTO reviews (
          user_id, course_id, rating, comment
        ) VALUES (?, ?, ?, ?)`,
        [
          user_id, course_id, rating, comment || ''
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo đánh giá:', error);
      throw new Error('Lỗi tạo đánh giá: ' + error.message);
    }
  },

  // Tìm đánh giá theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                u.username as user_name, u.full_name as user_full_name,
                c.title as course_title
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN courses c ON r.course_id = c.id
         WHERE r.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm đánh giá theo ID:', error);
      throw new Error('Lỗi tìm đánh giá: ' + error.message);
    }
  },

  // Tìm tất cả đánh giá của khóa học
  findByCourseId: async (courseId, filters = {}) => {
    try {
      let query = `
        SELECT r.*, 
                u.username as user_name, u.full_name as user_full_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.course_id = ?
      `;
      const params = [courseId];

      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      query += ' ORDER BY r.created_at DESC';

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số lượng cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM reviews r
        WHERE r.course_id = ?
      `;
      if (filters.rating) countQuery += ' AND r.rating = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        reviews: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách đánh giá:', error);
      throw new Error('Lỗi tìm danh sách đánh giá: ' + error.message);
    }
  },

  // Tìm tất cả đánh giá của người dùng
  findByUserId: async (userId, filters = {}) => {
    try {
      let query = `
        SELECT r.*, 
                c.title as course_title, c.thumbnail as course_thumbnail,
                c.instructor_id, u.username as instructor_name
        FROM reviews r
        JOIN courses c ON r.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE r.user_id = ?
      `;
      const params = [userId];

      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      query += ' ORDER BY r.created_at DESC';

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số lượng cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM reviews r
        WHERE r.user_id = ?
      `;
      if (filters.rating) countQuery += ' AND r.rating = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        reviews: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách đánh giá:', error);
      throw new Error('Lỗi tìm danh sách đánh giá: ' + error.message);
    }
  },

  // Tìm tất cả phản hồi của một đánh giá
  findReplies: async (reviewId) => {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                u.username as user_name, u.full_name as user_full_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.parent_id = ?
         ORDER BY r.created_at ASC`,
        [reviewId]
      );
      return rows;
    } catch (error) {
      console.error('Lỗi tìm danh sách phản hồi:', error);
      throw new Error('Lỗi tìm danh sách phản hồi: ' + error.message);
    }
  },

  // Cập nhật đánh giá
  update: async (id, reviewData) => {
    try {
      const allowedFields = ['rating', 'comment'];
      const updates = [];
      const values = [];

      // Validate rating
      if (reviewData.rating !== undefined) {
        if (reviewData.rating < 1 || reviewData.rating > 5) {
          throw new Error('Đánh giá phải từ 1 đến 5 sao');
        }
      }

      for (const field of allowedFields) {
        if (reviewData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(reviewData[field]);
        }
      }

      if (updates.length === 0) return false;

      values.push(id);
      const query = `
        UPDATE reviews SET 
        ${updates.join(', ')}, 
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật đánh giá:', error);
      throw new Error('Lỗi cập nhật đánh giá: ' + error.message);
    }
  },

  // Xóa đánh giá
  delete: async (id) => {
    try {
      const [result] = await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa đánh giá:', error);
      throw new Error('Lỗi xóa đánh giá: ' + error.message);
    }
  },

  // Lấy thống kê đánh giá của khóa học
  getCourseStats: async (courseId) => {
    try {
      const [rows] = await db.execute(
        `SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
         FROM reviews
         WHERE course_id = ?`,
        [courseId]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi lấy thống kê đánh giá:', error);
      throw new Error('Lỗi lấy thống kê đánh giá: ' + error.message);
    }
  },

  // Kiểm tra đánh giá có tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM reviews WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của đánh giá:', error);
      return false;
    }
  },

  // Kiểm tra người dùng đã đánh giá khóa học chưa
  hasReviewed: async (userId, courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM reviews WHERE user_id = ? AND course_id = ?) as exist',
        [userId, courseId]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đánh giá:', error);
      return false;
    }
  }
};

module.exports = Review; 