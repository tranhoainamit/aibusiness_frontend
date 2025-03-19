const db = require('../config/database');
const { validationResult } = require('express-validator');
const User = require('./User');
const Course = require('./Course');
const Coupon = require('./Coupon');
const Progress = require('./Progress');

/**
 * Model đăng ký khóa học (sử dụng bảng purchases)
 * Quản lý việc người dùng đăng ký và truy cập các khóa học
 * @module Enrollment
 */
const Enrollment = {
  /**
   * Tạo đăng ký mới (thêm vào bảng purchases)
   * @param {Object} enrollmentData - Dữ liệu đăng ký
   * @param {number} enrollmentData.user_id - ID người dùng
   * @param {number} enrollmentData.course_id - ID khóa học
   * @param {number} [enrollmentData.coupon_id] - ID mã giảm giá (nếu có)
   * @param {number} enrollmentData.original_price - Giá gốc khóa học
   * @param {number} [enrollmentData.discount_amount=0] - Số tiền giảm giá
   * @param {number} enrollmentData.total_amount - Tổng tiền thanh toán
   * @param {string} [enrollmentData.payment_method] - Phương thức thanh toán
   * @param {string} [enrollmentData.payment_status='pending'] - Trạng thái thanh toán
   * @returns {Promise<number>} ID của đăng ký đã tạo
   */
  create: async (enrollmentData) => {
    try {
      const {
        user_id,
        course_id,
        coupon_id = null,
        original_price,
        discount_amount = 0.00,
        total_amount,
        payment_method,
        payment_status = 'pending'
      } = enrollmentData;

      // Validate dữ liệu đầu vào
      if (!user_id || !course_id || !original_price || !total_amount) {
        throw new Error('Thiếu thông tin bắt buộc: user_id, course_id, original_price, total_amount');
      }

      // Validate số tiền
      if (original_price < 0 || total_amount < 0 || discount_amount < 0) {
        throw new Error('Số tiền không hợp lệ');
      }

      // Kiểm tra người dùng tồn tại
      const userExists = await User.exists(user_id);
      if (!userExists) {
        throw new Error('Người dùng không tồn tại');
      }

      // Kiểm tra khóa học tồn tại
      const courseExists = await Course.exists(course_id);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Kiểm tra mã giảm giá tồn tại (nếu có)
      if (coupon_id) {
        const couponExists = await Coupon.exists(coupon_id);
        if (!couponExists) {
          throw new Error('Mã giảm giá không tồn tại');
        }
      }

      // Kiểm tra người dùng đã đăng ký khóa học chưa
      const isEnrolled = await Enrollment.isEnrolled(user_id, course_id);
      if (isEnrolled) {
        throw new Error('Người dùng đã đăng ký khóa học này');
      }

      // Validate payment_method nếu được cung cấp
      if (payment_method) {
        const validMethods = ['card', 'bank', 'paypal', 'momo'];
        if (!validMethods.includes(payment_method)) {
          throw new Error('Phương thức thanh toán không hợp lệ');
        }
      }

      // Validate payment_status
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(payment_status)) {
        throw new Error('Trạng thái thanh toán không hợp lệ');
      }

      // Bắt đầu transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Thêm vào bảng purchases
        const [result] = await connection.execute(
          `INSERT INTO purchases (
            user_id, course_id, coupon_id, original_price,
            discount_amount, total_amount, purchase_date
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            user_id, 
            course_id, 
            coupon_id, 
            original_price, 
            discount_amount, 
            total_amount
          ]
        );

        const purchaseId = result.insertId;

        // Nếu có thông tin thanh toán, thêm vào bảng payments
        if (payment_method) {
          await connection.execute(
            `INSERT INTO payments (
              purchase_id, amount, payment_method, 
              status, created_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              purchaseId,
              total_amount,
              payment_method,
              payment_status
            ]
          );
        }

        // Cập nhật số lần sử dụng của mã giảm giá (nếu có)
        if (coupon_id) {
          await connection.execute(
            'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
            [coupon_id]
          );
        }

        await connection.commit();
        return purchaseId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi tạo đăng ký:', error);
      throw new Error('Lỗi tạo đăng ký: ' + error.message);
    }
  },

  /**
   * Tìm đăng ký theo ID
   * @param {number} id - ID đăng ký
   * @param {boolean} [includeProgress=false] - Có lấy thông tin tiến độ không
   * @returns {Promise<Object|null>} Thông tin đăng ký hoặc null nếu không tìm thấy
   */
  findById: async (id, includeProgress = false) => {
    try {
      // Kiểm tra id cung cấp
      if (!id) {
        throw new Error('ID đăng ký là bắt buộc');
      }

      let query = `
        SELECT p.*, 
              u.username as user_name, u.full_name as user_full_name,
              c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug,
              c.instructor_id, instructor.username as instructor_name,
              cp.code as coupon_code,
              py.id as payment_id, py.payment_method, py.status as payment_status, py.transaction_id
      `;

      if (includeProgress) {
        query += `,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons,
          IFNULL(SUM(up.progress_percentage) / COUNT(DISTINCT l.id), 0) as avg_progress,
          MAX(up.last_watched) as last_activity
        `;
      }

      query += `
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        JOIN courses c ON p.course_id = c.id
        JOIN users instructor ON c.instructor_id = instructor.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        LEFT JOIN payments py ON p.id = py.purchase_id
      `;

      if (includeProgress) {
        query += `
          LEFT JOIN lessons l ON c.id = l.course_id
          LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id
        `;
      }

      query += ' WHERE p.id = ?';

      if (includeProgress) {
        query += ' GROUP BY p.id';
      }

      const [rows] = await db.execute(query, [id]);

      if (!rows.length) return null;

      // Tính phần trăm hoàn thành nếu bao gồm thông tin tiến độ
      if (includeProgress && rows[0].total_lessons > 0) {
        rows[0].completion_rate = (rows[0].completed_lessons / rows[0].total_lessons) * 100;
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm đăng ký theo ID:', error);
      throw new Error('Lỗi tìm đăng ký: ' + error.message);
    }
  },

  /**
   * Tìm đăng ký theo người dùng và khóa học
   * @param {number} userId - ID người dùng
   * @param {number} courseId - ID khóa học
   * @param {boolean} [includeProgress=false] - Có lấy thông tin tiến độ không
   * @returns {Promise<Object|null>} Thông tin đăng ký hoặc null nếu không tìm thấy
   */
  findByUserAndCourse: async (userId, courseId, includeProgress = false) => {
    try {
      if (!userId || !courseId) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }

      let query = `
        SELECT p.*, 
              c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug,
              c.instructor_id, u.username as instructor_name,
              cp.code as coupon_code,
              py.payment_method, py.status as payment_status, py.transaction_id
      `;

      if (includeProgress) {
        query += `,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons,
          IFNULL(SUM(up.progress_percentage) / COUNT(DISTINCT l.id), 0) as avg_progress,
          MAX(up.last_watched) as last_activity
        `;
      }

      query += `
        FROM purchases p
        JOIN courses c ON p.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        LEFT JOIN payments py ON p.id = py.purchase_id
      `;

      if (includeProgress) {
        query += `
          LEFT JOIN lessons l ON c.id = l.course_id
          LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id
        `;
      }

      query += ' WHERE p.user_id = ? AND p.course_id = ?';

      if (includeProgress) {
        query += ' GROUP BY p.id';
      }

      const [rows] = await db.execute(query, [userId, courseId]);

      if (!rows.length) return null;

      // Tính phần trăm hoàn thành nếu bao gồm thông tin tiến độ
      if (includeProgress && rows[0].total_lessons > 0) {
        rows[0].completion_rate = (rows[0].completed_lessons / rows[0].total_lessons) * 100;
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm đăng ký theo người dùng và khóa học:', error);
      throw new Error('Lỗi tìm đăng ký: ' + error.message);
    }
  },

  /**
   * Tìm tất cả đăng ký của người dùng
   * @param {number} userId - ID người dùng
   * @param {Object} [filters={}] - Bộ lọc tìm kiếm
   * @param {string} [filters.payment_status] - Lọc theo trạng thái thanh toán
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @param {boolean} [filters.includeProgress=true] - Có bao gồm thông tin tiến độ không
   * @returns {Promise<Object>} Danh sách đăng ký và thông tin phân trang
   */
  findByUserId: async (userId, filters = {}) => {
    try {
      if (!userId) {
        throw new Error('ID người dùng là bắt buộc');
      }

      const includeProgress = filters.includeProgress !== false;
      
      let query = `
        SELECT p.*, 
              c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug,
              c.instructor_id, u.username as instructor_name,
              cp.code as coupon_code,
              py.payment_method, py.status as payment_status
      `;

      if (includeProgress) {
        query += `,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons
        `;
      }

      query += `
        FROM purchases p
        JOIN courses c ON p.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        LEFT JOIN payments py ON p.id = py.purchase_id
      `;

      if (includeProgress) {
        query += `
          LEFT JOIN lessons l ON c.id = l.course_id
          LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id AND up.is_completed = 1
        `;
      }

      query += ' WHERE p.user_id = ?';
      const params = [userId];

      // Thêm các điều kiện lọc
      if (filters.payment_status) {
        query += ' AND py.status = ?';
        params.push(filters.payment_status);
      }

      if (filters.start_date) {
        query += ' AND p.purchase_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND p.purchase_date <= ?';
        params.push(filters.end_date);
      }

      if (includeProgress) {
        query += ' GROUP BY p.id';
      }

      query += ' ORDER BY p.purchase_date DESC';

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Tính toán phần trăm hoàn thành cho mỗi đăng ký
      if (includeProgress) {
        rows.forEach(row => {
          if (row.total_lessons > 0) {
            row.completion_rate = (row.completed_lessons / row.total_lessons) * 100;
          } else {
            row.completion_rate = 0;
          }
        });
      }

      // Lấy tổng số lượng cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM purchases p
        LEFT JOIN payments py ON p.id = py.purchase_id
        WHERE p.user_id = ?
      `;
      
      if (filters.payment_status) countQuery += ' AND py.status = ?';
      if (filters.start_date) countQuery += ' AND p.purchase_date >= ?';
      if (filters.end_date) countQuery += ' AND p.purchase_date <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        enrollments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách đăng ký:', error);
      throw new Error('Lỗi tìm danh sách đăng ký: ' + error.message);
    }
  },

  /**
   * Tìm tất cả đăng ký của khóa học
   * @param {number} courseId - ID khóa học
   * @param {Object} [filters={}] - Bộ lọc tìm kiếm
   * @param {string} [filters.payment_status] - Lọc theo trạng thái thanh toán
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @param {boolean} [filters.includeProgress=true] - Có bao gồm thông tin tiến độ không
   * @returns {Promise<Object>} Danh sách đăng ký và thông tin phân trang
   */
  findByCourseId: async (courseId, filters = {}) => {
    try {
      if (!courseId) {
        throw new Error('ID khóa học là bắt buộc');
      }
      
      // Kiểm tra khóa học tồn tại
      const courseExists = await Course.exists(courseId);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }

      const includeProgress = filters.includeProgress !== false;
      
      let query = `
        SELECT p.*, 
              u.username as user_name, u.full_name as user_full_name, u.email as user_email,
              cp.code as coupon_code,
              py.payment_method, py.status as payment_status
      `;

      if (includeProgress) {
        query += `,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons
        `;
      }

      query += `
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        LEFT JOIN payments py ON p.id = py.purchase_id
      `;

      if (includeProgress) {
        query += `
          LEFT JOIN lessons l ON p.course_id = l.course_id
          LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id AND up.is_completed = 1
        `;
      }

      query += ' WHERE p.course_id = ?';
      const params = [courseId];

      // Thêm các điều kiện lọc
      if (filters.payment_status) {
        query += ' AND py.status = ?';
        params.push(filters.payment_status);
      }

      if (filters.start_date) {
        query += ' AND p.purchase_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND p.purchase_date <= ?';
        params.push(filters.end_date);
      }

      if (includeProgress) {
        query += ' GROUP BY p.id';
      }

      query += ' ORDER BY p.purchase_date DESC';

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Tính toán phần trăm hoàn thành cho mỗi đăng ký
      if (includeProgress) {
        rows.forEach(row => {
          if (row.total_lessons > 0) {
            row.completion_rate = (row.completed_lessons / row.total_lessons) * 100;
          } else {
            row.completion_rate = 0;
          }
        });
      }

      // Lấy tổng số lượng cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM purchases p
        LEFT JOIN payments py ON p.id = py.purchase_id
        WHERE p.course_id = ?
      `;
      
      if (filters.payment_status) countQuery += ' AND py.status = ?';
      if (filters.start_date) countQuery += ' AND p.purchase_date >= ?';
      if (filters.end_date) countQuery += ' AND p.purchase_date <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        enrollments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách đăng ký:', error);
      throw new Error('Lỗi tìm danh sách đăng ký: ' + error.message);
    }
  },

  /**
   * Cập nhật đăng ký
   * @param {number} id - ID đăng ký
   * @param {Object} enrollmentData - Dữ liệu cập nhật
   * @param {string} [enrollmentData.payment_status] - Trạng thái thanh toán mới
   * @param {number} [enrollmentData.total_amount] - Tổng tiền mới
   * @param {number} [enrollmentData.discount_amount] - Số tiền giảm giá mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (id, enrollmentData) => {
    try {
      if (!id) {
        throw new Error('ID đăng ký là bắt buộc');
      }
      
      // Kiểm tra đăng ký tồn tại
      const enrollmentExists = await Enrollment.exists(id);
      if (!enrollmentExists) {
        throw new Error('Đăng ký không tồn tại');
      }
      
      const { payment_status, total_amount, discount_amount } = enrollmentData;
      
      // Bắt đầu transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Cập nhật bảng purchases
        if (total_amount !== undefined || discount_amount !== undefined) {
          const updateFields = [];
          const updateValues = [];
          
          if (total_amount !== undefined) {
            if (total_amount < 0) throw new Error('Số tiền không hợp lệ');
            updateFields.push('total_amount = ?');
            updateValues.push(total_amount);
          }
          
          if (discount_amount !== undefined) {
            if (discount_amount < 0) throw new Error('Số tiền giảm giá không hợp lệ');
            updateFields.push('discount_amount = ?');
            updateValues.push(discount_amount);
          }
          
          if (updateFields.length > 0) {
            updateValues.push(id);
            await connection.execute(
              `UPDATE purchases SET ${updateFields.join(', ')} WHERE id = ?`,
              updateValues
            );
          }
        }
        
        // Cập nhật trạng thái thanh toán
        if (payment_status !== undefined) {
          const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
          if (!validStatuses.includes(payment_status)) {
            throw new Error('Trạng thái thanh toán không hợp lệ');
          }
          
          const [paymentExists] = await connection.execute(
            'SELECT id FROM payments WHERE purchase_id = ?',
            [id]
          );
          
          if (paymentExists.length > 0) {
            await connection.execute(
              'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE purchase_id = ?',
              [payment_status, id]
            );
          } else {
            const [purchaseData] = await connection.execute(
              'SELECT total_amount FROM purchases WHERE id = ?',
              [id]
            );
            
            if (purchaseData.length > 0) {
              await connection.execute(
                `INSERT INTO payments (
                  purchase_id, amount, payment_method, status, created_at
                ) VALUES (?, ?, 'bank', ?, CURRENT_TIMESTAMP)`,
                [id, purchaseData[0].total_amount, payment_status]
              );
            }
          }
        }
        
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi cập nhật đăng ký:', error);
      throw new Error('Lỗi cập nhật đăng ký: ' + error.message);
    }
  },

  /**
   * Xóa đăng ký
   * @param {number} id - ID đăng ký
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      if (!id) {
        throw new Error('ID đăng ký là bắt buộc');
      }
      
      // Kiểm tra đăng ký tồn tại
      const enrollmentExists = await Enrollment.exists(id);
      if (!enrollmentExists) {
        throw new Error('Đăng ký không tồn tại');
      }
      
      // Lấy thông tin đăng ký để xóa tiến độ liên quan
      const [enrollmentInfo] = await db.execute(
        'SELECT user_id, course_id FROM purchases WHERE id = ?',
        [id]
      );
      
      if (enrollmentInfo.length === 0) {
        throw new Error('Không tìm thấy thông tin đăng ký');
      }
      
      const { user_id, course_id } = enrollmentInfo[0];
      
      // Bắt đầu transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Xóa các thanh toán liên quan
        await connection.execute('DELETE FROM payments WHERE purchase_id = ?', [id]);
        
        // Xóa tiến độ học tập liên quan
        await connection.execute(
          'DELETE FROM user_progress WHERE user_id = ? AND course_id = ?',
          [user_id, course_id]
        );
        
        // Xóa đăng ký
        const [result] = await connection.execute('DELETE FROM purchases WHERE id = ?', [id]);
        
        await connection.commit();
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi xóa đăng ký:', error);
      throw new Error('Lỗi xóa đăng ký: ' + error.message);
    }
  },

  /**
   * Lấy tiến độ học tập của đăng ký
   * @param {number} userId - ID người dùng
   * @param {number} courseId - ID khóa học
   * @returns {Promise<Object>} Thông tin tiến độ học tập
   */
  getProgress: async (userId, courseId) => {
    try {
      if (!userId || !courseId) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      // Kiểm tra người dùng đã đăng ký khóa học chưa
      const isEnrolled = await Enrollment.isEnrolled(userId, courseId);
      if (!isEnrolled) {
        throw new Error('Người dùng chưa đăng ký khóa học này');
      }
      
      // Sử dụng hàm getCourseProgress từ model Progress
      return await Progress.getCourseProgress(userId, courseId, true);
    } catch (error) {
      console.error('Lỗi lấy tiến độ học tập:', error);
      throw new Error('Lỗi lấy tiến độ học tập: ' + error.message);
    }
  },
  
  /**
   * Đánh dấu khóa học là đã hoàn thành
   * @param {number} userId - ID người dùng
   * @param {number} courseId - ID khóa học
   * @returns {Promise<boolean>} Kết quả đánh dấu
   */
  markAsCompleted: async (userId, courseId) => {
    try {
      if (!userId || !courseId) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      // Kiểm tra người dùng đã đăng ký khóa học chưa
      const isEnrolled = await Enrollment.isEnrolled(userId, courseId);
      if (!isEnrolled) {
        throw new Error('Người dùng chưa đăng ký khóa học này');
      }
      
      // Lấy tất cả bài học của khóa học
      const [lessons] = await db.execute(
        'SELECT id FROM lessons WHERE course_id = ?',
        [courseId]
      );
      
      if (lessons.length === 0) {
        return false;
      }
      
      // Bắt đầu transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Đánh dấu tất cả bài học là đã hoàn thành
        for (const lesson of lessons) {
          await connection.execute(
            `INSERT INTO user_progress (
              user_id, course_id, lesson_id, is_completed, 
              progress_percentage, completed_at, last_watched
            ) VALUES (?, ?, ?, 1, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              is_completed = 1,
              progress_percentage = 100,
              completed_at = CURRENT_TIMESTAMP,
              last_watched = CURRENT_TIMESTAMP`,
            [userId, courseId, lesson.id]
          );
        }
        
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi đánh dấu khóa học hoàn thành:', error);
      throw new Error('Lỗi đánh dấu khóa học hoàn thành: ' + error.message);
    }
  },

  /**
   * Kiểm tra đăng ký có tồn tại
   * @param {number} id - ID đăng ký
   * @returns {Promise<boolean>} Đăng ký có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM purchases WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của đăng ký:', error);
      return false;
    }
  },

  /**
   * Kiểm tra người dùng đã đăng ký khóa học chưa
   * @param {number} userId - ID người dùng
   * @param {number} courseId - ID khóa học
   * @returns {Promise<boolean>} Người dùng đã đăng ký hay chưa
   */
  isEnrolled: async (userId, courseId) => {
    try {
      if (!userId || !courseId) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM purchases WHERE user_id = ? AND course_id = ?) as exist',
        [userId, courseId]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đăng ký:', error);
      return false;
    }
  },
  
  /**
   * Lấy số lượng học viên đăng ký khóa học
   * @param {number} courseId - ID khóa học
   * @param {Object} [filters={}] - Bộ lọc (ví dụ: trạng thái thanh toán)
   * @returns {Promise<number>} Số lượng học viên
   */
  getStudentCount: async (courseId, filters = {}) => {
    try {
      if (!courseId) return 0;
      
      let query = 'SELECT COUNT(DISTINCT user_id) as count FROM purchases WHERE course_id = ?';
      const params = [courseId];
      
      // Thêm điều kiện lọc theo trạng thái thanh toán nếu có
      if (filters.payment_status) {
        query = `
          SELECT COUNT(DISTINCT p.user_id) as count 
          FROM purchases p
          JOIN payments py ON p.id = py.purchase_id
          WHERE p.course_id = ? AND py.status = ?
        `;
        params.push(filters.payment_status);
      }
      
      const [rows] = await db.execute(query, params);
      return rows[0].count;
    } catch (error) {
      console.error('Lỗi lấy số lượng học viên đăng ký:', error);
      return 0;
    }
  },
  
  /**
   * Lấy tổng doanh thu từ khóa học
   * @param {number} courseId - ID khóa học
   * @param {Object} [filters={}] - Bộ lọc (ví dụ: khoảng thời gian)
   * @returns {Promise<number>} Tổng doanh thu
   */
  getRevenue: async (courseId, filters = {}) => {
    try {
      if (!courseId) return 0;
      
      let query = `
        SELECT SUM(p.total_amount) as revenue
        FROM purchases p
        JOIN payments py ON p.id = py.purchase_id
        WHERE p.course_id = ? AND py.status = 'completed'
      `;
      const params = [courseId];
      
      if (filters.start_date) {
        query += ' AND p.purchase_date >= ?';
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ' AND p.purchase_date <= ?';
        params.push(filters.end_date);
      }
      
      const [rows] = await db.execute(query, params);
      return rows[0].revenue || 0;
    } catch (error) {
      console.error('Lỗi lấy tổng doanh thu khóa học:', error);
      return 0;
    }
  },

  /**
   * Lấy thống kê đăng ký/mua khóa học
   * @param {Object} [filters={}] - Bộ lọc tìm kiếm
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @param {string} [filters.payment_status] - Lọc theo trạng thái thanh toán
   * @returns {Promise<Object>} Thông tin thống kê
   */
  getStats: async (filters = {}) => {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_purchases,
          SUM(total_amount) as total_revenue,
          SUM(discount_amount) as total_discounts,
          AVG(total_amount) as average_purchase,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT course_id) as unique_courses
        FROM purchases p
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.payment_status) {
        query = `
          SELECT 
            COUNT(*) as total_purchases,
            SUM(p.total_amount) as total_revenue,
            SUM(p.discount_amount) as total_discounts,
            AVG(p.total_amount) as average_purchase,
            COUNT(DISTINCT p.user_id) as unique_users,
            COUNT(DISTINCT p.course_id) as unique_courses
          FROM purchases p
          JOIN payments py ON p.id = py.purchase_id
          WHERE py.status = ?
        `;
        params.push(filters.payment_status);
      }

      if (filters.start_date) {
        query += ' AND p.purchase_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND p.purchase_date <= ?';
        params.push(filters.end_date);
      }

      const [rows] = await db.execute(query, params);
      return rows[0];
    } catch (error) {
      console.error('Lỗi lấy thống kê đăng ký:', error);
      throw new Error('Lỗi lấy thống kê đăng ký: ' + error.message);
    }
  },

  /**
   * Lấy lịch sử đăng ký khóa học của người dùng
   * @param {number} userId - ID người dùng
   * @param {boolean} [includeProgress=false] - Có bao gồm thông tin tiến độ không
   * @param {Object} [filters={}] - Bộ lọc tìm kiếm
   * @param {string} [filters.payment_status] - Lọc theo trạng thái thanh toán
   * @returns {Promise<Array>} Danh sách đăng ký của người dùng
   */
  getUserHistory: async (userId, includeProgress = false, filters = {}) => {
    try {
      if (!userId) {
        throw new Error('ID người dùng là bắt buộc');
      }
      
      let query = `
        SELECT p.*,
               c.title as course_title,
               c.thumbnail as course_thumbnail,
               c.slug as course_slug,
               c.instructor_id,
               u.username as instructor_name,
               cp.code as coupon_code,
               py.payment_method, py.status as payment_status, py.transaction_id
      `;
      
      if (includeProgress) {
        query += `,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons,
          MAX(up.last_watched) as last_activity
        `;
      }
      
      query += `
        FROM purchases p
        JOIN courses c ON p.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        LEFT JOIN payments py ON p.id = py.purchase_id
      `;
      
      if (includeProgress) {
        query += `
          LEFT JOIN lessons l ON c.id = l.course_id
          LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id
        `;
      }
      
      query += ` WHERE p.user_id = ?`;
      const params = [userId];
      
      // Thêm điều kiện lọc
      if (filters.payment_status) {
        query += ' AND py.status = ?';
        params.push(filters.payment_status);
      }
      
      if (includeProgress) {
        query += ` GROUP BY p.id`;
      }
      
      query += ` ORDER BY p.purchase_date DESC`;
      
      const [rows] = await db.execute(query, params);
      
      // Tính toán phần trăm hoàn thành cho mỗi đăng ký
      if (includeProgress) {
        rows.forEach(row => {
          if (row.total_lessons > 0) {
            row.completion_rate = (row.completed_lessons / row.total_lessons) * 100;
          } else {
            row.completion_rate = 0;
          }
        });
      }
      
      return rows;
    } catch (error) {
      console.error('Lỗi lấy lịch sử đăng ký khóa học:', error);
      throw new Error('Lỗi lấy lịch sử đăng ký khóa học: ' + error.message);
    }
  }
};

module.exports = Enrollment; 