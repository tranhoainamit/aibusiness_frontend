const db = require('../config/database');

class Widget {
  // Create a new widget
  static async create(widgetData) {
    try {
      const {
        name,
        content = null,
        position = null,
        is_active = true,
        order_number = null
      } = widgetData;

      const [result] = await db.execute(
        `INSERT INTO widgets (
          name, content, position, is_active,
          order_number, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [name, content, position, is_active, order_number]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating widget: ' + error.message);
    }
  }

  // Find widget by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM widgets WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding widget: ' + error.message);
    }
  }

  // Get all widgets with filters
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM widgets WHERE 1=1';
      const params = [];

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.position) {
        query += ' AND position = ?';
        params.push(filters.position);
      }

      if (filters.search) {
        query += ' AND (name LIKE ? OR content LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY position ASC, order_number ASC, created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM widgets WHERE 1=1';
      if (filters.is_active !== undefined) {
        countQuery += ' AND is_active = ?';
      }
      if (filters.position) {
        countQuery += ' AND position = ?';
      }
      if (filters.search) {
        countQuery += ' AND (name LIKE ? OR content LIKE ?)';
      }

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        widgets: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding widgets: ' + error.message);
    }
  }

  // Update widget
  static async update(id, updateData) {
    try {
      const allowedFields = ['name', 'content', 'position', 'is_active', 'order_number'];
      const updates = [];
      const values = [];

      // Build update query dynamically
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);
      const query = `UPDATE widgets SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating widget: ' + error.message);
    }
  }

  // Delete widget
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM widgets WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting widget: ' + error.message);
    }
  }

  // Toggle widget active status
  static async toggleActive(id) {
    try {
      const [result] = await db.execute(
        'UPDATE widgets SET is_active = NOT is_active WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error toggling widget status: ' + error.message);
    }
  }

  // Get widgets by position
  static async getByPosition(position) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM widgets 
         WHERE position = ? AND is_active = true 
         ORDER BY order_number ASC, created_at DESC`,
        [position]
      );
      return rows;
    } catch (error) {
      throw new Error('Error getting widgets by position: ' + error.message);
    }
  }

  // Update widget order
  static async updateOrder(id, newOrder) {
    try {
      const [result] = await db.execute(
        'UPDATE widgets SET order_number = ? WHERE id = ?',
        [newOrder, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating widget order: ' + error.message);
    }
  }

  // Check if widget exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM widgets WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking widget existence: ' + error.message);
    }
  }
}

module.exports = Widget; 