const db = require('../config/database');

// Model vai trò người dùng
const Role = {
  // Tạo vai trò mới
  create: async (roleData) => {
    try {
      const { name, description = null } = roleData;

      // Validate dữ liệu đầu vào
      if (!name) {
        throw new Error('Tên vai trò không được để trống');
      }

      // Kiểm tra tên vai trò đã tồn tại chưa
      const existingRole = await Role.findByName(name);
      if (existingRole) {
        throw new Error('Tên vai trò đã tồn tại');
      }

      const [result] = await db.execute(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo vai trò:', error);
      throw new Error('Lỗi tạo vai trò: ' + error.message);
    }
  },

  // Tìm vai trò theo ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                GROUP_CONCAT(p.permission) as permissions
         FROM roles r
         LEFT JOIN permissions p ON r.id = p.role_id
         WHERE r.id = ?
         GROUP BY r.id`,
        [id]
      );

      if (rows[0]) {
        rows[0].permissions = rows[0].permissions ? rows[0].permissions.split(',') : [];
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm vai trò theo ID:', error);
      throw new Error('Lỗi tìm vai trò: ' + error.message);
    }
  },

  // Tìm vai trò theo tên
  findByName: async (name) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM roles WHERE name = ?',
        [name]
      );
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm vai trò theo tên:', error);
      throw new Error('Lỗi tìm vai trò: ' + error.message);
    }
  },

  // Tìm vai trò theo tên và bao gồm danh sách quyền
  findByNameWithPermissions: async (name) => {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                GROUP_CONCAT(p.permission) as permissions
         FROM roles r
         LEFT JOIN permissions p ON r.id = p.role_id
         WHERE r.name = ?
         GROUP BY r.id`,
        [name]
      );

      if (rows[0]) {
        rows[0].permissions = rows[0].permissions ? rows[0].permissions.split(',') : [];
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm vai trò theo tên kèm quyền:', error);
      throw new Error('Lỗi tìm vai trò: ' + error.message);
    }
  },

  // Lấy tất cả vai trò và quyền hạn
  findAll: async (options = {}) => {
    try {
      let query = `
        SELECT r.*, 
               GROUP_CONCAT(p.permission) as permissions
        FROM roles r
        LEFT JOIN permissions p ON r.id = p.role_id
      `;

      const whereConditions = [];
      const params = [];

      if (options.search) {
        whereConditions.push('r.name LIKE ?');
        params.push(`%${options.search}%`);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += ' GROUP BY r.id';

      if (options.sortBy) {
        query += ` ORDER BY r.${options.sortBy} ${options.sortDesc ? 'DESC' : 'ASC'}`;
      } else {
        query += ' ORDER BY r.id ASC';
      }

      // Thêm phân trang
      if (options.limit) {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit);
        const offset = (page - 1) * limit;
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const [rows] = await db.execute(query, params);

      // Chuyển đổi chuỗi quyền hạn thành mảng
      rows.forEach(role => {
        role.permissions = role.permissions ? role.permissions.split(',') : [];
      });

      // Nếu có phân trang, lấy tổng số bản ghi
      if (options.limit) {
        let countQuery = 'SELECT COUNT(*) as total FROM roles r';
        
        if (whereConditions.length > 0) {
          countQuery += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        const [countResult] = await db.execute(
          countQuery,
          params.slice(0, -2) // Loại bỏ limit và offset
        );
        
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit);
        
        return {
          roles: rows,
          total: countResult[0].total,
          page,
          totalPages: Math.ceil(countResult[0].total / limit)
        };
      }

      return rows;
    } catch (error) {
      console.error('Lỗi lấy danh sách vai trò:', error);
      throw new Error('Lỗi lấy danh sách vai trò: ' + error.message);
    }
  },

  // Cập nhật vai trò
  update: async (id, roleData) => {
    try {
      const { name, description } = roleData;

      // Validate dữ liệu đầu vào
      if (!name) {
        throw new Error('Tên vai trò không được để trống');
      }

      // Kiểm tra tên vai trò đã tồn tại chưa (nếu đổi tên)
      if (name) {
        const existingRole = await Role.findByName(name);
        if (existingRole && existingRole.id !== parseInt(id)) {
          throw new Error('Tên vai trò đã tồn tại');
        }
      }

      const [result] = await db.execute(
        'UPDATE roles SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật vai trò:', error);
      throw new Error('Lỗi cập nhật vai trò: ' + error.message);
    }
  },

  // Xóa vai trò
  delete: async (id) => {
    try {
      // Kiểm tra xem có người dùng nào đang sử dụng vai trò này không
      const userCount = await Role.getUsersCount(id);
      if (userCount > 0) {
        throw new Error(`Không thể xóa vai trò này vì đang có ${userCount} người dùng đang sử dụng.`);
      }

      // Bắt đầu giao dịch
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Xóa các quyền hạn liên quan trước
        await connection.execute('DELETE FROM permissions WHERE role_id = ?', [id]);
        
        // Sau đó xóa vai trò
        const [result] = await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
        
        await connection.commit();
        connection.release();
        
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Lỗi xóa vai trò:', error);
      throw new Error('Lỗi xóa vai trò: ' + error.message);
    }
  },

  // Thêm quyền hạn cho vai trò
  addPermission: async (roleId, permission) => {
    try {
      const [result] = await db.execute(
        'INSERT INTO permissions (role_id, permission) VALUES (?, ?)',
        [roleId, permission]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi thêm quyền hạn:', error);
      throw new Error('Lỗi thêm quyền hạn: ' + error.message);
    }
  },

  // Cập nhật quyền hạn cho vai trò
  updatePermissions: async (roleId, permissions) => {
    try {
      // Bắt đầu giao dịch
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Đầu tiên, xóa các quyền hạn hiện có
        await connection.execute('DELETE FROM permissions WHERE role_id = ?', [roleId]);

        // Sau đó thêm quyền hạn mới
        if (permissions && permissions.length > 0) {
          for (const permission of permissions) {
            await connection.execute(
              'INSERT INTO permissions (role_id, permission) VALUES (?, ?)',
              [roleId, permission]
            );
          }
        }

        await connection.commit();
        connection.release();
        
        return true;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Lỗi cập nhật quyền hạn:', error);
      throw new Error('Lỗi cập nhật quyền hạn: ' + error.message);
    }
  },

  // Xóa quyền hạn của vai trò
  removePermission: async (roleId, permission) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM permissions WHERE role_id = ? AND permission = ?',
        [roleId, permission]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa quyền hạn:', error);
      throw new Error('Lỗi xóa quyền hạn: ' + error.message);
    }
  },

  // Kiểm tra nếu vai trò có quyền hạn cụ thể
  hasPermission: async (roleId, permission) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM permissions WHERE role_id = ? AND permission = ?) as exist',
        [roleId, permission]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra quyền hạn:', error);
      throw new Error('Lỗi kiểm tra quyền hạn: ' + error.message);
    }
  },

  // Lấy tất cả quyền hạn của vai trò
  getPermissions: async (roleId) => {
    try {
      const [rows] = await db.execute(
        'SELECT permission FROM permissions WHERE role_id = ?',
        [roleId]
      );
      return rows.map(row => row.permission);
    } catch (error) {
      console.error('Lỗi lấy danh sách quyền hạn:', error);
      throw new Error('Lỗi lấy danh sách quyền hạn: ' + error.message);
    }
  },

  // Kiểm tra nếu vai trò tồn tại
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM roles WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của vai trò:', error);
      return false;
    }
  },

  // Lấy số lượng người dùng theo vai trò
  getUsersCount: async (roleId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
        [roleId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Lỗi lấy số lượng người dùng theo vai trò:', error);
      throw new Error('Lỗi lấy số lượng người dùng: ' + error.message);
    }
  },

  // Tạo vai trò mặc định
  createDefaultRoles: async () => {
    try {
      // Kiểm tra xem đã có vai trò nào chưa
      const [roles] = await db.execute('SELECT COUNT(*) as count FROM roles');
      
      if (roles[0].count > 0) {
        return; // Đã có vai trò, không cần tạo mặc định
      }
      
      // Danh sách vai trò mặc định
      const defaultRoles = [
        { name: 'Admin', description: 'Quản trị viên với tất cả quyền hạn' },
        { name: 'Instructor', description: 'Giảng viên quản lý khóa học và nội dung' },
        { name: 'User', description: 'Người dùng thông thường' }
      ];
      
      // Danh sách quyền hạn mặc định cho từng vai trò
      const permissions = {
        'Admin': [
          'manage_users', 'manage_roles', 'manage_courses', 
          'manage_categories', 'manage_payments', 'manage_settings',
          'view_reports', 'manage_content'
        ],
        'Instructor': [
          'create_course', 'edit_own_course', 'view_own_students',
          'view_own_reports', 'manage_own_content'
        ],
        'User': [
          'view_courses', 'enroll_courses', 'view_own_profile',
          'edit_own_profile'
        ]
      };
      
      // Bắt đầu giao dịch
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        for (const role of defaultRoles) {
          // Tạo vai trò
          const [result] = await connection.execute(
            'INSERT INTO roles (name, description) VALUES (?, ?)',
            [role.name, role.description]
          );
          
          const roleId = result.insertId;
          
          // Thêm các quyền hạn cho vai trò
          const rolePermissions = permissions[role.name] || [];
          for (const permission of rolePermissions) {
            await connection.execute(
              'INSERT INTO permissions (role_id, permission) VALUES (?, ?)',
              [roleId, permission]
            );
          }
        }
        
        await connection.commit();
        connection.release();
        
        return true;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Lỗi tạo vai trò mặc định:', error);
      throw new Error('Lỗi tạo vai trò mặc định: ' + error.message);
    }
  }
};

module.exports = Role; 