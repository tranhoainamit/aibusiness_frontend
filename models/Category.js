const db = require('../config/database');

// Model danh mục
const Category = {
  // Tạo danh mục mới
  create: async (categoryData) => {
    try {
      const { name, description = null, parent_id = null } = categoryData;

      const [result] = await db.execute(
        'INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)',
        [name, description, parent_id]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi khi tạo danh mục:', error);
      throw new Error('Lỗi khi tạo danh mục: ' + error.message);
    }
  },

  // Tìm danh mục theo ID
  findById: async (id) => {
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
      console.error('Lỗi khi tìm danh mục:', error);
      throw new Error('Lỗi khi tìm danh mục: ' + error.message);
    }
  },

  // Lấy tất cả danh mục với tùy chọn thống kê
  findAll: async (includeStats = false) => {
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
      console.error('Lỗi khi lấy danh sách danh mục:', error);
      throw new Error('Lỗi khi lấy danh sách danh mục: ' + error.message);
    }
  },

  // Lấy danh mục dưới dạng cấu trúc cây
  getTree: async () => {
    try {
      const categories = await Category.findAll(true);
      const tree = [];
      const map = {};

      // Đầu tiên map các node của cây
      categories.forEach(cat => {
        map[cat.id] = {
          ...cat,
          children: []
        };
      });

      // Sau đó xây dựng cây
      categories.forEach(cat => {
        if (cat.parent_id) {
          // Nếu có parent, thêm vào mảng children của parent
          map[cat.parent_id].children.push(map[cat.id]);
        } else {
          // Nếu không có parent, đây là node gốc
          tree.push(map[cat.id]);
        }
      });

      return tree;
    } catch (error) {
      console.error('Lỗi khi xây dựng cây danh mục:', error);
      throw new Error('Lỗi khi xây dựng cây danh mục: ' + error.message);
    }
  },

  // Cập nhật danh mục
  update: async (id, categoryData) => {
    try {
      const { name, description, parent_id } = categoryData;

      // Kiểm tra tham chiếu vòng tròn
      if (parent_id) {
        let currentParent = parent_id;
        while (currentParent) {
          if (currentParent === id) {
            throw new Error('Phát hiện tham chiếu vòng tròn trong cấu trúc phân cấp danh mục');
          }
          const parent = await Category.findById(currentParent);
          currentParent = parent ? parent.parent_id : null;
        }
      }

      const [result] = await db.execute(
        'UPDATE categories SET name = ?, description = ?, parent_id = ? WHERE id = ?',
        [name, description, parent_id, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi cập nhật danh mục:', error);
      throw new Error('Lỗi khi cập nhật danh mục: ' + error.message);
    }
  },

  // Xóa danh mục
  delete: async (id) => {
    try {
      // Kiểm tra xem danh mục có khóa học không
      const [courses] = await db.execute(
        'SELECT COUNT(*) as count FROM courses WHERE category_id = ?',
        [id]
      );
      
      if (courses[0].count > 0) {
        throw new Error('Không thể xóa danh mục có chứa khóa học');
      }

      // Kiểm tra xem danh mục có danh mục con không
      const [children] = await db.execute(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
      );

      if (children[0].count > 0) {
        throw new Error('Không thể xóa danh mục có danh mục con');
      }

      const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi xóa danh mục:', error);
      throw new Error('Lỗi khi xóa danh mục: ' + error.message);
    }
  },

  // Lấy thống kê danh mục
  getStats: async () => {
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
      console.error('Lỗi khi lấy thống kê danh mục:', error);
      throw new Error('Lỗi khi lấy thống kê danh mục: ' + error.message);
    }
  },

  // Kiểm tra danh mục tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM categories WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của danh mục:', error);
      throw new Error('Lỗi khi kiểm tra sự tồn tại của danh mục: ' + error.message);
    }
  }
};

module.exports = Category;