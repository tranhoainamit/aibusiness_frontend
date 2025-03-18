const db = require('../config/database');

class Banner {
  // Create a new banner
  static async create(bannerData) {
    try {
      const {
        image_id,
        title,
        description,
        link,
        position,
        is_active = true,
        start_date,
        end_date
      } = bannerData;

      const [result] = await db.execute(
        `INSERT INTO banners (
          image_id, title, description, link, position,
          is_active, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          image_id, title, description, link, position,
          is_active, start_date, end_date
        ]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating banner: ' + error.message);
    }
  }

  // Find banner by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT b.*, i.url as image_url, i.alt_text as image_alt
         FROM banners b
         LEFT JOIN images i ON b.image_id = i.id
         WHERE b.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding banner: ' + error.message);
    }
  }

  // Get all banners with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT b.*, i.url as image_url, i.alt_text as image_alt
        FROM banners b
        LEFT JOIN images i ON b.image_id = i.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.position) {
        query += ' AND b.position = ?';
        params.push(filters.position);
      }

      if (filters.is_active !== undefined) {
        query += ' AND b.is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.current_date) {
        query += ` AND (b.start_date IS NULL OR b.start_date <= ?)
                  AND (b.end_date IS NULL OR b.end_date >= ?)`;
        params.push(filters.current_date, filters.current_date);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM banners b WHERE 1=1' +
        (filters.position ? ' AND b.position = ?' : '') +
        (filters.is_active !== undefined ? ' AND b.is_active = ?' : '') +
        (filters.current_date ? ' AND (b.start_date IS NULL OR b.start_date <= ?) AND (b.end_date IS NULL OR b.end_date >= ?)' : ''),
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        banners: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding banners: ' + error.message);
    }
  }

  // Get active banners by position
  static async getActiveByPosition(position, date = new Date()) {
    try {
      const [rows] = await db.execute(
        `SELECT b.*, i.url as image_url, i.alt_text as image_alt
         FROM banners b
         LEFT JOIN images i ON b.image_id = i.id
         WHERE b.position = ?
         AND b.is_active = true
         AND (b.start_date IS NULL OR b.start_date <= ?)
         AND (b.end_date IS NULL OR b.end_date >= ?)
         ORDER BY b.created_at DESC`,
        [position, date, date]
      );
      return rows;
    } catch (error) {
      throw new Error('Error getting active banners: ' + error.message);
    }
  }

  // Update banner
  static async update(id, bannerData) {
    try {
      const {
        image_id,
        title,
        description,
        link,
        position,
        is_active,
        start_date,
        end_date
      } = bannerData;

      let query = 'UPDATE banners SET ';
      const updates = [];
      const params = [];

      if (image_id !== undefined) {
        updates.push('image_id = ?');
        params.push(image_id);
      }
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (link !== undefined) {
        updates.push('link = ?');
        params.push(link);
      }
      if (position !== undefined) {
        updates.push('position = ?');
        params.push(position);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        params.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        params.push(end_date);
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating banner: ' + error.message);
    }
  }

  // Delete banner
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM banners WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting banner: ' + error.message);
    }
  }

  // Check if banner exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM banners WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking banner existence: ' + error.message);
    }
  }
}

module.exports = Banner; 