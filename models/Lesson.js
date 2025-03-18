const db = require('../config/database');
const { validationResult } = require('express-validator');

class Lesson {
  static async create(lessonData) {
    try {
      const {
        course_id,
        title,
        video_url,
        duration,
        order_number,
        is_preview
      } = lessonData;

      const [result] = await db.execute(
        `INSERT INTO lessons (
          course_id, title, video_url, duration, order_number, is_preview
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [course_id, title, video_url, duration, order_number, is_preview]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Lesson.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT l.*, c.title as course_title, c.instructor_id
         FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Lesson.findById:', error);
      throw error;
    }
  }

  static async findByCourseId(courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT l.*, c.title as course_title, c.instructor_id
         FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.course_id = ?
         ORDER BY l.order_number ASC`,
        [courseId]
      );
      return rows;
    } catch (error) {
      console.error('Error in Lesson.findByCourseId:', error);
      throw error;
    }
  }

  static async update(id, lessonData) {
    try {
      const {
        title,
        video_url,
        duration,
        order_number,
        is_preview
      } = lessonData;

      const [result] = await db.execute(
        `UPDATE lessons SET
          title = ?, video_url = ?, duration = ?,
          order_number = ?, is_preview = ?
         WHERE id = ?`,
        [title, video_url, duration, order_number, is_preview, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Lesson.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM lessons WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Lesson.delete:', error);
      throw error;
    }
  }

  static async reorderLessons(courseId, lessonIds) {
    try {
      // Start transaction
      await db.execute('START TRANSACTION');

      // Update order numbers for each lesson
      for (let i = 0; i < lessonIds.length; i++) {
        await db.execute(
          'UPDATE lessons SET order_number = ? WHERE id = ? AND course_id = ?',
          [i + 1, lessonIds[i], courseId]
        );
      }

      // Commit transaction
      await db.execute('COMMIT');
      return true;
    } catch (error) {
      // Rollback transaction on error
      await db.execute('ROLLBACK');
      console.error('Error in Lesson.reorderLessons:', error);
      throw error;
    }
  }

  static async getNextLesson(courseId, currentLessonId) {
    try {
      const [rows] = await db.execute(
        `SELECT l.* FROM lessons l
         WHERE l.course_id = ? AND l.order_number > (
           SELECT order_number FROM lessons WHERE id = ?
         )
         ORDER BY l.order_number ASC
         LIMIT 1`,
        [courseId, currentLessonId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Lesson.getNextLesson:', error);
      throw error;
    }
  }

  static async getPreviousLesson(courseId, currentLessonId) {
    try {
      const [rows] = await db.execute(
        `SELECT l.* FROM lessons l
         WHERE l.course_id = ? AND l.order_number < (
           SELECT order_number FROM lessons WHERE id = ?
         )
         ORDER BY l.order_number DESC
         LIMIT 1`,
        [courseId, currentLessonId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Lesson.getPreviousLesson:', error);
      throw error;
    }
  }
}

module.exports = Lesson; 