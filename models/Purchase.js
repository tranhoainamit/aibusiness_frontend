const db = require('../config/database');

class Purchase {
  // Create a new purchase
  static async create(purchaseData) {
    try {
      const {
        user_id,
        course_id,
        coupon_id = null,
        original_price,
        discount_amount = 0.00,
        total_amount
      } = purchaseData;

      const [result] = await db.execute(
        `INSERT INTO purchases (
          user_id, course_id, coupon_id, original_price,
          discount_amount, total_amount, purchase_date
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [user_id, course_id, coupon_id, original_price, discount_amount, total_amount]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating purchase: ' + error.message);
    }
  }

  // Find purchase by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, 
                c.title as course_title,
                u.fullname as user_name,
                cp.code as coupon_code
         FROM purchases p
         LEFT JOIN courses c ON p.course_id = c.id
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN coupons cp ON p.coupon_id = cp.id
         WHERE p.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding purchase: ' + error.message);
    }
  }

  // Get all purchases with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, 
               c.title as course_title,
               u.fullname as user_name,
               cp.code as coupon_code
        FROM purchases p
        LEFT JOIN courses c ON p.course_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND p.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.course_id) {
        query += ' AND p.course_id = ?';
        params.push(filters.course_id);
      }

      if (filters.start_date) {
        query += ' AND p.purchase_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND p.purchase_date <= ?';
        params.push(filters.end_date);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY p.purchase_date DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM purchases p 
        WHERE 1=1
      `;
      if (filters.user_id) countQuery += ' AND p.user_id = ?';
      if (filters.course_id) countQuery += ' AND p.course_id = ?';
      if (filters.start_date) countQuery += ' AND p.purchase_date >= ?';
      if (filters.end_date) countQuery += ' AND p.purchase_date <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        purchases: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding purchases: ' + error.message);
    }
  }

  // Check if user has purchased a course
  static async hasPurchased(userId, courseId) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM purchases WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking purchase: ' + error.message);
    }
  }

  // Get purchase statistics
  static async getStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_purchases,
          SUM(total_amount) as total_revenue,
          SUM(discount_amount) as total_discounts,
          AVG(total_amount) as average_purchase
        FROM purchases
        WHERE 1=1
      `;
      const params = [];

      if (filters.start_date) {
        query += ' AND purchase_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND purchase_date <= ?';
        params.push(filters.end_date);
      }

      const [rows] = await db.execute(query, params);
      return rows[0];
    } catch (error) {
      throw new Error('Error getting purchase statistics: ' + error.message);
    }
  }

  // Get course purchase statistics
  static async getCourseStats(courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          COUNT(*) as total_purchases,
          SUM(total_amount) as total_revenue,
          SUM(discount_amount) as total_discounts,
          AVG(total_amount) as average_purchase
         FROM purchases
         WHERE course_id = ?`,
        [courseId]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error getting course purchase statistics: ' + error.message);
    }
  }

  // Get user purchase history
  static async getUserHistory(userId) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, 
                c.title as course_title,
                cp.code as coupon_code
         FROM purchases p
         LEFT JOIN courses c ON p.course_id = c.id
         LEFT JOIN coupons cp ON p.coupon_id = cp.id
         WHERE p.user_id = ?
         ORDER BY p.purchase_date DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      throw new Error('Error getting user purchase history: ' + error.message);
    }
  }

  // Delete purchase
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM purchases WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting purchase: ' + error.message);
    }
  }

  // Check if purchase exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM purchases WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking purchase existence: ' + error.message);
    }
  }
}

module.exports = Purchase; 