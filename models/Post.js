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
      throw new Error('Error creating post: ' + error.message);
    }
  }

  // Find post by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, u.username, u.full_name as author_name, u.avatar_url as author_avatar,
                (SELECT GROUP_CONCAT(c.name) 
                 FROM categories c 
                 JOIN category_items ci ON c.id = ci.category_id 
                 WHERE ci.item_id = p.id AND ci.item_type = 'post'
                ) as categories
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`,
        [id]
      );
      
      const post = rows[0];
      if (post) {
        post.categories = post.categories ? post.categories.split(',') : [];
      }
      return post;
    } catch (error) {
      throw new Error('Error finding post: ' + error.message);
    }
  }

  // Find post by slug
  static async findBySlug(slug) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, u.username, u.full_name as author_name, u.avatar_url as author_avatar,
                (SELECT GROUP_CONCAT(c.name) 
                 FROM categories c 
                 JOIN category_items ci ON c.id = ci.category_id 
                 WHERE ci.item_id = p.id AND ci.item_type = 'post'
                ) as categories
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.slug = ?`,
        [slug]
      );
      
      const post = rows[0];
      if (post) {
        post.categories = post.categories ? post.categories.split(',') : [];
      }
      return post;
    } catch (error) {
      throw new Error('Error finding post by slug: ' + error.message);
    }
  }

  // Get all posts with filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, u.username, u.full_name as author_name, u.avatar_url as author_avatar,
               (SELECT GROUP_CONCAT(c.name) 
                FROM categories c 
                JOIN category_items ci ON c.id = ci.category_id 
                WHERE ci.item_id = p.id AND ci.item_type = 'post'
               ) as categories
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.author_id) {
        query += ' AND p.author_id = ?';
        params.push(filters.author_id);
      }

      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.search) {
        query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.category_id) {
        query += `
          AND EXISTS (
            SELECT 1 FROM category_items ci 
            WHERE ci.item_id = p.id 
            AND ci.item_type = 'post' 
            AND ci.category_id = ?
          )
        `;
        params.push(filters.category_id);
      }

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);
      
      // Process categories for each post
      rows.forEach(post => {
        post.categories = post.categories ? post.categories.split(',') : [];
      });

      // Get total count for pagination
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM posts p WHERE 1=1' +
        (filters.author_id ? ' AND p.author_id = ?' : '') +
        (filters.status ? ' AND p.status = ?' : '') +
        (filters.search ? ' AND (p.title LIKE ? OR p.content LIKE ?)' : '') +
        (filters.category_id ? ' AND EXISTS (SELECT 1 FROM category_items ci WHERE ci.item_id = p.id AND ci.item_type = "post" AND ci.category_id = ?)' : ''),
        params.slice(0, -2) // Remove limit and offset
      );

      return {
        posts: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error('Error finding posts: ' + error.message);
    }
  }

  // Update a post
  static async update(id, postData) {
    try {
      const {
        title,
        content,
        thumbnail,
        status,
        meta_title,
        meta_description,
        canonical_url
      } = postData;

      // Generate new slug if title is updated
      let slug = null;
      if (title) {
        slug = slugify(title, {
          lower: true,
          strict: true
        });
      }

      let query = 'UPDATE posts SET ';
      const updates = [];
      const params = [];

      if (title) {
        updates.push('title = ?');
        params.push(title);
      }
      if (content) {
        updates.push('content = ?');
        params.push(content);
      }
      if (thumbnail) {
        updates.push('thumbnail = ?');
        params.push(thumbnail);
      }
      if (status) {
        updates.push('status = ?');
        params.push(status);
      }
      if (meta_title) {
        updates.push('meta_title = ?');
        params.push(meta_title);
      }
      if (meta_description) {
        updates.push('meta_description = ?');
        params.push(meta_description);
      }
      if (canonical_url) {
        updates.push('canonical_url = ?');
        params.push(canonical_url);
      }
      if (slug) {
        updates.push('slug = ?');
        params.push(slug);
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating post: ' + error.message);
    }
  }

  // Delete a post
  static async delete(id) {
    try {
      // Delete category items first
      await db.execute(
        'DELETE FROM category_items WHERE item_id = ? AND item_type = "post"',
        [id]
      );

      // Then delete the post
      const [result] = await db.execute('DELETE FROM posts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting post: ' + error.message);
    }
  }

  // Increment view count
  static async incrementViews(id) {
    try {
      await db.execute(
        'UPDATE posts SET views_count = views_count + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new Error('Error incrementing view count: ' + error.message);
    }
  }

  // Add categories to a post
  static async addCategories(postId, categoryIds) {
    try {
      const values = categoryIds.map(categoryId => [postId, categoryId, 'post']);
      await db.execute(
        'INSERT INTO category_items (item_id, category_id, item_type) VALUES ?',
        [values]
      );
    } catch (error) {
      throw new Error('Error adding categories to post: ' + error.message);
    }
  }

  // Remove categories from a post
  static async removeCategories(postId, categoryIds) {
    try {
      await db.execute(
        'DELETE FROM category_items WHERE item_id = ? AND category_id IN (?) AND item_type = "post"',
        [postId, categoryIds]
      );
    } catch (error) {
      throw new Error('Error removing categories from post: ' + error.message);
    }
  }
}

module.exports = Post; 