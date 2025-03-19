const db = require('../config/database');

/**
 * Model quản lý đối tác - đại diện cho bảng partners trong cơ sở dữ liệu
 * @module Partner
 */
const Partner = {
  /**
   * Tạo đối tác mới
   * @param {Object} partnerData - Dữ liệu đối tác
   * @param {string} partnerData.name - Tên đối tác (bắt buộc)
   * @param {string} [partnerData.logo_url] - Đường dẫn đến logo
   * @param {string} [partnerData.website_url] - Đường dẫn đến website
   * @param {string} [partnerData.description] - Mô tả về đối tác
   * @param {boolean} [partnerData.is_active=true] - Trạng thái hoạt động
   * @returns {Promise<number>} ID của đối tác đã tạo
   * @throws {Error} Nếu có lỗi trong quá trình tạo
   */
  create: async (partnerData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      const {
        name,
        logo_url = null,
        website_url = null,
        description = null,
        is_active = true
      } = partnerData;

      // Validate dữ liệu đầu vào
      if (!name || name.trim() === '') {
        throw new Error('Tên đối tác là bắt buộc và không được để trống');
      }

      // Validate URL nếu được cung cấp
      if (website_url && !isValidUrl(website_url)) {
        throw new Error('Website URL không hợp lệ');
      }

      // Kiểm tra đối tác đã tồn tại chưa (nếu cần)
      const [existingPartners] = await connection.execute(
        'SELECT id FROM partners WHERE name = ?',
        [name]
      );

      if (existingPartners.length > 0) {
        throw new Error(`Đối tác với tên "${name}" đã tồn tại`);
      }

      // Thêm mới đối tác
      const [result] = await connection.execute(
        `INSERT INTO partners (
          name, logo_url, website_url, description,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [name, logo_url, website_url, description, is_active]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi tạo đối tác:', error);
      throw new Error('Lỗi khi tạo đối tác: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Tìm đối tác theo ID
   * @param {number} id - ID đối tác cần tìm
   * @returns {Promise<Object|null>} Thông tin đối tác hoặc null nếu không tìm thấy
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findById: async (id) => {
    try {
      if (!id) {
        throw new Error('ID đối tác là bắt buộc');
      }
      
      const [rows] = await db.execute(
        'SELECT * FROM partners WHERE id = ?',
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm đối tác:', error);
      throw new Error('Lỗi khi tìm đối tác: ' + error.message);
    }
  },

  /**
   * Tìm đối tác theo tên
   * @param {string} name - Tên đối tác cần tìm
   * @returns {Promise<Object|null>} Thông tin đối tác hoặc null nếu không tìm thấy
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findByName: async (name) => {
    try {
      if (!name) {
        throw new Error('Tên đối tác là bắt buộc');
      }
      
      const [rows] = await db.execute(
        'SELECT * FROM partners WHERE name = ?',
        [name]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm đối tác theo tên:', error);
      throw new Error('Lỗi khi tìm đối tác theo tên: ' + error.message);
    }
  },

  /**
   * Lấy tất cả đối tác với bộ lọc
   * @param {Object} [filters={}] - Các tham số lọc
   * @param {boolean} [filters.is_active] - Lọc theo trạng thái hoạt động
   * @param {string} [filters.search] - Tìm kiếm theo tên hoặc mô tả
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @param {string} [filters.sortBy='created_at'] - Trường dùng để sắp xếp
   * @param {boolean} [filters.sortDesc=true] - Sắp xếp theo thứ tự giảm dần
   * @returns {Promise<Object>} Danh sách đối tác và metadata phân trang
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findAll: async (filters = {}) => {
    try {
      let query = 'SELECT * FROM partners WHERE 1=1';
      const params = [];

      // Áp dụng các bộ lọc
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Sắp xếp
      const sortBy = filters.sortBy || 'created_at';
      const sortDirection = filters.sortDesc ? 'DESC' : 'ASC';
      
      // Danh sách các cột có thể sắp xếp
      const allowedSortColumns = ['name', 'created_at', 'is_active'];
      
      // Ngăn chặn SQL injection trong mệnh đề ORDER BY
      if (allowedSortColumns.includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${sortDirection}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số bản ghi cho phân trang
      let countQuery = 'SELECT COUNT(*) as total FROM partners WHERE 1=1';
      if (filters.is_active !== undefined) {
        countQuery += ' AND is_active = ?';
      }
      if (filters.search) {
        countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      }

      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2) // Loại bỏ limit và offset
      );

      return {
        partners: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đối tác:', error);
      throw new Error('Lỗi khi lấy danh sách đối tác: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin đối tác
   * @param {number} id - ID đối tác cần cập nhật
   * @param {Object} updateData - Dữ liệu cập nhật
   * @param {string} [updateData.name] - Tên đối tác
   * @param {string} [updateData.logo_url] - Đường dẫn đến logo
   * @param {string} [updateData.website_url] - Đường dẫn đến website
   * @param {string} [updateData.description] - Mô tả về đối tác
   * @param {boolean} [updateData.is_active] - Trạng thái hoạt động
   * @returns {Promise<boolean>} Kết quả cập nhật
   * @throws {Error} Nếu có lỗi trong quá trình cập nhật
   */
  update: async (id, updateData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID đối tác là bắt buộc');
      }
      
      // Kiểm tra đối tác tồn tại
      const [existCheck] = await connection.execute(
        'SELECT id FROM partners WHERE id = ?',
        [id]
      );
      
      if (existCheck.length === 0) {
        throw new Error('Đối tác không tồn tại');
      }
      
      // Validate website URL nếu được cung cấp
      if (updateData.website_url && !isValidUrl(updateData.website_url)) {
        throw new Error('Website URL không hợp lệ');
      }
      
      // Nếu đổi tên, kiểm tra tên mới đã tồn tại chưa
      if (updateData.name) {
        const [nameCheck] = await connection.execute(
          'SELECT id FROM partners WHERE name = ? AND id != ?',
          [updateData.name, id]
        );
        
        if (nameCheck.length > 0) {
          throw new Error(`Đối tác với tên "${updateData.name}" đã tồn tại`);
        }
      }
      
      const allowedFields = ['name', 'logo_url', 'website_url', 'description', 'is_active'];
      const updates = [];
      const values = [];

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
      const query = `UPDATE partners SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await connection.execute(query, values);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi cập nhật đối tác:', error);
      throw new Error('Lỗi khi cập nhật đối tác: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa đối tác
   * @param {number} id - ID đối tác cần xóa
   * @returns {Promise<boolean>} Kết quả xóa
   * @throws {Error} Nếu có lỗi trong quá trình xóa
   */
  delete: async (id) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID đối tác là bắt buộc');
      }
      
      // Kiểm tra đối tác tồn tại
      const [existCheck] = await connection.execute(
        'SELECT id FROM partners WHERE id = ?',
        [id]
      );
      
      if (existCheck.length === 0) {
        throw new Error('Đối tác không tồn tại');
      }
      
      // Ở đây có thể thêm các kiểm tra quan hệ nếu cần
      // Ví dụ: kiểm tra xem đối tác có được liên kết với bất kỳ bảng nào khác không
      
      const [result] = await connection.execute(
        'DELETE FROM partners WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi xóa đối tác:', error);
      throw new Error('Lỗi khi xóa đối tác: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Chuyển đổi trạng thái hoạt động của đối tác
   * @param {number} id - ID đối tác
   * @returns {Promise<boolean>} Kết quả chuyển đổi
   * @throws {Error} Nếu có lỗi trong quá trình chuyển đổi
   */
  toggleActive: async (id) => {
    try {
      if (!id) {
        throw new Error('ID đối tác là bắt buộc');
      }
      
      // Kiểm tra đối tác tồn tại
      const exists = await Partner.exists(id);
      if (!exists) {
        throw new Error('Đối tác không tồn tại');
      }
      
      const [result] = await db.execute(
        'UPDATE partners SET is_active = NOT is_active WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi chuyển đổi trạng thái đối tác:', error);
      throw new Error('Lỗi khi chuyển đổi trạng thái đối tác: ' + error.message);
    }
  },

  /**
   * Lấy danh sách đối tác đang hoạt động
   * @param {number} [limit] - Giới hạn số lượng kết quả trả về
   * @returns {Promise<Array>} Danh sách đối tác đang hoạt động
   * @throws {Error} Nếu có lỗi trong quá trình lấy danh sách
   */
  getActive: async (limit) => {
    try {
      let query = 'SELECT * FROM partners WHERE is_active = true ORDER BY created_at DESC';
      const params = [];
      
      if (limit && !isNaN(limit)) {
        query += ' LIMIT ?';
        params.push(Number(limit));
      }
      
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đối tác hoạt động:', error);
      throw new Error('Lỗi khi lấy danh sách đối tác hoạt động: ' + error.message);
    }
  },

  /**
   * Kiểm tra đối tác có tồn tại
   * @param {number} id - ID đối tác
   * @returns {Promise<boolean>} Đối tác có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT id FROM partners WHERE id = ?',
        [id]
      );
      
      return rows.length > 0;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của đối tác:', error);
      return false;
    }
  }
};

/**
 * Kiểm tra URL có hợp lệ hay không
 * @param {string} url - URL cần kiểm tra
 * @returns {boolean} URL có hợp lệ hay không
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = Partner; 