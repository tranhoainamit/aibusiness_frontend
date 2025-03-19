const db = require('../config/database');
const { validationResult } = require('express-validator');

// Model thông báo
const Notification = {
  // Tạo thông báo mới
  create: async (notificationData) => {
    try {
      const {
        user_id,
        title,
        message,
        type,
        link,
        is_read = false
      } = notificationData;

      // Validate dữ liệu đầu vào
      if (!user_id || !title || !message || !type) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Validate loại thông báo
      const validTypes = ['system', 'course', 'payment'];
      if (!validTypes.includes(type)) {
        throw new Error('Loại thông báo không hợp lệ');
      }

      const [result] = await db.execute(
        `INSERT INTO notifications (
          user_id, title, message, type, link, is_read
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          title,
          message,
          type,
          link || null,
          is_read
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo thông báo:', error);
      throw new Error('Lỗi tạo thông báo: ' + error.message);
    }
  },

  // Tạo thông báo cho nhiều người dùng
  createMany: async (userIds, notificationData) => {
    try {
      const {
        title,
        message,
        type,
        link
      } = notificationData;

      // Validate dữ liệu đầu vào
      if (!userIds.length || !title || !message || !type) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Validate loại thông báo
      const validTypes = ['system', 'course', 'payment'];
      if (!validTypes.includes(type)) {
        throw new Error('Loại thông báo không hợp lệ');
      }

      const values = userIds.map(userId => [
        userId,
        title,
        message,
        type,
        link || null,
        false
      ]);

      const [result] = await db.query(
        `INSERT INTO notifications (
          user_id, title, message, type, link, is_read
        ) VALUES ?`,
        [values]
      );

      return result.affectedRows;
    } catch (error) {
      console.error('Lỗi tạo thông báo hàng loạt:', error);
      throw new Error('Lỗi tạo thông báo hàng loạt: ' + error.message);
    }
  },

  // Tìm thông báo theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        `SELECT n.*, 
                u.username as user_name, u.full_name as user_full_name
         FROM notifications n
         JOIN users u ON n.user_id = u.id
         WHERE n.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm thông báo theo ID:', error);
      throw new Error('Lỗi tìm thông báo: ' + error.message);
    }
  },

  // Tìm tất cả thông báo của người dùng
  findByUserId: async (userId, filters = {}) => {
    try {
      let query = `
        SELECT n.*, 
                u.username as user_name, u.full_name as user_full_name
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.user_id = ?
      `;
      const params = [userId];

      if (filters.type) {
        query += ' AND n.type = ?';
        params.push(filters.type);
      }

      if (filters.is_read !== undefined) {
        query += ' AND n.is_read = ?';
        params.push(filters.is_read);
      }

      query += ' ORDER BY n.created_at DESC';

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
        FROM notifications n
        WHERE n.user_id = ?
      `;
      if (filters.type) countQuery += ' AND n.type = ?';
      if (filters.is_read !== undefined) countQuery += ' AND n.is_read = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        notifications: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách thông báo:', error);
      throw new Error('Lỗi tìm danh sách thông báo: ' + error.message);
    }
  },

  // Cập nhật thông báo
  update: async (id, notificationData) => {
    try {
      const allowedFields = ['title', 'message', 'type', 'link', 'is_read'];
      const updates = [];
      const values = [];

      // Validate loại thông báo
      if (notificationData.type) {
        const validTypes = ['system', 'course', 'payment'];
        if (!validTypes.includes(notificationData.type)) {
          throw new Error('Loại thông báo không hợp lệ');
        }
      }

      for (const field of allowedFields) {
        if (notificationData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(notificationData[field]);
        }
      }

      if (updates.length === 0) return false;

      values.push(id);
      const query = `
        UPDATE notifications SET 
        ${updates.join(', ')}
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật thông báo:', error);
      throw new Error('Lỗi cập nhật thông báo: ' + error.message);
    }
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: async (id) => {
    try {
      const [result] = await db.execute(
        'UPDATE notifications SET is_read = true WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi đánh dấu thông báo đã đọc:', error);
      throw new Error('Lỗi đánh dấu thông báo đã đọc: ' + error.message);
    }
  },

  // Đánh dấu tất cả thông báo đã đọc cho người dùng
  markAllAsRead: async (userId) => {
    try {
      const [result] = await db.execute(
        'UPDATE notifications SET is_read = true WHERE user_id = ?',
        [userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi đánh dấu tất cả thông báo đã đọc:', error);
      throw new Error('Lỗi đánh dấu tất cả thông báo đã đọc: ' + error.message);
    }
  },

  // Xóa thông báo
  delete: async (id) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa thông báo:', error);
      throw new Error('Lỗi xóa thông báo: ' + error.message);
    }
  },

  // Xóa tất cả thông báo của người dùng
  deleteAllForUser: async (userId) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM notifications WHERE user_id = ?',
        [userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa tất cả thông báo của người dùng:', error);
      throw new Error('Lỗi xóa tất cả thông báo: ' + error.message);
    }
  },

  // Lấy số lượng thông báo chưa đọc của người dùng
  getUnreadCount: async (userId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
        [userId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Lỗi lấy số lượng thông báo chưa đọc:', error);
      throw new Error('Lỗi lấy số lượng thông báo chưa đọc: ' + error.message);
    }
  },

  // Kiểm tra thông báo có tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM notifications WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của thông báo:', error);
      return false;
    }
  }
};

module.exports = Notification; 