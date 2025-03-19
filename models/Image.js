const db = require('../config/database');

/**
 * Model quản lý hình ảnh - đại diện cho bảng images trong cơ sở dữ liệu
 * @module Image
 */
const Image = {
  /**
   * Tạo bản ghi hình ảnh mới
   * @param {Object} imageData - Dữ liệu hình ảnh
   * @param {string} imageData.url - Đường dẫn đến hình ảnh (bắt buộc)
   * @param {string} [imageData.alt_text] - Văn bản thay thế (alt) cho hình ảnh
   * @param {number} imageData.uploaded_by - ID của người dùng tải ảnh lên (bắt buộc)
   * @param {number} [imageData.file_size] - Kích thước tệp hình ảnh (bytes)
   * @returns {Promise<number>} ID của hình ảnh đã tạo
   * @throws {Error} Nếu có lỗi trong quá trình tạo
   */
  create: async (imageData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      const {
        url,
        alt_text = null,
        uploaded_by,
        file_size = null
      } = imageData;

      // Validate dữ liệu đầu vào
      if (!url || url.trim() === '') {
        throw new Error('URL hình ảnh là bắt buộc và không được để trống');
      }

      if (!uploaded_by) {
        throw new Error('ID người dùng tải lên (uploaded_by) là bắt buộc');
      }

      // Kiểm tra người dùng tồn tại
      const [userExists] = await connection.execute(
        'SELECT EXISTS(SELECT 1 FROM users WHERE id = ?) as exist',
        [uploaded_by]
      );
      
      if (userExists[0].exist !== 1) {
        throw new Error('Người dùng tải lên không tồn tại');
      }

      // Thêm mới hình ảnh
      const [result] = await connection.execute(
        `INSERT INTO images (
          url, alt_text, uploaded_by, file_size, created_at
        ) VALUES (?, ?, ?, ?, NOW())`,
        [url, alt_text, uploaded_by, file_size]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi tạo bản ghi hình ảnh:', error);
      throw new Error('Lỗi khi tạo bản ghi hình ảnh: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Tìm hình ảnh theo ID
   * @param {number} id - ID hình ảnh cần tìm
   * @returns {Promise<Object|null>} Thông tin hình ảnh hoặc null nếu không tìm thấy
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findById: async (id) => {
    try {
      if (!id) {
        throw new Error('ID hình ảnh là bắt buộc');
      }
      
      const [rows] = await db.execute(
        `SELECT i.*, u.fullname as uploader_name
         FROM images i
         LEFT JOIN users u ON i.uploaded_by = u.id
         WHERE i.id = ?`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm hình ảnh:', error);
      throw new Error('Lỗi khi tìm hình ảnh: ' + error.message);
    }
  },

  /**
   * Tìm hình ảnh theo URL
   * @param {string} url - URL của hình ảnh cần tìm
   * @returns {Promise<Object|null>} Thông tin hình ảnh hoặc null nếu không tìm thấy
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findByUrl: async (url) => {
    try {
      if (!url) {
        throw new Error('URL hình ảnh là bắt buộc');
      }
      
      const [rows] = await db.execute(
        `SELECT i.*, u.fullname as uploader_name
         FROM images i
         LEFT JOIN users u ON i.uploaded_by = u.id
         WHERE i.url = ?`,
        [url]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm hình ảnh theo URL:', error);
      throw new Error('Lỗi khi tìm hình ảnh theo URL: ' + error.message);
    }
  },

  /**
   * Lấy tất cả hình ảnh với bộ lọc
   * @param {Object} [filters={}] - Các tham số lọc
   * @param {number} [filters.uploaded_by] - Lọc theo ID người dùng đã tải lên
   * @param {string} [filters.search] - Tìm kiếm theo alt_text hoặc url
   * @param {string} [filters.start_date] - Lọc theo ngày bắt đầu
   * @param {string} [filters.end_date] - Lọc theo ngày kết thúc
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @param {string} [filters.sortBy='created_at'] - Trường dùng để sắp xếp
   * @param {boolean} [filters.sortDesc=true] - Sắp xếp theo thứ tự giảm dần
   * @returns {Promise<Object>} Danh sách hình ảnh và metadata phân trang
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findAll: async (filters = {}) => {
    try {
      let query = `
        SELECT i.*, u.fullname as uploader_name
        FROM images i
        LEFT JOIN users u ON i.uploaded_by = u.id
        WHERE 1=1
      `;
      const params = [];

      // Áp dụng các bộ lọc
      if (filters.uploaded_by) {
        query += ' AND i.uploaded_by = ?';
        params.push(filters.uploaded_by);
      }

      if (filters.search) {
        query += ' AND (i.alt_text LIKE ? OR i.url LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Thêm lọc theo khoảng thời gian
      if (filters.start_date) {
        query += ' AND i.created_at >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND i.created_at <= ?';
        params.push(filters.end_date);
      }

      // Sắp xếp
      const sortBy = filters.sortBy || 'created_at';
      const sortDirection = filters.sortDesc ? 'DESC' : 'ASC';
      
      // Danh sách các cột có thể sắp xếp
      const allowedSortColumns = ['url', 'created_at', 'file_size'];
      
      // Ngăn chặn SQL injection trong mệnh đề ORDER BY
      if (allowedSortColumns.includes(sortBy)) {
        query += ` ORDER BY i.${sortBy} ${sortDirection}`;
      } else {
        query += ' ORDER BY i.created_at DESC';
      }

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số bản ghi cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM images i
        WHERE 1=1
      `;
      if (filters.uploaded_by) countQuery += ' AND i.uploaded_by = ?';
      if (filters.search) {
        countQuery += ' AND (i.alt_text LIKE ? OR i.url LIKE ?)';
      }
      if (filters.start_date) countQuery += ' AND i.created_at >= ?';
      if (filters.end_date) countQuery += ' AND i.created_at <= ?';

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        images: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách hình ảnh:', error);
      throw new Error('Lỗi khi lấy danh sách hình ảnh: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin hình ảnh
   * @param {number} id - ID hình ảnh cần cập nhật
   * @param {Object} updateData - Dữ liệu cập nhật
   * @param {string} [updateData.url] - Đường dẫn mới đến hình ảnh
   * @param {string} [updateData.alt_text] - Văn bản thay thế mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   * @throws {Error} Nếu có lỗi trong quá trình cập nhật
   */
  update: async (id, updateData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID hình ảnh là bắt buộc');
      }
      
      // Kiểm tra hình ảnh tồn tại
      const imageExists = await Image.exists(id);
      if (!imageExists) {
        throw new Error('Hình ảnh không tồn tại');
      }
      
      const allowedFields = ['url', 'alt_text'];
      const updates = [];
      const values = [];

      // Validate url nếu được cung cấp
      if (updateData.url !== undefined) {
        if (!updateData.url || updateData.url.trim() === '') {
          throw new Error('URL hình ảnh không được để trống');
        }
      }

      // Xây dựng câu truy vấn cập nhật động
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        throw new Error('Không có trường hợp lệ để cập nhật');
      }

      values.push(id);
      const query = `UPDATE images SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await connection.execute(query, values);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi cập nhật hình ảnh:', error);
      throw new Error('Lỗi khi cập nhật hình ảnh: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa hình ảnh
   * @param {number} id - ID hình ảnh cần xóa
   * @returns {Promise<boolean>} Kết quả xóa
   * @throws {Error} Nếu có lỗi trong quá trình xóa
   */
  delete: async (id) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID hình ảnh là bắt buộc');
      }
      
      // Kiểm tra hình ảnh tồn tại
      const imageExists = await Image.exists(id);
      if (!imageExists) {
        throw new Error('Hình ảnh không tồn tại');
      }
      
      // Kiểm tra nếu hình ảnh đang được sử dụng trong banners
      const [bannerCheck] = await connection.execute(
        'SELECT COUNT(*) as count FROM banners WHERE image_id = ?',
        [id]
      );
      
      if (bannerCheck[0].count > 0) {
        throw new Error('Không thể xóa hình ảnh vì đang được sử dụng trong banner');
      }
      
      // Các kiểm tra khác có thể thêm ở đây (ví dụ: kiểm tra trong courses, posts, etc.)
      
      const [result] = await connection.execute(
        'DELETE FROM images WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi xóa hình ảnh:', error);
      throw new Error('Lỗi khi xóa hình ảnh: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Kiểm tra hình ảnh có tồn tại
   * @param {number} id - ID hình ảnh
   * @returns {Promise<boolean>} Hình ảnh có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM images WHERE id = ?) as exist',
        [id]
      );
      
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của hình ảnh:', error);
      return false;
    }
  },
  
  /**
   * Lấy hình ảnh theo người dùng
   * @param {number} userId - ID người dùng
   * @param {number} [page=1] - Trang hiện tại
   * @param {number} [limit=10] - Số lượng kết quả mỗi trang
   * @returns {Promise<Object>} Danh sách hình ảnh và metadata phân trang
   * @throws {Error} Nếu có lỗi trong quá trình lấy danh sách
   */
  getByUser: async (userId, page = 1, limit = 10) => {
    try {
      if (!userId) {
        throw new Error('ID người dùng là bắt buộc');
      }
      
      const offset = (page - 1) * limit;
      
      const [rows] = await db.execute(
        `SELECT i.*, u.fullname as uploader_name
         FROM images i
         LEFT JOIN users u ON i.uploaded_by = u.id
         WHERE i.uploaded_by = ?
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM images WHERE uploaded_by = ?',
        [userId]
      );

      return {
        images: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy hình ảnh của người dùng:', error);
      throw new Error('Lỗi khi lấy hình ảnh của người dùng: ' + error.message);
    }
  },
  
  /**
   * Lấy tổng dung lượng hình ảnh đã tải lên của người dùng
   * @param {number} userId - ID người dùng
   * @returns {Promise<number>} Tổng dung lượng (bytes)
   * @throws {Error} Nếu có lỗi trong quá trình tính toán
   */
  getTotalStorageByUser: async (userId) => {
    try {
      if (!userId) {
        throw new Error('ID người dùng là bắt buộc');
      }
      
      const [result] = await db.execute(
        'SELECT COALESCE(SUM(file_size), 0) as total_size FROM images WHERE uploaded_by = ?',
        [userId]
      );
      
      return Number(result[0].total_size);
    } catch (error) {
      console.error('Lỗi khi tính tổng dung lượng hình ảnh:', error);
      throw new Error('Lỗi khi tính tổng dung lượng hình ảnh: ' + error.message);
    }
  }
};

module.exports = Image; 