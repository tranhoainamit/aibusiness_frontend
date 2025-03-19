const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Role = require('./Role');

// Model người dùng
const User = {
  /**
   * Tạo người dùng mới
   * @param {Object} userData Dữ liệu người dùng
   * @returns {Promise<number>} ID của người dùng mới
   */
  create: async (userData) => {
    try {
      const {
        username,
        email,
        password,
        full_name,
        phone = null,
        avatar_url = null,
        bio = null,
        role_id = 1, // Vai trò mặc định: người dùng thường
        status = 'active'
      } = userData;

      // Validate dữ liệu đầu vào
      if (!username || !email || !password) {
        throw new Error('Tên đăng nhập, email và mật khẩu không được để trống');
      }

      if (username.length < 3 || username.length > 50) {
        throw new Error('Tên đăng nhập phải từ 3-50 ký tự');
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('Email không hợp lệ');
      }

      if (password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }

      // Kiểm tra email và tên đăng nhập đã tồn tại chưa
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        throw new Error('Email đã được sử dụng');
      }

      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        throw new Error('Tên đăng nhập đã tồn tại');
      }

      // Kiểm tra role_id có tồn tại không
      if (role_id) {
        const roleExists = await Role.exists(role_id);
        if (!roleExists) {
          throw new Error('Vai trò không tồn tại');
        }
      }

      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      const sql = `
        INSERT INTO users (
          username, email, password, full_name, 
          phone, avatar_url, bio, role_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const [result] = await db.execute(sql, [
        username,
        email,
        hashedPassword,
        full_name,
        phone,
        avatar_url,
        bio,
        role_id,
        status
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo người dùng:', error);
      throw new Error('Lỗi tạo người dùng: ' + error.message);
    }
  },

  /**
   * Tìm người dùng theo ID
   * @param {number} id ID người dùng
   * @param {boolean} includeRole Có bao gồm thông tin vai trò không
   * @returns {Promise<Object>} Thông tin người dùng
   */
  findById: async (id, includeRole = false) => {
    try {
      let query, params;
      
      if (includeRole) {
        query = `
          SELECT u.*, r.name as role_name, r.description as role_description
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE u.id = ?
        `;
      } else {
        query = 'SELECT * FROM users WHERE id = ?';
      }
      
      params = [id];
      const [rows] = await db.execute(query, params);
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm người dùng theo ID:', error);
      throw new Error('Lỗi tìm người dùng: ' + error.message);
    }
  },

  /**
   * Tìm người dùng theo email
   * @param {string} email Email người dùng
   * @param {boolean} includeRole Có bao gồm thông tin vai trò không
   * @returns {Promise<Object>} Thông tin người dùng
   */
  findByEmail: async (email, includeRole = false) => {
    try {
      let query, params;
      
      if (includeRole) {
        query = `
          SELECT u.*, r.name as role_name, r.description as role_description
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE u.email = ?
        `;
      } else {
        query = 'SELECT * FROM users WHERE email = ?';
      }
      
      params = [email];
      const [rows] = await db.execute(query, params);
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm người dùng theo email:', error);
      throw new Error('Lỗi tìm người dùng: ' + error.message);
    }
  },

  /**
   * Tìm người dùng theo tên đăng nhập
   * @param {string} username Tên đăng nhập
   * @param {boolean} includeRole Có bao gồm thông tin vai trò không
   * @returns {Promise<Object>} Thông tin người dùng
   */
  findByUsername: async (username, includeRole = false) => {
    try {
      let query, params;
      
      if (includeRole) {
        query = `
          SELECT u.*, r.name as role_name, r.description as role_description
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE u.username = ?
        `;
      } else {
        query = 'SELECT * FROM users WHERE username = ?';
      }
      
      params = [username];
      const [rows] = await db.execute(query, params);
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm người dùng theo tên đăng nhập:', error);
      throw new Error('Lỗi tìm người dùng: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin người dùng
   * @param {number} id ID người dùng
   * @param {Object} userData Dữ liệu cập nhật
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (id, userData) => {
    try {
      // Kiểm tra người dùng tồn tại
      const exists = await User.exists(id);
      if (!exists) {
        throw new Error('Người dùng không tồn tại');
      }

      // Xử lý dữ liệu đầu vào
      const keys = Object.keys(userData).filter(key => key !== 'password');
      if (!keys.length) return false;

      // Validate email và username nếu cần cập nhật
      if (userData.email) {
        if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
          throw new Error('Email không hợp lệ');
        }
        
        const user = await User.findByEmail(userData.email);
        if (user && user.id !== parseInt(id)) {
          throw new Error('Email đã được sử dụng bởi tài khoản khác');
        }
      }

      if (userData.username) {
        if (userData.username.length < 3 || userData.username.length > 50) {
          throw new Error('Tên đăng nhập phải từ 3-50 ký tự');
        }
        
        const user = await User.findByUsername(userData.username);
        if (user && user.id !== parseInt(id)) {
          throw new Error('Tên đăng nhập đã tồn tại');
        }
      }

      // Kiểm tra role_id nếu cập nhật
      if (userData.role_id) {
        const roleExists = await Role.exists(userData.role_id);
        if (!roleExists) {
          throw new Error('Vai trò không tồn tại');
        }
      }

      // Tạo câu query và tham số
      const placeholders = keys.map(key => `${key} = ?`).join(', ');
      const values = keys.map(key => userData[key]);
      values.push(id);

      const sql = `UPDATE users SET ${placeholders}, updated_at = NOW() WHERE id = ?`;
      const [result] = await db.execute(sql, values);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật người dùng:', error);
      throw new Error('Lỗi cập nhật người dùng: ' + error.message);
    }
  },

  /**
   * Cập nhật mật khẩu người dùng
   * @param {number} id ID người dùng
   * @param {string} currentPassword Mật khẩu hiện tại
   * @param {string} newPassword Mật khẩu mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  updatePassword: async (id, currentPassword, newPassword) => {
    try {
      // Kiểm tra người dùng tồn tại
      const user = await User.findById(id);
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      // Validate dữ liệu đầu vào
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      }

      // Xác minh mật khẩu hiện tại
      if (currentPassword) {
        const isValid = await User.verifyPassword(currentPassword, user.password);
        if (!isValid) {
          throw new Error('Mật khẩu hiện tại không chính xác');
        }
      }

      // Mã hóa mật khẩu mới
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Cập nhật mật khẩu
      const [result] = await db.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật mật khẩu:', error);
      throw new Error('Lỗi cập nhật mật khẩu: ' + error.message);
    }
  },

  /**
   * Xóa người dùng
   * @param {number} id ID người dùng
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      // Kiểm tra người dùng tồn tại
      const exists = await User.exists(id);
      if (!exists) {
        throw new Error('Người dùng không tồn tại');
      }

      // Bắt đầu giao dịch để đảm bảo tính toàn vẹn dữ liệu
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Xóa các bản ghi liên quan nếu cần
        // (tùy thuộc vào thiết kế cơ sở dữ liệu, có thể không cần thiết nếu đã thiết lập ON DELETE CASCADE)
        
        // Xóa người dùng
        const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        
        await connection.commit();
        connection.release();
        
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Lỗi xóa người dùng:', error);
      throw new Error('Lỗi xóa người dùng: ' + error.message);
    }
  },

  /**
   * Xác minh mật khẩu
   * @param {string} plainPassword Mật khẩu thường
   * @param {string} hashedPassword Mật khẩu đã mã hóa
   * @returns {Promise<boolean>} Kết quả xác minh
   */
  verifyPassword: async (plainPassword, hashedPassword) => {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Lỗi xác minh mật khẩu:', error);
      throw new Error('Lỗi xác minh mật khẩu: ' + error.message);
    }
  },

  /**
   * Lấy thông tin cá nhân người dùng (không bao gồm mật khẩu)
   * @param {number} id ID người dùng
   * @param {boolean} includeRole Có bao gồm thông tin vai trò không
   * @returns {Promise<Object>} Thông tin người dùng
   */
  getProfile: async (id, includeRole = false) => {
    try {
      let query, params;
      
      if (includeRole) {
        query = `
          SELECT 
            u.id, u.username, u.email, u.full_name, u.phone, 
            u.avatar_url, u.bio, u.role_id, u.status, u.created_at, u.updated_at,
            r.name as role_name, r.description as role_description
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE u.id = ?
        `;
      } else {
        query = `
          SELECT 
            id, username, email, full_name, phone, 
            avatar_url, bio, role_id, status, created_at, updated_at
          FROM users
          WHERE id = ?
        `;
      }
      
      params = [id];
      const [rows] = await db.execute(query, params);
      
      if (includeRole && rows[0]) {
        // Lấy danh sách quyền hạn nếu cần
        rows[0].permissions = await Role.getPermissions(rows[0].role_id);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi lấy thông tin người dùng:', error);
      throw new Error('Lỗi lấy thông tin người dùng: ' + error.message);
    }
  },

  /**
   * Tìm tất cả người dùng với bộ lọc
   * @param {Object} options Các tùy chọn tìm kiếm
   * @returns {Promise<Object>} Kết quả tìm kiếm với phân trang
   */
  findAll: async (options = {}) => {
    try {
      const { 
        role_id, 
        status, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        page = 1, 
        limit = 10,
        includeRole = false
      } = options;

      // Validate sortBy để tránh SQL injection
      const allowedSortFields = ['id', 'username', 'email', 'full_name', 'created_at', 'updated_at', 'status'];
      const sanitizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sanitizedSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Tạo query cơ bản
      let query;
      if (includeRole) {
        query = `
          SELECT 
            u.id, u.username, u.email, u.full_name, u.phone, 
            u.avatar_url, u.bio, u.role_id, u.status, u.created_at, u.updated_at,
            r.name as role_name
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
        `;
      } else {
        query = `
          SELECT 
            id, username, email, full_name, phone, 
            avatar_url, bio, role_id, status, created_at, updated_at
          FROM users
        `;
      }

      let queryParams = [];
      let whereConditions = [];

      // Thêm điều kiện where
      if (role_id) {
        whereConditions.push('role_id = ?');
        queryParams.push(role_id);
      }

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereConditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Thêm sắp xếp và phân trang
      const tableName = includeRole ? 'u' : '';
      query += ` ORDER BY ${tableName ? tableName + '.' : ''}${sanitizedSortBy} ${sanitizedSortOrder} LIMIT ? OFFSET ?`;
      
      const offset = (page - 1) * limit;
      queryParams.push(parseInt(limit), offset);

      const [rows] = await db.execute(query, queryParams);

      // Lấy tổng số lượng
      let countQuery = `SELECT COUNT(*) as total FROM users${includeRole ? ' u' : ''}`;
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }

      const [countResult] = await db.execute(countQuery, queryParams.slice(0, -2));

      return {
        users: rows,
        total: countResult[0].total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách người dùng:', error);
      throw new Error('Lỗi tìm danh sách người dùng: ' + error.message);
    }
  },

  /**
   * Kiểm tra người dùng có tồn tại
   * @param {number} id ID người dùng
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM users WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của người dùng:', error);
      return false;
    }
  },

  /**
   * Kiểm tra email có tồn tại
   * @param {string} email Email cần kiểm tra
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  emailExists: async (email) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM users WHERE email = ?) as exist',
        [email]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của email:', error);
      return false;
    }
  },

  /**
   * Kiểm tra tên người dùng có tồn tại
   * @param {string} username Tên đăng nhập cần kiểm tra
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  usernameExists: async (username) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM users WHERE username = ?) as exist',
        [username]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của tên đăng nhập:', error);
      return false;
    }
  },

  /**
   * Tạo JWT token cho người dùng
   * @param {Object} userData Thông tin người dùng
   * @returns {string} JWT token
   */
  generateAuthToken: (userData) => {
    try {
      const { id, username, email, role_id } = userData;
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      
      const token = jwt.sign(
        { id, username, email, role_id },
        secret,
        { expiresIn }
      );
      
      return token;
    } catch (error) {
      console.error('Lỗi tạo token xác thực:', error);
      throw new Error('Lỗi tạo token xác thực: ' + error.message);
    }
  },

  /**
   * Xác minh JWT token
   * @param {string} token JWT token cần xác minh
   * @returns {Object} Dữ liệu người dùng từ token
   */
  verifyAuthToken: (token) => {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      console.error('Lỗi xác minh token:', error);
      throw new Error('Lỗi xác minh token: ' + error.message);
    }
  },

  /**
   * Đếm số lượng người dùng theo vai trò
   * @param {number} roleId ID vai trò
   * @returns {Promise<number>} Số lượng người dùng
   */
  countByRole: async (roleId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
        [roleId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Lỗi đếm người dùng theo vai trò:', error);
      throw new Error('Lỗi đếm người dùng: ' + error.message);
    }
  },

  /**
   * Kiểm tra người dùng có quyền hạn
   * @param {number} userId ID người dùng
   * @param {string} permission Quyền hạn cần kiểm tra
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  hasPermission: async (userId, permission) => {
    try {
      // Lấy thông tin người dùng và vai trò
      const user = await User.findById(userId);
      if (!user || !user.role_id) {
        return false;
      }
      
      // Kiểm tra quyền hạn của vai trò
      return await Role.hasPermission(user.role_id, permission);
    } catch (error) {
      console.error('Lỗi kiểm tra quyền hạn:', error);
      return false;
    }
  },

  /**
   * Lấy danh sách quyền hạn của người dùng
   * @param {number} userId ID người dùng
   * @returns {Promise<Array>} Danh sách quyền hạn
   */
  getPermissions: async (userId) => {
    try {
      // Lấy thông tin người dùng và vai trò
      const user = await User.findById(userId);
      if (!user || !user.role_id) {
        return [];
      }
      
      // Lấy danh sách quyền hạn của vai trò
      return await Role.getPermissions(user.role_id);
    } catch (error) {
      console.error('Lỗi lấy danh sách quyền hạn:', error);
      return [];
    }
  },

  /**
   * Đăng nhập người dùng
   * @param {string} username Tên đăng nhập hoặc email
   * @param {string} password Mật khẩu
   * @returns {Promise<Object>} Thông tin đăng nhập thành công với token
   */
  login: async (username, password) => {
    try {
      // Validate dữ liệu đầu vào
      if (!username || !password) {
        throw new Error('Tên đăng nhập/email và mật khẩu không được để trống');
      }

      // Tìm người dùng theo tên đăng nhập hoặc email
      let user;
      if (username.includes('@')) {
        user = await User.findByEmail(username, true);
      } else {
        user = await User.findByUsername(username, true);
      }

      if (!user) {
        throw new Error('Tên đăng nhập/email hoặc mật khẩu không chính xác');
      }

      // Kiểm tra trạng thái tài khoản
      if (user.status !== 'active') {
        throw new Error('Tài khoản đã bị khóa hoặc chưa kích hoạt');
      }

      // Xác minh mật khẩu
      const validPassword = await User.verifyPassword(password, user.password);
      if (!validPassword) {
        throw new Error('Tên đăng nhập/email hoặc mật khẩu không chính xác');
      }

      // Tạo JWT token
      const token = User.generateAuthToken(user);

      // Ẩn mật khẩu trước khi trả về
      delete user.password;

      return {
        user,
        token
      };
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw new Error('Lỗi đăng nhập: ' + error.message);
    }
  }
};

module.exports = User; 