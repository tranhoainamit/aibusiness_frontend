const db = require('../config/database');
const slugify = require('slugify');

class Post {
  // Create a new post
  static async create(postData) {
    try {
      const {
        title,
        content,
        thumbnail,
        author_id,
        status = 'draft',
        meta_title,
        meta_description,
        canonical_url
      } = postData;

      // Generate slug from title
      const slug = slugify(title, {
        lower: true,
        strict: true
      });

      const [result] = await db.execute(
        `INSERT INTO posts (
          title, content, thumbnail, author_id, status,
          meta_title, meta_description, slug, canonical_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, content, thumbnail, author_id, status,
          meta_title, meta_description, slug, canonical_url
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Error creating post: ' + error.message);
    }
  }

  // Find post by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, u.username, u.full_name as author_name, u.avatar_url
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`,
        [id]
      );
      
      return rows[0];
    } catch (error) {
      console.error('Error finding post by ID:', error);
      throw new Error('Error finding post: ' + error.message);
    }
  }

  // Find post by slug
  static async findBySlug(slug) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, u.username, u.full_name as author_name, u.avatar_url
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.slug = ?`,
        [slug]
      );
      
      return rows[0];
    } catch (error) {
      console.error('Error finding post by slug:', error);
      throw new Error('Error finding post: ' + error.message);
    }
  }

  // Find all posts with filters
  static async findAll({ 
    author_id, 
    status, 
    search,
    category_id,
    page = 1, 
    limit = 10 
  }) {
    try {
      let query = `
        SELECT 
          p.*,
          u.username, 
          u.full_name as author_name, 
          u.avatar_url,
          COUNT(DISTINCT c.id) as comment_count
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN comments c ON c.post_id = p.id
      `;

      let queryParams = [];
      let whereConditions = [];

      // Add where conditions
      if (author_id) {
        whereConditions.push('p.author_id = ?');
        queryParams.push(author_id);
      }

      if (status) {
        whereConditions.push('p.status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // If filtering by category
      if (category_id) {
        query += `
          JOIN post_categories pc ON p.id = pc.post_id
        `;
        whereConditions.push('pc.category_id = ?');
        queryParams.push(category_id);
      }

      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += `
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const offset = (page - 1) * limit;
      queryParams.push(parseInt(limit), offset);

      const [rows] = await db.execute(query, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT p.id) as total 
        FROM posts p
      `;

      if (category_id) {
        countQuery += `
          JOIN post_categories pc ON p.id = pc.post_id
        `;
      }

      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }

      const [countResult] = await db.execute(countQuery, queryParams.slice(0, -2));

      // Get categories for each post
      for (const post of rows) {
        post.categories = await this.getCategories(post.id);
      }

      return {
        posts: rows,
        total: countResult[0].total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Error finding posts:', error);
      throw new Error('Error finding posts: ' + error.message);
    }
  }

  // Update a post
  static async update(id, postData) {
    try {
      if (postData.title) {
        // Update slug if title changes
        postData.slug = slugify(postData.title, {
          lower: true,
          strict: true
        });
      }

      const keys = Object.keys(postData);
      if (!keys.length) return false;

      const placeholders = keys.map(key => `${key} = ?`).join(', ');
      const values = keys.map(key => postData[key]);
      values.push(id);

      const query = `
        UPDATE posts
        SET ${placeholders}
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating post:', error);
      throw new Error('Error updating post: ' + error.message);
    }
  }

  // Delete a post
  static async delete(id) {
    try {
      // Delete related post categories
      await db.execute('DELETE FROM post_categories WHERE post_id = ?', [id]);
      // Delete the post
      const [result] = await db.execute('DELETE FROM posts WHERE id = ?', [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error('Error deleting post: ' + error.message);
    }
  }

  // Increment view count
  static async incrementViews(id) {
    try {
      await db.execute(
        'UPDATE posts SET views = views + 1 WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      console.error('Error incrementing views:', error);
      return false;
    }
  }

  // Add categories to a post
  static async addCategories(postId, categoryIds) {
    try {
      // Delete any existing categories
      await db.execute('DELETE FROM post_categories WHERE post_id = ?', [postId]);
      
      // Add new categories
      for (const categoryId of categoryIds) {
        await db.execute(
          'INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)',
          [postId, categoryId]
        );
      }
      return true;
    } catch (error) {
      console.error('Error adding categories to post:', error);
      throw new Error('Error adding categories: ' + error.message);
    }
  }

  // Remove all categories from a post
  static async removeCategories(postId) {
    try {
      await db.execute('DELETE FROM post_categories WHERE post_id = ?', [postId]);
      return true;
    } catch (error) {
      console.error('Error removing categories from post:', error);
      throw new Error('Error removing categories: ' + error.message);
    }
  }

  // Get categories for a post
  static async getCategories(postId) {
    try {
      const [rows] = await db.execute(
        `SELECT c.* 
         FROM categories c
         JOIN post_categories pc ON c.id = pc.category_id
         WHERE pc.post_id = ?`,
        [postId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting categories for post:', error);
      return [];
    }
  }

  // Check if post exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM posts WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Error checking post existence:', error);
      return false;
    }
  }
}

module.exports = Post; 