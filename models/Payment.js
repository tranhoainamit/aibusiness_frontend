const db = require('../config/database');

class Payment {
  // Create a new payment
  static async create(paymentData) {
    try {
      const {
        purchase_id,
        amount,
        payment_method,
        status = 'pending',
        transaction_id = null,
        payment_details = null
      } = paymentData;

      const [result] = await db.execute(
        `INSERT INTO payments (
          purchase_id, amount, payment_method, status,
          transaction_id, payment_details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [purchase_id, amount, payment_method, status, transaction_id, payment_details]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating payment: ' + error.message);
    }
  }

  // Find payment by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, 
                pu.user_id,
                pu.course_id,
                c.title as course_title,
                u.fullname as user_name
         FROM payments p
         LEFT JOIN purchases pu ON p.purchase_id = pu.id
         LEFT JOIN courses c ON pu.course_id = c.id
         LEFT JOIN users u ON pu.user_id = u.id
         WHERE p.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding payment: ' + error.message);
    }
  }

  // Get all payments with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, 
               pu.user_id,
               pu.course_id,
               c.title as course_title,
               u.fullname as user_name
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

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
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

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        payments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding payments: ' + error.message);
    }
  }

  // Update payment status
  static async updateStatus(id, status, transactionId = null, paymentDetails = null) {
    try {
      let query = 'UPDATE payments SET status = ?, updated_at = NOW()';
      const params = [status];

      if (transactionId !== null) {
        query += ', transaction_id = ?';
        params.push(transactionId);
      }

      if (paymentDetails !== null) {
        query += ', payment_details = ?';
        params.push(paymentDetails);
      }

      query += ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating payment status: ' + error.message);
    }
  }

  // Get payment statistics
  static async getStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
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

      const [rows] = await db.execute(query, params);
      return rows[0];
    } catch (error) {
      throw new Error('Error getting payment statistics: ' + error.message);
    }
  }

  // Get payment methods distribution
  static async getMethodsDistribution(filters = {}) {
    try {
      let query = `
        SELECT 
          payment_method,
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
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

      query += ' GROUP BY payment_method';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error('Error getting payment methods distribution: ' + error.message);
    }
  }

  // Check if payment exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM payments WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking payment existence: ' + error.message);
    }
  }
}

module.exports = Payment; 