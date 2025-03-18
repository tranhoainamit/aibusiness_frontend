const db = require('../config/database');

class Enrollment {
  static async create(enrollmentData) {
    try {
      const {
        user_id,
        course_id,
        enrolled_at,
        completed_at,
        progress,
        status
      } = enrollmentData;

      const [result] = await db.execute(
        `INSERT INTO enrollments (
          user_id, course_id, enrolled_at, completed_at, progress, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, course_id, enrolled_at || new Date(), completed_at, progress || 0, status || 'active']
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Enrollment.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT e.*, 
                u.username, u.full_name,
                c.title as course_title, c.instructor_id
         FROM enrollments e
         JOIN users u ON e.user_id = u.id
         JOIN courses c ON e.course_id = c.id
         WHERE e.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Enrollment.findById:', error);
      throw error;
    }
  }

  static async findByUserAndCourse(userId, courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT e.*, 
                u.username, u.full_name,
                c.title as course_title, c.instructor_id
         FROM enrollments e
         JOIN users u ON e.user_id = u.id
         JOIN courses c ON e.course_id = c.id
         WHERE e.user_id = ? AND e.course_id = ?`,
        [userId, courseId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Enrollment.findByUserAndCourse:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT e.*, 
               u.username, u.full_name,
               c.title as course_title, c.instructor_id
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND e.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.course_id) {
        query += ' AND e.course_id = ?';
        params.push(filters.course_id);
      }

      if (filters.status) {
        query += ' AND e.status = ?';
        params.push(filters.status);
      }

      if (filters.instructor_id) {
        query += ' AND c.instructor_id = ?';
        params.push(filters.instructor_id);
      }

      query += ' ORDER BY e.enrolled_at DESC';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Enrollment.findAll:', error);
      throw error;
    }
  }

  static async update(id, enrollmentData) {
    try {
      const {
        completed_at,
        progress,
        status
      } = enrollmentData;

      const [result] = await db.execute(
        `UPDATE enrollments SET
          completed_at = ?, progress = ?, status = ?
         WHERE id = ?`,
        [completed_at, progress, status, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Enrollment.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM enrollments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Enrollment.delete:', error);
      throw error;
    }
  }

  static async updateProgress(userId, courseId, progress) {
    try {
      const [result] = await db.execute(
        `UPDATE enrollments SET
          progress = ?,
          completed_at = CASE WHEN ? >= 100 THEN NOW() ELSE completed_at END,
          status = CASE WHEN ? >= 100 THEN 'completed' ELSE status END
         WHERE user_id = ? AND course_id = ?`,
        [progress, progress, progress, userId, courseId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Enrollment.updateProgress:', error);
      throw error;
    }
  }

  static async getStudentCount(courseId) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
        [courseId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in Enrollment.getStudentCount:', error);
      throw error;
    }
  }

  static async getCompletionRate(courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM enrollments 
         WHERE course_id = ?`,
        [courseId]
      );
      
      const { total, completed } = rows[0];
      return total > 0 ? (completed / total) * 100 : 0;
    } catch (error) {
      console.error('Error in Enrollment.getCompletionRate:', error);
      throw error;
    }
  }
}

module.exports = Enrollment; 