const db = require('../config/database');

class Partner {
  // Create a new partner
  static async create(partnerData) {
    try {
      const {
        name,
        logo_url = null,
        website_url = null,
        description = null,
        is_active = true
      } = partnerData;

      const [result] = await db.execute(
        `INSERT INTO partners (
          name, logo_url, website_url, description,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [name, logo_url, website_url, description, is_active]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating partner: ' + error.message);
    }
  }

  // Find partner by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM partners WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding partner: ' + error.message);
    }
  }

  // Get all partners with filters
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM partners WHERE 1=1';
      const params = [];

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM partners WHERE 1=1';
      if (filters.is_active !== undefined) {
        countQuery += ' AND is_active = ?';
      }
      if (filters.search) {
        countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      }

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        partners: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding partners: ' + error.message);
    }
  }

  // Update partner
  static async update(id, updateData) {
    try {
      const allowedFields = ['name', 'logo_url', 'website_url', 'description', 'is_active'];
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
      const query = `UPDATE partners SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating partner: ' + error.message);
    }
  }

  // Delete partner
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM partners WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting partner: ' + error.message);
    }
  }

  // Toggle partner active status
  static async toggleActive(id) {
    try {
      const [result] = await db.execute(
        'UPDATE partners SET is_active = NOT is_active WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error toggling partner status: ' + error.message);
    }
  }

  // Get active partners
  static async getActive() {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM partners WHERE is_active = true ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      throw new Error('Error getting active partners: ' + error.message);
    }
  }

  // Check if partner exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM partners WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking partner existence: ' + error.message);
    }
  }
}

module.exports = Partner; 