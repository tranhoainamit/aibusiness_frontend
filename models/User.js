const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  // Find user by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT u.*, r.name as role_name 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding user: ' + error.message);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const [rows] = await db.execute(
        `SELECT u.*, r.name as role_name 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.email = ?`,
        [email]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding user: ' + error.message);
    }
  }

  // Create a new user
  static async create(userData) {
    try {
      const {
        fullname,
        email,
        password,
        phone = null,
        avatar = null,
        role_id = 1, // Default role is regular user
        is_active = true
      } = userData;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const [result] = await db.execute(
        `INSERT INTO users (
          fullname, email, password, phone, avatar,
          role_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [fullname, email, hashedPassword, phone, avatar, role_id, is_active]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      const allowedFields = ['fullname', 'phone', 'avatar', 'is_active'];
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
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  }

  // Update password
  static async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const [result] = await db.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating password: ' + error.message);
    }
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  static generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  // Check if user exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking user existence: ' + error.message);
    }
  }

  // Get all users with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT u.id, u.fullname, u.email, u.phone, u.avatar,
               u.role_id, r.name as role_name, u.is_active,
               u.created_at, u.updated_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.role_id) {
        query += ' AND u.role_id = ?';
        params.push(filters.role_id);
      }

      if (filters.is_active !== undefined) {
        query += ' AND u.is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.search) {
        query += ' AND (u.fullname LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM users u
        WHERE 1=1
      `;
      if (filters.role_id) countQuery += ' AND u.role_id = ?';
      if (filters.is_active !== undefined) countQuery += ' AND u.is_active = ?';
      if (filters.search) {
        countQuery += ' AND (u.fullname LIKE ? OR u.email LIKE ?)';
      }

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        users: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding users: ' + error.message);
    }
  }
}

module.exports = User; 
module.exports = User; 