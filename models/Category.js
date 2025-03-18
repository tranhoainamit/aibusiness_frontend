const db = require('../config/database');

class Category {
  // Create a new category
  static async create(categoryData) {
    try {
      const { name, description = null, parent_id = null } = categoryData;

      const [result] = await db.execute(
        'INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)',
        [name, description, parent_id]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating category: ' + error.message);
    }
  }

  // Find category by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM courses WHERE category_id = c.id) as course_count,
                p.name as parent_name
         FROM categories c
         LEFT JOIN categories p ON c.parent_id = p.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding category: ' + error.message);
    }
  }

  // Get all categories with optional filters
  static async findAll(includeStats = false) {
    try {
      let query = `
        SELECT c.*,
               p.name as parent_name
        ${includeStats ? ', (SELECT COUNT(*) FROM courses WHERE category_id = c.id) as course_count' : ''}
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY c.parent_id IS NULL DESC, c.name ASC
      `;

      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      throw new Error('Error finding categories: ' + error.message);
    }
  }

  // Get categories as a tree structure
  static async getTree() {
    try {
      const categories = await this.findAll(true);
      const tree = [];
      const map = {};

      // First map the nodes of the tree
      categories.forEach(cat => {
        map[cat.id] = {
          ...cat,
          children: []
        };
      });

      // Then build the tree
      categories.forEach(cat => {
        if (cat.parent_id) {
          // If it has a parent, add it to parent's children array
          map[cat.parent_id].children.push(map[cat.id]);
        } else {
          // If no parent, it's a root node
          tree.push(map[cat.id]);
        }
      });

      return tree;
    } catch (error) {
      throw new Error('Error building category tree: ' + error.message);
    }
  }

  // Update a category
  static async update(id, categoryData) {
    try {
      const { name, description, parent_id } = categoryData;

      // Check for circular reference
      if (parent_id) {
        let currentParent = parent_id;
        while (currentParent) {
          if (currentParent === id) {
            throw new Error('Circular reference detected in category hierarchy');
          }
          const parent = await this.findById(currentParent);
          currentParent = parent ? parent.parent_id : null;
        }
      }

      const [result] = await db.execute(
        'UPDATE categories SET name = ?, description = ?, parent_id = ? WHERE id = ?',
        [name, description, parent_id, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating category: ' + error.message);
    }
  }

  // Delete a category
  static async delete(id) {
    try {
      // Check if category has courses
      const [courses] = await db.execute(
        'SELECT COUNT(*) as count FROM courses WHERE category_id = ?',
        [id]
      );
      
      if (courses[0].count > 0) {
        throw new Error('Cannot delete category with associated courses');
      }

      // Check if category has child categories
      const [children] = await db.execute(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
      );

      if (children[0].count > 0) {
        throw new Error('Cannot delete category with child categories');
      }

      const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting category: ' + error.message);
    }
  }

  // Get category statistics
  static async getStats() {
    try {
      const [rows] = await db.execute(`
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT co.id) as course_count,
          COUNT(DISTINCT e.id) as enrollment_count,
          COUNT(DISTINCT u.id) as instructor_count
        FROM categories c
        LEFT JOIN courses co ON c.id = co.category_id
        LEFT JOIN enrollments e ON co.id = e.course_id
        LEFT JOIN users u ON co.instructor_id = u.id
        GROUP BY c.id, c.name
        ORDER BY c.name
      `);
      return rows;
    } catch (error) {
      throw new Error('Error getting category statistics: ' + error.message);
    }
  }

  // Check if a category exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM categories WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking category existence: ' + error.message);
    }
  }
}

module.exports = Category;