const db = require('../config/database');
const { validationResult } = require('express-validator');

// Model bình luận
const Comment = {
  // Tạo bình luận mới
  create: async (commentData) => {
    try {
      const {
        user_id,
        item_id,
        item_type,
        content,
        parent_id,
        is_approved
      } = commentData;

      // Validate dữ liệu đầu vào
      if (!user_id || !item_id || !item_type || !content) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Validate loại item
      const validTypes = ['course', 'post'];
      if (!validTypes.includes(item_type)) {
        throw new Error('Loại item không hợp lệ');
      }

      const [result] = await db.execute(
        `INSERT INTO comments (
          user_id, item_id, item_type, content, parent_id, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          item_id,
          item_type,
          content,
          parent_id || null,
          is_approved || false
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo bình luận:', error);
      throw new Error('Lỗi tạo bình luận: ' + error.message);
    }
  },

  // Tìm bình luận theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, 
                u.username as user_name, u.full_name as user_full_name,
                CASE 
                  WHEN c.item_type = 'course' THEN co.title
                  WHEN c.item_type = 'post' THEN p.title
                END as item_title
         FROM comments c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN courses co ON c.item_type = 'course' AND c.item_id = co.id
         LEFT JOIN posts p ON c.item_type = 'post' AND c.item_id = p.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm bình luận theo ID:', error);
      throw new Error('Lỗi tìm bình luận: ' + error.message);
    }
  },

  // Tìm tất cả bình luận của một item
  findByItemId: async (itemId, itemType, filters = {}) => {
    try {
      let query = `
        SELECT c.*, 
                u.username as user_name, u.full_name as user_full_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.item_id = ? AND c.item_type = ? AND c.parent_id IS NULL
      `;
      const params = [itemId, itemType];

      if (filters.is_approved !== undefined) {
        query += ' AND c.is_approved = ?';
        params.push(filters.is_approved);
      }

      query += ' ORDER BY c.created_at DESC';

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
        FROM comments c
        WHERE c.item_id = ? AND c.item_type = ? AND c.parent_id IS NULL
      `;
      if (filters.is_approved !== undefined) countQuery += ' AND c.is_approved = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        comments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách bình luận:', error);
      throw new Error('Lỗi tìm danh sách bình luận: ' + error.message);
    }
  },

  // Tìm tất cả bình luận của người dùng
  findByUserId: async (userId, filters = {}) => {
    try {
      let query = `
        SELECT c.*, 
                CASE 
                  WHEN c.item_type = 'course' THEN co.title
                  WHEN c.item_type = 'post' THEN p.title
                END as item_title,
                CASE 
                  WHEN c.item_type = 'course' THEN co.slug
                  WHEN c.item_type = 'post' THEN p.slug
                END as item_slug
        FROM comments c
        LEFT JOIN courses co ON c.item_type = 'course' AND c.item_id = co.id
        LEFT JOIN posts p ON c.item_type = 'post' AND c.item_id = p.id
        WHERE c.user_id = ?
      `;
      const params = [userId];

      if (filters.item_type) {
        query += ' AND c.item_type = ?';
        params.push(filters.item_type);
      }

      if (filters.is_approved !== undefined) {
        query += ' AND c.is_approved = ?';
        params.push(filters.is_approved);
      }

      query += ' ORDER BY c.created_at DESC';

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
        FROM comments c
        WHERE c.user_id = ?
      `;
      if (filters.item_type) countQuery += ' AND c.item_type = ?';
      if (filters.is_approved !== undefined) countQuery += ' AND c.is_approved = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        comments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách bình luận:', error);
      throw new Error('Lỗi tìm danh sách bình luận: ' + error.message);
    }
  },

  // Tìm tất cả phản hồi của một bình luận
  findReplies: async (commentId) => {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, 
                u.username as user_name, u.full_name as user_full_name
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC`,
        [commentId]
      );
      return rows;
    } catch (error) {
      console.error('Lỗi tìm danh sách phản hồi:', error);
      throw new Error('Lỗi tìm danh sách phản hồi: ' + error.message);
    }
  },

  // Cập nhật bình luận
  update: async (id, commentData) => {
    try {
      const allowedFields = ['content', 'is_approved'];
      const updates = [];
      const values = [];

      for (const field of allowedFields) {
        if (commentData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(commentData[field]);
        }
      }

      if (updates.length === 0) return false;

      values.push(id);
      const query = `
        UPDATE comments SET 
        ${updates.join(', ')}, 
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật bình luận:', error);
      throw new Error('Lỗi cập nhật bình luận: ' + error.message);
    }
  },

  // Xóa bình luận
  delete: async (id) => {
    try {
      // Xóa tất cả phản hồi trước
      await db.execute('DELETE FROM comments WHERE parent_id = ?', [id]);
      
      // Xóa bình luận chính
      const [result] = await db.execute('DELETE FROM comments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa bình luận:', error);
      throw new Error('Lỗi xóa bình luận: ' + error.message);
    }
  },

  // Lấy số lượng bình luận của một item
  getItemCommentCount: async (itemId, itemType) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM comments WHERE item_id = ? AND item_type = ?',
        [itemId, itemType]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Lỗi lấy số lượng bình luận:', error);
      throw new Error('Lỗi lấy số lượng bình luận: ' + error.message);
    }
  },

  // Kiểm tra bình luận có tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM comments WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của bình luận:', error);
      return false;
    }
  }
};

module.exports = Comment; 