const db = require('../config/database');

// Model phiên đăng nhập
const Session = {
  // Tạo phiên mới
  create: async (sessionData) => {
    try {
      const {
        user_id,
        token,
        device_info = null,
        ip_address = null,
        expires_at,
        is_active = true
      } = sessionData;

      const [result] = await db.execute(
        `INSERT INTO sessions (
          user_id, token, device_info, ip_address,
          expires_at, is_active, created_at, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [user_id, token, device_info, ip_address, expires_at, is_active]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi khi tạo phiên đăng nhập:', error);
      throw new Error('Lỗi khi tạo phiên: ' + error.message);
    }
  },

  // Tìm phiên theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM sessions WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi tìm phiên theo ID:', error);
      throw new Error('Lỗi khi tìm phiên: ' + error.message);
    }
  },

  // Tìm phiên theo token
  findByToken: async (token) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM sessions WHERE token = ?',
        [token]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi tìm phiên theo token:', error);
      throw new Error('Lỗi khi tìm phiên theo token: ' + error.message);
    }
  },

  // Lấy tất cả phiên của người dùng
  findByUserId: async (userId, filters = {}) => {
    try {
      let query = 'SELECT * FROM sessions WHERE user_id = ?';
      const params = [userId];

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY last_activity_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số lượng cho phân trang
      let countQuery = 'SELECT COUNT(*) as total FROM sessions WHERE user_id = ?';
      const countParams = [userId];

      if (filters.is_active !== undefined) {
        countQuery += ' AND is_active = ?';
        countParams.push(filters.is_active);
      }

      const [countResult] = await db.execute(countQuery, countParams);

      return {
        sessions: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy phiên của người dùng:', error);
      throw new Error('Lỗi khi lấy phiên của người dùng: ' + error.message);
    }
  },

  // Cập nhật thời gian hoạt động cuối
  updateLastActivity: async (id) => {
    try {
      const [result] = await db.execute(
        'UPDATE sessions SET last_activity_at = NOW() WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi cập nhật thời gian hoạt động:', error);
      throw new Error('Lỗi khi cập nhật thời gian hoạt động: ' + error.message);
    }
  },

  // Vô hiệu hóa phiên
  deactivate: async (id, userId) => {
    try {
      const [result] = await db.execute(
        'UPDATE sessions SET is_active = false WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi vô hiệu hóa phiên:', error);
      throw new Error('Lỗi khi vô hiệu hóa phiên: ' + error.message);
    }
  },

  // Vô hiệu hóa tất cả phiên của người dùng (trừ phiên hiện tại)
  deactivateAllExceptCurrent: async (userId, currentSessionId) => {
    try {
      const [result] = await db.execute(
        'UPDATE sessions SET is_active = false WHERE user_id = ? AND id != ?',
        [userId, currentSessionId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Lỗi khi vô hiệu hóa tất cả phiên:', error);
      throw new Error('Lỗi khi vô hiệu hóa tất cả phiên: ' + error.message);
    }
  },

  // Xóa phiên hết hạn
  deleteExpired: async () => {
    try {
      const [result] = await db.execute(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Lỗi khi xóa phiên hết hạn:', error);
      throw new Error('Lỗi khi xóa phiên hết hạn: ' + error.message);
    }
  },

  // Kiểm tra phiên tồn tại và còn hiệu lực
  isValid: async (token) => {
    try {
      const [rows] = await db.execute(
        `SELECT id FROM sessions 
         WHERE token = ? AND is_active = true 
         AND expires_at > NOW()`,
        [token]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Lỗi khi kiểm tra phiên:', error);
      throw new Error('Lỗi khi kiểm tra phiên: ' + error.message);
    }
  },

  // Kiểm tra phiên thuộc về người dùng
  belongsToUser: async (id, userId) => {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền sở hữu phiên:', error);
      throw new Error('Lỗi khi kiểm tra quyền sở hữu phiên: ' + error.message);
    }
  },

  // Lấy thông tin chi tiết phiên bao gồm thông tin người dùng
  getSessionDetails: async (id) => {
    try {
      const [rows] = await db.execute(
        `SELECT s.*, u.email, u.full_name 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi lấy thông tin chi tiết phiên:', error);
      throw new Error('Lỗi khi lấy thông tin chi tiết phiên: ' + error.message);
    }
  }
};

module.exports = Session; 