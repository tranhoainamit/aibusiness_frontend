const db = require('../config/database');

// Model mã giảm giá
const Coupon = {
  // Tạo mã giảm giá mới
  create: async (couponData) => {
    try {
      const {
        code,
        discount_type,
        discount_value,
        max_uses = null,
        start_date = null,
        end_date = null,
        is_active = true
      } = couponData;

      // Validate dữ liệu đầu vào
      if (!code || !discount_type || discount_value === undefined) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Validate loại giảm giá
      if (!['percentage', 'fixed'].includes(discount_type)) {
        throw new Error('Loại giảm giá không hợp lệ, chỉ chấp nhận percentage hoặc fixed');
      }

      // Validate giá trị giảm giá
      if (discount_value < 0) {
        throw new Error('Giá trị giảm giá không hợp lệ');
      }

      // Nếu là phần trăm, giới hạn giá trị tối đa là 100%
      if (discount_type === 'percentage' && discount_value > 100) {
        throw new Error('Giá trị giảm giá phần trăm không thể vượt quá 100%');
      }

      // Kiểm tra mã đã tồn tại chưa
      const existingCoupon = await Coupon.findByCodeExact(code);
      if (existingCoupon) {
        throw new Error('Mã giảm giá đã tồn tại');
      }

      const [result] = await db.execute(
        `INSERT INTO coupons (
          code, discount_type, discount_value, max_uses,
          start_date, end_date, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [code, discount_type, discount_value, max_uses, start_date, end_date, is_active]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi khi tạo mã giảm giá:', error);
      throw new Error('Lỗi khi tạo mã giảm giá: ' + error.message);
    }
  },

  // Tìm mã giảm giá theo mã (chính xác)
  findByCodeExact: async (code) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM coupons WHERE code = ?',
        [code]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi tìm mã giảm giá theo mã chính xác:', error);
      throw new Error('Lỗi khi tìm mã giảm giá: ' + error.message);
    }
  },

  // Tìm mã giảm giá hợp lệ theo mã
  findByCode: async (code) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE
         AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
         AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
         AND (max_uses IS NULL OR used_count < max_uses)`,
        [code]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi tìm mã giảm giá theo mã:', error);
      throw new Error('Lỗi khi tìm mã giảm giá: ' + error.message);
    }
  },

  // Kiểm tra mã có áp dụng được cho khóa học không
  isValidForCourse: async (couponId, courseId) => {
    try {
      // Trước hết kiểm tra nếu có giới hạn khóa học cho mã giảm giá
      const [courseLinks] = await db.execute(
        'SELECT COUNT(*) as count FROM coupon_courses WHERE coupon_id = ?',
        [couponId]
      );
      
      // Nếu không có giới hạn khóa học nào, mã giảm giá áp dụng cho tất cả
      if (courseLinks[0].count === 0) {
        return true;
      }
      
      // Nếu có giới hạn khóa học, kiểm tra xem khóa học hiện tại có trong danh sách không
      const [courseMatch] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM coupon_courses WHERE coupon_id = ? AND course_id = ?) as exist',
        [couponId, courseId]
      );
      
      return courseMatch[0].exist === 1;
    } catch (error) {
      console.error('Lỗi khi kiểm tra tính hợp lệ của mã giảm giá cho khóa học:', error);
      throw new Error('Lỗi khi kiểm tra tính hợp lệ của mã giảm giá: ' + error.message);
    }
  },

  // Tìm mã giảm giá theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute('SELECT * FROM coupons WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi tìm mã giảm giá theo ID:', error);
      throw new Error('Lỗi khi tìm mã giảm giá: ' + error.message);
    }
  },

  // Lấy tất cả mã giảm giá với bộ lọc
  findAll: async (filters = {}) => {
    try {
      let query = 'SELECT * FROM coupons WHERE 1=1';
      const params = [];

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.valid_now) {
        query += ` AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
                  AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
                  AND (max_uses IS NULL OR used_count < max_uses)`;
      }

      if (filters.code) {
        query += ' AND code LIKE ?';
        params.push(`%${filters.code}%`);
      }

      if (filters.discount_type) {
        query += ' AND discount_type = ?';
        params.push(filters.discount_type);
      }

      // Thêm sắp xếp mặc định
      query += ' ORDER BY created_at DESC';

      // Thêm phân trang
      if (filters.limit) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit);
        const offset = (page - 1) * limit;
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const [rows] = await db.execute(query, params);

      // Nếu có phân trang, lấy tổng số bản ghi
      if (filters.limit) {
        let countQuery = 'SELECT COUNT(*) as total FROM coupons WHERE 1=1';
        const countParams = params.slice(0, -2); // Loại bỏ limit và offset
        
        if (filters.is_active !== undefined) {
          countQuery += ' AND is_active = ?';
        }
        
        if (filters.valid_now) {
          countQuery += ` AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
                          AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
                          AND (max_uses IS NULL OR used_count < max_uses)`;
        }
        
        if (filters.code) {
          countQuery += ' AND code LIKE ?';
        }
        
        if (filters.discount_type) {
          countQuery += ' AND discount_type = ?';
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit);
        
        return {
          coupons: rows,
          total: countResult[0].total,
          page,
          totalPages: Math.ceil(countResult[0].total / limit)
        };
      }
      
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách mã giảm giá:', error);
      throw new Error('Lỗi khi lấy danh sách mã giảm giá: ' + error.message);
    }
  },

  // Cập nhật mã giảm giá
  update: async (id, couponData) => {
    try {
      const {
        discount_type,
        discount_value,
        max_uses,
        start_date,
        end_date,
        is_active
      } = couponData;

      // Validate dữ liệu đầu vào
      if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
        throw new Error('Loại giảm giá không hợp lệ, chỉ chấp nhận percentage hoặc fixed');
      }

      // Validate giá trị giảm giá
      if (discount_value !== undefined && discount_value < 0) {
        throw new Error('Giá trị giảm giá không hợp lệ');
      }

      // Nếu là phần trăm, giới hạn giá trị tối đa là 100%
      if (discount_type === 'percentage' && discount_value > 100) {
        throw new Error('Giá trị giảm giá phần trăm không thể vượt quá 100%');
      }

      const [result] = await db.execute(
        `UPDATE coupons SET
          discount_type = IFNULL(?, discount_type),
          discount_value = IFNULL(?, discount_value),
          max_uses = ?,
          start_date = ?,
          end_date = ?,
          is_active = IFNULL(?, is_active)
         WHERE id = ?`,
        [discount_type, discount_value, max_uses, start_date, end_date, is_active, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi cập nhật mã giảm giá:', error);
      throw new Error('Lỗi khi cập nhật mã giảm giá: ' + error.message);
    }
  },

  // Tính toán giá trị giảm giá
  calculateDiscount: (coupon, originalPrice) => {
    if (!coupon || originalPrice <= 0) {
      return 0;
    }

    if (coupon.discount_type === 'percentage') {
      // Giảm giá theo phần trăm
      return Math.round((originalPrice * coupon.discount_value) / 100);
    } else if (coupon.discount_type === 'fixed') {
      // Giảm giá cố định, đảm bảo không vượt quá giá gốc
      return Math.min(coupon.discount_value, originalPrice);
    }

    return 0;
  },

  // Tăng số lần sử dụng mã giảm giá
  incrementUsage: async (id) => {
    try {
      const [result] = await db.execute(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi tăng số lần sử dụng mã giảm giá:', error);
      throw new Error('Lỗi khi tăng số lần sử dụng mã giảm giá: ' + error.message);
    }
  },

  // Áp dụng mã giảm giá cho khóa học
  applyToCourse: async (couponId, courseId) => {
    try {
      // Kiểm tra xem đã tồn tại liên kết này chưa
      const [exists] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM coupon_courses WHERE coupon_id = ? AND course_id = ?) as exist',
        [couponId, courseId]
      );
      
      if (exists[0].exist === 1) {
        return true; // Đã tồn tại
      }
      
      const [result] = await db.execute(
        'INSERT INTO coupon_courses (coupon_id, course_id) VALUES (?, ?)',
        [couponId, courseId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi áp dụng mã giảm giá cho khóa học:', error);
      throw new Error('Lỗi khi áp dụng mã giảm giá cho khóa học: ' + error.message);
    }
  },

  // Hủy áp dụng mã giảm giá cho khóa học
  removeFromCourse: async (couponId, courseId) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM coupon_courses WHERE coupon_id = ? AND course_id = ?',
        [couponId, courseId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi hủy áp dụng mã giảm giá cho khóa học:', error);
      throw new Error('Lỗi khi hủy áp dụng mã giảm giá cho khóa học: ' + error.message);
    }
  },

  // Lấy danh sách khóa học áp dụng mã giảm giá
  getApplicableCourses: async (couponId) => {
    try {
      const [rows] = await db.execute(
        `SELECT c.* 
         FROM coupon_courses cc
         JOIN courses c ON cc.course_id = c.id
         WHERE cc.coupon_id = ?`,
        [couponId]
      );
      
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách khóa học áp dụng mã giảm giá:', error);
      throw new Error('Lỗi khi lấy danh sách khóa học áp dụng mã giảm giá: ' + error.message);
    }
  },

  // Xóa mã giảm giá
  delete: async (id) => {
    try {
      // Xóa các liên kết với khóa học trước
      await db.execute('DELETE FROM coupon_courses WHERE coupon_id = ?', [id]);
      
      // Sau đó xóa mã giảm giá
      const [result] = await db.execute('DELETE FROM coupons WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi xóa mã giảm giá:', error);
      throw new Error('Lỗi khi xóa mã giảm giá: ' + error.message);
    }
  },

  // Kiểm tra mã giảm giá tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM coupons WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của mã giảm giá:', error);
      return false;
    }
  }
};

module.exports = Coupon; 