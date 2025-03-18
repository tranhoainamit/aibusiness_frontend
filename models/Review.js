const db = require('../config/database');

class Review {
  static async create(reviewData) {
    try {
      const {
        user_id,
        course_id,
        rating,
        comment
      } = reviewData;

      const [result] = await db.execute(
        `INSERT INTO reviews (
          user_id, course_id, rating, comment
        ) VALUES (?, ?, ?, ?)`,
        [user_id, course_id, rating, comment]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Review.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                u.username, u.full_name, u.avatar_url,
                c.title as course_title
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN courses c ON r.course_id = c.id
         WHERE r.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Review.findById:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT r.*, 
               u.username, u.full_name, u.avatar_url,
               c.title as course_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN courses c ON r.course_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND r.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.course_id) {
        query += ' AND r.course_id = ?';
        params.push(filters.course_id);
      }

      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      if (filters.min_rating) {
        query += ' AND r.rating >= ?';
        params.push(filters.min_rating);
      }

      query += ' ORDER BY r.created_at DESC';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Review.findAll:', error);
      throw error;
    }
  }

  static async update(id, reviewData) {
    try {
      const {
        rating,
        comment
      } = reviewData;

      const [result] = await db.execute(
        `UPDATE reviews SET
          rating = ?,
          comment = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, comment, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Review.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Review.delete:', error);
      throw error;
    }
  }

  static async getCourseStats(courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
         FROM reviews
         WHERE course_id = ?`,
        [courseId]
      );
      
      const stats = rows[0];
      stats.rating_distribution = {
        5: stats.five_star,
        4: stats.four_star,
        3: stats.three_star,
        2: stats.two_star,
        1: stats.one_star
      };

      delete stats.five_star;
      delete stats.four_star;
      delete stats.three_star;
      delete stats.two_star;
      delete stats.one_star;

      return stats;
    } catch (error) {
      console.error('Error in Review.getCourseStats:', error);
      throw error;
    }
  }

  static async checkUserReview(userId, courseId) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM reviews WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      return rows[0] ? rows[0].id : null;
    } catch (error) {
      console.error('Error in Review.checkUserReview:', error);
      throw error;
    }
  }
}

module.exports = Review; 