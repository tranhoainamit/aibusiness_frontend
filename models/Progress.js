const db = require('../config/database');

class Progress {
  static async create(progressData) {
    try {
      const {
        user_id,
        course_id,
        lesson_id,
        is_completed,
        progress_percentage
      } = progressData;

      const [result] = await db.execute(
        `INSERT INTO user_progress (
          user_id, course_id, lesson_id, 
          is_completed, progress_percentage,
          last_watched
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [user_id, course_id, lesson_id, is_completed || false, progress_percentage || 0]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Progress.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, 
                u.username, u.full_name,
                l.title as lesson_title,
                c.title as course_title
         FROM user_progress p
         JOIN users u ON p.user_id = u.id
         JOIN lessons l ON p.lesson_id = l.id
         JOIN courses c ON p.course_id = c.id
         WHERE p.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Progress.findById:', error);
      throw error;
    }
  }

  static async findByUserAndLesson(userId, lessonId) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, 
                u.username, u.full_name,
                l.title as lesson_title,
                c.title as course_title
         FROM user_progress p
         JOIN users u ON p.user_id = u.id
         JOIN lessons l ON p.lesson_id = l.id
         JOIN courses c ON p.course_id = c.id
         WHERE p.user_id = ? AND p.lesson_id = ?`,
        [userId, lessonId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Progress.findByUserAndLesson:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, 
               u.username, u.full_name,
               l.title as lesson_title,
               c.title as course_title
        FROM user_progress p
        JOIN users u ON p.user_id = u.id
        JOIN lessons l ON p.lesson_id = l.id
        JOIN courses c ON p.course_id = c.id
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

      if (filters.lesson_id) {
        query += ' AND p.lesson_id = ?';
        params.push(filters.lesson_id);
      }

      if (filters.is_completed !== undefined) {
        query += ' AND p.is_completed = ?';
        params.push(filters.is_completed);
      }

      query += ' ORDER BY p.last_watched DESC';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Progress.findAll:', error);
      throw error;
    }
  }

  static async update(id, progressData) {
    try {
      const {
        is_completed,
        progress_percentage
      } = progressData;

      const [result] = await db.execute(
        `UPDATE user_progress SET
          is_completed = ?,
          progress_percentage = ?,
          completed_at = CASE WHEN ? = TRUE THEN NOW() ELSE completed_at END,
          last_watched = NOW()
         WHERE id = ?`,
        [is_completed, progress_percentage, is_completed, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Progress.update:', error);
      throw error;
    }
  }

  static async updateOrCreate(userId, courseId, lessonId, progressData) {
    try {
      const [existing] = await db.execute(
        'SELECT id FROM user_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?',
        [userId, courseId, lessonId]
      );

      if (existing.length > 0) {
        return this.update(existing[0].id, progressData);
      } else {
        return this.create({
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          ...progressData
        });
      }
    } catch (error) {
      console.error('Error in Progress.updateOrCreate:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM user_progress WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Progress.delete:', error);
      throw error;
    }
  }

  static async getCourseProgress(userId, courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          COUNT(l.id) as total_lessons,
          SUM(CASE WHEN p.is_completed THEN 1 ELSE 0 END) as completed_lessons,
          AVG(COALESCE(p.progress_percentage, 0)) as average_progress
         FROM lessons l
         LEFT JOIN user_progress p ON l.id = p.lesson_id AND p.user_id = ?
         WHERE l.course_id = ?`,
        [userId, courseId]
      );
      
      const { total_lessons, completed_lessons, average_progress } = rows[0];
      return {
        total_lessons,
        completed_lessons: completed_lessons || 0,
        completion_percentage: total_lessons > 0 ? ((completed_lessons || 0) / total_lessons) * 100 : 0,
        average_progress: average_progress || 0
      };
    } catch (error) {
      console.error('Error in Progress.getCourseProgress:', error);
      throw error;
    }
  }

  static async getLastWatched(userId, courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, l.title as lesson_title
         FROM user_progress p
         JOIN lessons l ON p.lesson_id = l.id
         WHERE p.user_id = ? AND p.course_id = ?
         ORDER BY p.last_watched DESC
         LIMIT 1`,
        [userId, courseId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Progress.getLastWatched:', error);
      throw error;
    }
  }
}

module.exports = Progress; 