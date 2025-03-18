const db = require('../config/database');

class Image {
  // Create a new image record
  static async create(imageData) {
    try {
      const {
        url,
        alt_text = null,
        uploaded_by,
        file_size = null
      } = imageData;

      const [result] = await db.execute(
        `INSERT INTO images (
          url, alt_text, uploaded_by, file_size, created_at
        ) VALUES (?, ?, ?, ?, NOW())`,
        [url, alt_text, uploaded_by, file_size]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating image record: ' + error.message);
    }
  }

  // Find image by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT i.*, u.fullname as uploader_name
         FROM images i
         LEFT JOIN users u ON i.uploaded_by = u.id
         WHERE i.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding image: ' + error.message);
    }
  }

  // Get all images with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT i.*, u.fullname as uploader_name
        FROM images i
        LEFT JOIN users u ON i.uploaded_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.uploaded_by) {
        query += ' AND i.uploaded_by = ?';
        params.push(filters.uploaded_by);
      }

      if (filters.search) {
        query += ' AND (i.alt_text LIKE ? OR i.url LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add date range filter
      if (filters.start_date) {
        query += ' AND i.created_at >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND i.created_at <= ?';
        params.push(filters.end_date);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM images i
        WHERE 1=1
      `;
      if (filters.uploaded_by) countQuery += ' AND i.uploaded_by = ?';
      if (filters.search) {
        countQuery += ' AND (i.alt_text LIKE ? OR i.url LIKE ?)';
      }
      if (filters.start_date) countQuery += ' AND i.created_at >= ?';
      if (filters.end_date) countQuery += ' AND i.created_at <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        images: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding images: ' + error.message);
    }
  }

  // Update image
  static async update(id, updateData) {
    try {
      const allowedFields = ['url', 'alt_text'];
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
      const query = `UPDATE images SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating image: ' + error.message);
    }
  }

  // Delete image
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM images WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting image: ' + error.message);
    }
  }

  // Check if image exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM images WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking image existence: ' + error.message);
    }
  }

  // Get images by user
  static async getByUser(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const [rows] = await db.execute(
        `SELECT i.*, u.fullname as uploader_name
         FROM images i
         LEFT JOIN users u ON i.uploaded_by = u.id
         WHERE i.uploaded_by = ?
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM images WHERE uploaded_by = ?',
        [userId]
      );

      return {
        images: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error getting user images: ' + error.message);
    }
  }
}

module.exports = Image; 