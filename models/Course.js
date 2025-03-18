const db = require('../config/database');
const { validationResult } = require('express-validator');

class Course {
  static async create(courseData) {
    try {
      const {
        title,
        description,
        price,
        sale_price,
        thumbnail,
        instructor_id,
        level,
        meta_title,
        meta_description,
        slug,
        canonical_url
      } = courseData;

      const [result] = await db.execute(
        `INSERT INTO courses (
          title, description, price, sale_price, thumbnail, instructor_id,
          level, meta_title, meta_description, slug, canonical_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, description, price, sale_price, thumbnail, instructor_id,
          level, meta_title, meta_description, slug, canonical_url
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Course.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, u.username as instructor_name, u.full_name as instructor_full_name
         FROM courses c
         LEFT JOIN users u ON c.instructor_id = u.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Course.findById:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT c.*, u.username as instructor_name, u.full_name as instructor_full_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.instructor_id) {
        query += ' AND c.instructor_id = ?';
        params.push(filters.instructor_id);
      }

      if (filters.level) {
        query += ' AND c.level = ?';
        params.push(filters.level);
      }

      if (filters.is_published !== undefined) {
        query += ' AND c.is_published = ?';
        params.push(filters.is_published);
      }

      if (filters.search) {
        query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Course.findAll:', error);
      throw error;
    }
  }

  static async update(id, courseData) {
    try {
      const {
        title,
        description,
        price,
        sale_price,
        thumbnail,
        level,
        meta_title,
        meta_description,
        slug,
        canonical_url,
        is_published
      } = courseData;

      const [result] = await db.execute(
        `UPDATE courses SET
          title = ?, description = ?, price = ?, sale_price = ?,
          thumbnail = ?, level = ?, meta_title = ?, meta_description = ?,
          slug = ?, canonical_url = ?, is_published = ?
         WHERE id = ?`,
        [
          title, description, price, sale_price, thumbnail, level,
          meta_title, meta_description, slug, canonical_url, is_published, id
        ]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Course.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Course.delete:', error);
      throw error;
    }
  }

  static async addCategory(courseId, categoryId) {
    try {
      const [result] = await db.execute(
        'INSERT INTO category_items (category_id, item_id, item_type) VALUES (?, ?, "course")',
        [categoryId, courseId]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error in Course.addCategory:', error);
      throw error;
    }
  }

  static async removeCategory(courseId, categoryId) {
    try {
      const [result] = await db.execute(
        'DELETE FROM category_items WHERE category_id = ? AND item_id = ? AND item_type = "course"',
        [categoryId, courseId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Course.removeCategory:', error);
      throw error;
    }
  }

  static async getCategories(courseId) {
    try {
      const [rows] = await db.execute(
        `SELECT c.* FROM categories c
         JOIN category_items ci ON c.id = ci.category_id
         WHERE ci.item_id = ? AND ci.item_type = "course"`,
        [courseId]
      );
      return rows;
    } catch (error) {
      console.error('Error in Course.getCategories:', error);
      throw error;
    }
  }
}

module.exports = Course; 