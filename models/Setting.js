const db = require('../config/database');

class Setting {
  // Tạo cài đặt mới
  static async create(settingData) {
    try {
      const {
        key,
        value,
        type = 'string',
        group = 'general',
        is_public = true,
        description = null
      } = settingData;

      const [result] = await db.execute(
        `INSERT INTO settings (
          \`key\`, value, type, \`group\`,
          is_public, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [key, value, type, group, is_public, description]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Lỗi khi tạo cài đặt: ' + error.message);
    }
  }

  // Tìm cài đặt theo key
  static async findByKey(key) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM settings WHERE `key` = ?',
        [key]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Lỗi khi tìm cài đặt: ' + error.message);
    }
  }

  // Lấy tất cả cài đặt với bộ lọc
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM settings WHERE 1=1';
      const params = [];

      if (filters.is_public !== undefined) {
        query += ' AND is_public = ?';
        params.push(filters.is_public);
      }

      if (filters.group) {
        query += ' AND `group` = ?';
        params.push(filters.group);
      }

      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.search) {
        query += ' AND (`key` LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY `group` ASC, `key` ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số lượng cho phân trang
      let countQuery = 'SELECT COUNT(*) as total FROM settings WHERE 1=1';
      if (filters.is_public !== undefined) {
        countQuery += ' AND is_public = ?';
      }
      if (filters.group) {
        countQuery += ' AND `group` = ?';
      }
      if (filters.type) {
        countQuery += ' AND type = ?';
      }
      if (filters.search) {
        countQuery += ' AND (`key` LIKE ? OR description LIKE ?)';
      }

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Bỏ limit và offset
      );

      return {
        settings: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Lỗi khi lấy danh sách cài đặt: ' + error.message);
    }
  }

  // Lấy tất cả cài đặt công khai
  static async getPublicSettings() {
    try {
      const [rows] = await db.execute(
        'SELECT `key`, value, type, `group` FROM settings WHERE is_public = true'
      );
      return rows;
    } catch (error) {
      throw new Error('Lỗi khi lấy cài đặt công khai: ' + error.message);
    }
  }

  // Lấy cài đặt theo nhóm
  static async getByGroup(group) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM settings WHERE `group` = ?',
        [group]
      );
      return rows;
    } catch (error) {
      throw new Error('Lỗi khi lấy cài đặt theo nhóm: ' + error.message);
    }
  }

  // Cập nhật cài đặt
  static async update(key, updateData) {
    try {
      const allowedFields = ['value', 'type', 'group', 'is_public', 'description'];
      const updates = [];
      const values = [];

      Object.keys(updateData).forEach(field => {
        if (allowedFields.includes(field)) {
          updates.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (updates.length === 0) {
        throw new Error('Không có trường hợp lệ để cập nhật');
      }

      values.push(key);
      const query = `UPDATE settings SET ${updates.join(', ')} WHERE \`key\` = ?`;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Lỗi khi cập nhật cài đặt: ' + error.message);
    }
  }

  // Xóa cài đặt
  static async delete(key) {
    try {
      const [result] = await db.execute(
        'DELETE FROM settings WHERE `key` = ?',
        [key]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Lỗi khi xóa cài đặt: ' + error.message);
    }
  }

  // Kiểm tra cài đặt tồn tại
  static async exists(key) {
    try {
      const [rows] = await db.execute(
        'SELECT `key` FROM settings WHERE `key` = ?',
        [key]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Lỗi khi kiểm tra cài đặt tồn tại: ' + error.message);
    }
  }

  // Cập nhật nhiều cài đặt cùng lúc
  static async bulkUpdate(settings) {
    try {
      const updates = settings.map(async ({ key, value }) => {
        const [result] = await db.execute(
          'UPDATE settings SET value = ? WHERE `key` = ?',
          [value, key]
        );
        return result.affectedRows > 0;
      });

      const results = await Promise.all(updates);
      return results.every(result => result === true);
    } catch (error) {
      throw new Error('Lỗi khi cập nhật hàng loạt cài đặt: ' + error.message);
    }
  }
}

module.exports = Setting; 