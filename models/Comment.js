const db = require('../config/database');

class Comment {
  // Create a new comment
  static async create(commentData) {
    try {
      const {
        user_id,
        content,
        parent_id = null,
        lesson_id = null,
        post_id = null,
        is_active = true
      } = commentData;

      const [result] = await db.execute(
        `INSERT INTO comments (
          user_id, content, parent_id, lesson_id,
          post_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [user_id, content, parent_id, lesson_id, post_id, is_active]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating comment: ' + error.message);
    }
  }

  // Find comment by ID with user info
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, u.fullname as user_name, u.avatar_url,
                COUNT(r.id) as replies_count
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN comments r ON r.parent_id = c.id
         WHERE c.id = ?
         GROUP BY c.id`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding comment: ' + error.message);
    }
  }

  // Get all comments with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT c.*, u.fullname as user_name, u.avatar_url,
               COUNT(r.id) as replies_count
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN comments r ON r.parent_id = c.id
        WHERE c.parent_id IS NULL
      `;
      const params = [];

      if (filters.lesson_id) {
        query += ' AND c.lesson_id = ?';
        params.push(filters.lesson_id);
      }

      if (filters.post_id) {
        query += ' AND c.post_id = ?';
        params.push(filters.post_id);
      }

      if (filters.user_id) {
        query += ' AND c.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.is_active !== undefined) {
        query += ' AND c.is_active = ?';
        params.push(filters.is_active);
      }

      query += ' GROUP BY c.id';
      query += ' ORDER BY c.created_at DESC';

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM comments c
        WHERE c.parent_id IS NULL
      `;
      if (filters.lesson_id) countQuery += ' AND c.lesson_id = ?';
      if (filters.post_id) countQuery += ' AND c.post_id = ?';
      if (filters.user_id) countQuery += ' AND c.user_id = ?';
      if (filters.is_active !== undefined) countQuery += ' AND c.is_active = ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        comments: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding comments: ' + error.message);
    }
  }

  // Get replies for a comment
  static async getReplies(commentId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const [rows] = await db.execute(
        `SELECT c.*, u.fullname as user_name, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC
         LIMIT ? OFFSET ?`,
        [commentId, limit, offset]
      );

      // Get total replies count
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM comments WHERE parent_id = ?',
        [commentId]
      );

      return {
        replies: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error getting replies: ' + error.message);
    }
  }

  // Update comment
  static async update(id, commentData) {
    try {
      const { content, is_active } = commentData;

      let query = 'UPDATE comments SET ';
      const updates = [];
      const params = [];

      if (content !== undefined) {
        updates.push('content = ?');
        params.push(content);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
      }

      if (updates.length === 0) {
        return false;
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating comment: ' + error.message);
    }
  }

  // Delete comment
  static async delete(id) {
    try {
      // First, delete all replies
      await db.execute('DELETE FROM comments WHERE parent_id = ?', [id]);
      // Then delete the comment itself
      const [result] = await db.execute('DELETE FROM comments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting comment: ' + error.message);
    }
  }

  // Check if comment exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM comments WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking comment existence: ' + error.message);
    }
  }

  // Get comment counts
  static async getCounts(filters = {}) {
    try {
      let query = 'SELECT COUNT(*) as total FROM comments WHERE 1=1';
      const params = [];

      if (filters.lesson_id) {
        query += ' AND lesson_id = ?';
        params.push(filters.lesson_id);
      }
      if (filters.post_id) {
        query += ' AND post_id = ?';
        params.push(filters.post_id);
      }
      if (filters.user_id) {
        query += ' AND user_id = ?';
        params.push(filters.user_id);
      }

      const [result] = await db.execute(query, params);
      return result[0].total;
    } catch (error) {
      throw new Error('Error getting comment counts: ' + error.message);
    }
  }
}

module.exports = Comment; 