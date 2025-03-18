const db = require('../config/database');

class Coupon {
  static async create(couponData) {
    try {
      const {
        code,
        discount_type,
        discount_value,
        max_uses,
        start_date,
        end_date,
        is_active
      } = couponData;

      const [result] = await db.execute(
        `INSERT INTO coupons (
          code, discount_type, discount_value, max_uses,
          start_date, end_date, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [code, discount_type, discount_value, max_uses, start_date, end_date, is_active ?? true]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Coupon.create:', error);
      throw error;
    }
  }

  static async findByCode(code) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
        [code]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Coupon.findByCode:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute('SELECT * FROM coupons WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error in Coupon.findById:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM coupons WHERE 1=1';
      const params = [];

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.valid_now) {
        query += ` AND (start_date IS NULL OR start_date <= NOW())
                  AND (end_date IS NULL OR end_date >= NOW())
                  AND (max_uses IS NULL OR used_count < max_uses)`;
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Coupon.findAll:', error);
      throw error;
    }
  }

  static async update(id, couponData) {
    try {
      const {
        discount_type,
        discount_value,
        max_uses,
        start_date,
        end_date,
        is_active
      } = couponData;

      const [result] = await db.execute(
        `UPDATE coupons SET
          discount_type = ?,
          discount_value = ?,
          max_uses = ?,
          start_date = ?,
          end_date = ?,
          is_active = ?
         WHERE id = ?`,
        [discount_type, discount_value, max_uses, start_date, end_date, is_active, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Coupon.update:', error);
      throw error;
    }
  }

  static async incrementUsage(id) {
    try {
      const [result] = await db.execute(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Coupon.incrementUsage:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM coupons WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Coupon.delete:', error);
      throw error;
    }
  }
}

module.exports = Coupon; 