const db = require('../config/database');

/**
 * Model thanh toán - quản lý chi tiết thanh toán các giao dịch
 * @module Payment
 */
const Payment = {
  /**
   * Tạo thanh toán mới
   * @param {Object} paymentData - Dữ liệu thanh toán
   * @param {number} paymentData.purchase_id - ID của giao dịch mua hàng
   * @param {number} paymentData.amount - Số tiền thanh toán
   * @param {string} paymentData.payment_method - Phương thức thanh toán (card, bank, paypal, momo)
   * @param {string} [paymentData.status='pending'] - Trạng thái thanh toán (pending, completed, failed, refunded)
   * @param {string} [paymentData.transaction_id] - Mã giao dịch từ cổng thanh toán
   * @param {string} [paymentData.payment_details] - Chi tiết bổ sung về thanh toán
   * @returns {Promise<number>} ID của thanh toán đã tạo
   */
  create: async (paymentData) => {
    try {
      const {
        purchase_id,
        amount,
        payment_method,
        status = 'pending',
        transaction_id = null,
        payment_details = null
      } = paymentData;

      // Validate dữ liệu đầu vào
      if (!purchase_id || !amount || !payment_method) {
        throw new Error('Thiếu thông tin bắt buộc: purchase_id, amount, payment_method');
      }

      // Validate số tiền
      if (amount < 0) {
        throw new Error('Số tiền không hợp lệ');
      }

      // Validate trạng thái thanh toán
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        throw new Error('Trạng thái thanh toán không hợp lệ');
      }

      // Validate phương thức thanh toán
      const validMethods = ['card', 'bank', 'paypal', 'momo'];
      if (!validMethods.includes(payment_method)) {
        throw new Error('Phương thức thanh toán không hợp lệ');
      }

      // Sử dụng transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Kiểm tra purchase_id có tồn tại không
        const [purchaseExists] = await connection.execute(
          'SELECT EXISTS(SELECT 1 FROM purchases WHERE id = ?) as exist',
          [purchase_id]
        );
        
        if (purchaseExists[0].exist !== 1) {
          throw new Error('Giao dịch mua hàng không tồn tại');
        }
        
        // Thêm mới thanh toán
        const [result] = await connection.execute(
          `INSERT INTO payments (
            purchase_id, amount, payment_method, status,
            transaction_id, payment_details, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [purchase_id, amount, payment_method, status, transaction_id, payment_details]
        );
        
        await connection.commit();
        return result.insertId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi khi tạo thanh toán:', error);
      throw new Error('Lỗi khi tạo thanh toán: ' + error.message);
    }
  },

  /**
   * Tìm thanh toán theo ID
   * @param {number} id - ID thanh toán
   * @returns {Promise<Object|null>} Thông tin thanh toán hoặc null nếu không tìm thấy
   */
  findById: async (id) => {
    try {
      if (!id) {
        throw new Error('ID thanh toán là bắt buộc');
      }
      
      const [rows] = await db.execute(
        `SELECT p.*, 
                pu.user_id,
                pu.course_id,
                pu.original_price,
                pu.discount_amount,
                pu.total_amount,
                pu.purchase_date,
                c.title as course_title,
                c.thumbnail as course_thumbnail,
                u.username, u.full_name as user_full_name,
                u.email as user_email
         FROM payments p
         LEFT JOIN purchases pu ON p.purchase_id = pu.id
         LEFT JOIN courses c ON pu.course_id = c.id
         LEFT JOIN users u ON pu.user_id = u.id
         WHERE p.id = ?`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm thanh toán:', error);
      throw new Error('Lỗi khi tìm thanh toán: ' + error.message);
    }
  },

  /**
   * Tìm thanh toán theo purchase_id
   * @param {number} purchaseId - ID của giao dịch mua hàng
   * @returns {Promise<Object|null>} Thông tin thanh toán mới nhất hoặc null nếu không tìm thấy
   */
  findByPurchaseId: async (purchaseId) => {
    try {
      if (!purchaseId) {
        throw new Error('ID giao dịch mua hàng là bắt buộc');
      }
      
      const [rows] = await db.execute(
        `SELECT * FROM payments 
         WHERE purchase_id = ? 
         ORDER BY created_at DESC`,
        [purchaseId]
      );
      
      return rows.length > 0 ? rows[0] : null; // Trả về thanh toán mới nhất
    } catch (error) {
      console.error('Lỗi khi tìm thanh toán theo purchase_id:', error);
      throw new Error('Lỗi khi tìm thanh toán theo purchase_id: ' + error.message);
    }
  },

  /**
   * Lấy tất cả thanh toán với bộ lọc
   * @param {Object} [filters={}] - Bộ lọc tìm kiếm
   * @param {number} [filters.user_id] - Lọc theo ID người dùng
   * @param {number} [filters.course_id] - Lọc theo ID khóa học
   * @param {string} [filters.status] - Lọc theo trạng thái thanh toán
   * @param {string} [filters.payment_method] - Lọc theo phương thức thanh toán
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @param {number} [filters.min_amount] - Lọc theo số tiền tối thiểu
   * @param {number} [filters.max_amount] - Lọc theo số tiền tối đa
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @returns {Promise<Object>} Danh sách thanh toán và thông tin phân trang
   */
  findAll: async (filters = {}) => {
    try {
      let query = `
        SELECT p.*, 
               pu.user_id,
               pu.course_id,
               pu.original_price,
               pu.discount_amount,
               pu.total_amount,
               pu.purchase_date,
               c.title as course_title,
               c.thumbnail as course_thumbnail,
               u.username, u.full_name as user_full_name,
               u.email as user_email
        FROM payments p
        LEFT JOIN purchases pu ON p.purchase_id = pu.id
        LEFT JOIN courses c ON pu.course_id = c.id
        LEFT JOIN users u ON pu.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND pu.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.course_id) {
        query += ' AND pu.course_id = ?';
        params.push(filters.course_id);
      }

      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.payment_method) {
        query += ' AND p.payment_method = ?';
        params.push(filters.payment_method);
      }

      if (filters.start_date) {
        query += ' AND p.created_at >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND p.created_at <= ?';
        params.push(filters.end_date);
      }

      if (filters.min_amount) {
        query += ' AND p.amount >= ?';
        params.push(filters.min_amount);
      }

      if (filters.max_amount) {
        query += ' AND p.amount <= ?';
        params.push(filters.max_amount);
      }

      // Thêm sắp xếp
      query += ' ORDER BY p.created_at DESC';
      
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
        FROM payments p
        LEFT JOIN purchases pu ON p.purchase_id = pu.id
        WHERE 1=1
      `;
      if (filters.user_id) countQuery += ' AND pu.user_id = ?';
      if (filters.course_id) countQuery += ' AND pu.course_id = ?';
      if (filters.status) countQuery += ' AND p.status = ?';
      if (filters.payment_method) countQuery += ' AND p.payment_method = ?';
      if (filters.start_date) countQuery += ' AND p.created_at >= ?';
      if (filters.end_date) countQuery += ' AND p.created_at <= ?';
      if (filters.min_amount) countQuery += ' AND p.amount >= ?';
      if (filters.max_amount) countQuery += ' AND p.amount <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Bỏ limit và offset
      );

      return {
        payments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thanh toán:', error);
      throw new Error('Lỗi khi lấy danh sách thanh toán: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin thanh toán
   * @param {number} id - ID thanh toán
   * @param {Object} updateData - Dữ liệu cập nhật
   * @param {string} [updateData.status] - Trạng thái thanh toán mới
   * @param {string} [updateData.transaction_id] - Mã giao dịch mới
   * @param {string} [updateData.payment_details] - Chi tiết thanh toán mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (id, updateData) => {
    try {
      if (!id) {
        throw new Error('ID thanh toán là bắt buộc');
      }
      
      // Kiểm tra thanh toán tồn tại
      const paymentExists = await Payment.exists(id);
      if (!paymentExists) {
        throw new Error('Thanh toán không tồn tại');
      }
      
      const { status, transaction_id, payment_details } = updateData;
      
      // Xây dựng câu truy vấn cập nhật
      const updates = [];
      const values = [];
      
      // Validate trạng thái thanh toán nếu được cung cấp
      if (status !== undefined) {
        const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
        if (!validStatuses.includes(status)) {
          throw new Error('Trạng thái thanh toán không hợp lệ');
        }
        updates.push('status = ?');
        values.push(status);
      }
      
      if (transaction_id !== undefined) {
        updates.push('transaction_id = ?');
        values.push(transaction_id);
      }
      
      if (payment_details !== undefined) {
        updates.push('payment_details = ?');
        values.push(payment_details);
      }
      
      if (updates.length === 0) return false;
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      // Sử dụng transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        const [result] = await connection.execute(
          `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        
        // Nếu cập nhật trạng thái thành completed, cập nhật lại trong hệ thống
        if (status === 'completed') {
          // Lấy thông tin thanh toán
          const [paymentInfo] = await connection.execute(
            'SELECT purchase_id FROM payments WHERE id = ?',
            [id]
          );
          
          if (paymentInfo.length > 0) {
            // Có thể thực hiện các hành động bổ sung khi hoàn tất thanh toán
            // Ví dụ: cập nhật trạng thái khóa học, gửi email, v.v.
          }
        }
        
        await connection.commit();
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật thanh toán:', error);
      throw new Error('Lỗi khi cập nhật thanh toán: ' + error.message);
    }
  },

  /**
   * Xóa thanh toán
   * @param {number} id - ID thanh toán
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      if (!id) {
        throw new Error('ID thanh toán là bắt buộc');
      }
      
      // Kiểm tra thanh toán tồn tại
      const paymentExists = await Payment.exists(id);
      if (!paymentExists) {
        throw new Error('Thanh toán không tồn tại');
      }
      
      // Sử dụng transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        const [result] = await connection.execute('DELETE FROM payments WHERE id = ?', [id]);
        
        await connection.commit();
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi khi xóa thanh toán:', error);
      throw new Error('Lỗi khi xóa thanh toán: ' + error.message);
    }
  },

  /**
   * Kiểm tra thanh toán có tồn tại
   * @param {number} id - ID thanh toán
   * @returns {Promise<boolean>} Thanh toán có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM payments WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của thanh toán:', error);
      return false;
    }
  },
  
  /**
   * Lấy thống kê thanh toán theo trạng thái
   * @param {Object} [filters={}] - Bộ lọc
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @returns {Promise<Object>} Thống kê theo trạng thái
   */
  getStatsByStatus: async (filters = {}) => {
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount
        FROM payments
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.start_date) {
        query += ' AND created_at >= ?';
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ' AND created_at <= ?';
        params.push(filters.end_date);
      }
      
      query += ' GROUP BY status';
      
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy thống kê thanh toán:', error);
      throw new Error('Lỗi khi lấy thống kê thanh toán: ' + error.message);
    }
  },
  
  /**
   * Tạo refund (hoàn tiền) cho thanh toán
   * @param {number} paymentId - ID thanh toán cần hoàn tiền
   * @param {Object} refundData - Dữ liệu hoàn tiền
   * @param {string} [refundData.reason] - Lý do hoàn tiền
   * @param {number} [refundData.amount] - Số tiền hoàn lại (mặc định là toàn bộ)
   * @returns {Promise<boolean>} Kết quả xử lý hoàn tiền
   */
  createRefund: async (paymentId, refundData = {}) => {
    try {
      if (!paymentId) {
        throw new Error('ID thanh toán là bắt buộc');
      }
      
      // Sử dụng transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Lấy thông tin thanh toán
        const [paymentInfo] = await connection.execute(
          'SELECT * FROM payments WHERE id = ?',
          [paymentId]
        );
        
        if (paymentInfo.length === 0) {
          throw new Error('Thanh toán không tồn tại');
        }
        
        const payment = paymentInfo[0];
        
        // Kiểm tra trạng thái thanh toán
        if (payment.status !== 'completed') {
          throw new Error('Chỉ có thể hoàn tiền cho thanh toán đã hoàn tất');
        }
        
        // Cập nhật trạng thái thanh toán thành 'refunded'
        await connection.execute(
          'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['refunded', paymentId]
        );
        
        // Lưu chi tiết hoàn tiền nếu cần
        // Có thể thêm bảng riêng để lưu thông tin hoàn tiền
        
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi khi tạo hoàn tiền:', error);
      throw new Error('Lỗi khi tạo hoàn tiền: ' + error.message);
    }
  }
};

module.exports = Payment; 