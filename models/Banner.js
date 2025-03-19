const db = require('../config/database');
const Image = require('./Image');

/**
 * Model quản lý banner - đại diện cho bảng banners trong cơ sở dữ liệu
 * @module Banner
 */
const Banner = {
  /**
   * Tạo banner mới
   * @param {Object} bannerData - Dữ liệu banner
   * @param {number} bannerData.image_id - ID của hình ảnh dùng cho banner (bắt buộc)
   * @param {string} [bannerData.title] - Tiêu đề banner
   * @param {string} [bannerData.description] - Mô tả banner
   * @param {string} [bannerData.link] - Liên kết khi click vào banner
   * @param {string} [bannerData.position] - Vị trí hiển thị banner
   * @param {boolean} [bannerData.is_active=true] - Trạng thái hiển thị banner
   * @param {Date|string} [bannerData.start_date] - Thời gian bắt đầu hiển thị banner
   * @param {Date|string} [bannerData.end_date] - Thời gian kết thúc hiển thị banner
   * @returns {Promise<number>} ID của banner đã tạo
   * @throws {Error} Nếu có lỗi trong quá trình tạo
   */
  create: async (bannerData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      const {
        image_id,
        title,
        description,
        link,
        position,
        is_active = true,
        start_date,
        end_date
      } = bannerData;

      // Validate dữ liệu đầu vào
      if (!image_id) {
        throw new Error('ID hình ảnh (image_id) là bắt buộc');
      }

      // Kiểm tra hình ảnh tồn tại
      const imageExists = await Image.exists(image_id);
      if (!imageExists) {
        throw new Error('Hình ảnh không tồn tại');
      }

      // Validate ngày bắt đầu và kết thúc
      if (start_date && end_date) {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          throw new Error('Định dạng ngày không hợp lệ');
        }
        
        if (startDateObj > endDateObj) {
          throw new Error('Ngày bắt đầu phải trước ngày kết thúc');
        }
      }

      // Validate URL nếu được cung cấp
      if (link && !isValidUrl(link)) {
        throw new Error('Liên kết không hợp lệ');
      }

      // Thêm mới banner
      const [result] = await connection.execute(
        `INSERT INTO banners (
          image_id, title, description, link, position,
          is_active, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          image_id, title, description, link, position,
          is_active, start_date, end_date
        ]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi tạo banner:', error);
      throw new Error('Lỗi khi tạo banner: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Tìm banner theo ID
   * @param {number} id - ID banner cần tìm
   * @returns {Promise<Object|null>} Thông tin banner hoặc null nếu không tìm thấy
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findById: async (id) => {
    try {
      if (!id) {
        throw new Error('ID banner là bắt buộc');
      }
      
      const [rows] = await db.execute(
        `SELECT b.*, i.url as image_url, i.alt_text as image_alt
         FROM banners b
         LEFT JOIN images i ON b.image_id = i.id
         WHERE b.id = ?`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Lỗi khi tìm banner:', error);
      throw new Error('Lỗi khi tìm banner: ' + error.message);
    }
  },

  /**
   * Lấy tất cả banner với bộ lọc
   * @param {Object} [filters={}] - Các tham số lọc
   * @param {string} [filters.position] - Lọc theo vị trí
   * @param {boolean} [filters.is_active] - Lọc theo trạng thái hoạt động
   * @param {Date|string} [filters.current_date] - Lọc các banner đang hiệu lực vào ngày cụ thể
   * @param {number} [filters.page=1] - Trang hiện tại
   * @param {number} [filters.limit=10] - Số lượng kết quả mỗi trang
   * @param {string} [filters.sortBy='created_at'] - Trường dùng để sắp xếp
   * @param {boolean} [filters.sortDesc=true] - Sắp xếp theo thứ tự giảm dần
   * @returns {Promise<Object>} Danh sách banner và metadata phân trang
   * @throws {Error} Nếu có lỗi trong quá trình tìm kiếm
   */
  findAll: async (filters = {}) => {
    try {
      let query = `
        SELECT b.*, i.url as image_url, i.alt_text as image_alt
        FROM banners b
        LEFT JOIN images i ON b.image_id = i.id
        WHERE 1=1
      `;
      const params = [];

      // Áp dụng các bộ lọc
      if (filters.position) {
        query += ' AND b.position = ?';
        params.push(filters.position);
      }

      if (filters.is_active !== undefined) {
        query += ' AND b.is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.current_date) {
        let currentDate = filters.current_date;
        if (!(currentDate instanceof Date)) {
          currentDate = new Date(currentDate);
          if (isNaN(currentDate.getTime())) {
            throw new Error('Định dạng ngày không hợp lệ');
          }
        }
        
        // Format ngày thành chuỗi YYYY-MM-DD HH:MM:SS
        const formattedDate = currentDate.toISOString().replace('T', ' ').substring(0, 19);
        
        query += ` AND (b.start_date IS NULL OR b.start_date <= ?)
                  AND (b.end_date IS NULL OR b.end_date >= ?)`;
        params.push(formattedDate, formattedDate);
      }

      // Sắp xếp
      const sortBy = filters.sortBy || 'created_at';
      const sortDirection = filters.sortDesc ? 'DESC' : 'ASC';
      
      // Danh sách các cột có thể sắp xếp
      const allowedSortColumns = ['created_at', 'updated_at', 'position', 'start_date', 'end_date'];
      
      // Ngăn chặn SQL injection trong mệnh đề ORDER BY
      if (allowedSortColumns.includes(sortBy)) {
        query += ` ORDER BY b.${sortBy} ${sortDirection}`;
      } else {
        query += ' ORDER BY b.created_at DESC';
      }

      // Thêm phân trang
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Lấy tổng số bản ghi cho phân trang
      let countQuery = 'SELECT COUNT(*) as total FROM banners b WHERE 1=1';
      const countParams = [];
      
      if (filters.position) {
        countQuery += ' AND b.position = ?';
        countParams.push(filters.position);
      }
      
      if (filters.is_active !== undefined) {
        countQuery += ' AND b.is_active = ?';
        countParams.push(filters.is_active);
      }
      
      if (filters.current_date) {
        let currentDate = filters.current_date;
        if (!(currentDate instanceof Date)) {
          currentDate = new Date(currentDate);
        }
        
        const formattedDate = currentDate.toISOString().replace('T', ' ').substring(0, 19);
        
        countQuery += ` AND (b.start_date IS NULL OR b.start_date <= ?)
                     AND (b.end_date IS NULL OR b.end_date >= ?)`;
        countParams.push(formattedDate, formattedDate);
      }

      const [countResult] = await db.execute(countQuery, countParams);

      return {
        banners: rows,
        total: countResult[0].total,
        page,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách banner:', error);
      throw new Error('Lỗi khi lấy danh sách banner: ' + error.message);
    }
  },

  /**
   * Lấy banner đang hoạt động theo vị trí
   * @param {string} position - Vị trí hiển thị banner
   * @param {Date|string} [date=new Date()] - Ngày kiểm tra hiệu lực
   * @returns {Promise<Array>} Danh sách banner đang hoạt động
   * @throws {Error} Nếu có lỗi trong quá trình lấy danh sách
   */
  getActiveByPosition: async (position, date = new Date()) => {
    try {
      if (!position) {
        throw new Error('Vị trí banner là bắt buộc');
      }
      
      // Đảm bảo date là đối tượng Date
      let currentDate = date;
      if (!(currentDate instanceof Date)) {
        currentDate = new Date(currentDate);
        if (isNaN(currentDate.getTime())) {
          throw new Error('Định dạng ngày không hợp lệ');
        }
      }
      
      // Format ngày thành chuỗi YYYY-MM-DD HH:MM:SS
      const formattedDate = currentDate.toISOString().replace('T', ' ').substring(0, 19);
      
      const [rows] = await db.execute(
        `SELECT b.*, i.url as image_url, i.alt_text as image_alt
         FROM banners b
         LEFT JOIN images i ON b.image_id = i.id
         WHERE b.position = ?
         AND b.is_active = true
         AND (b.start_date IS NULL OR b.start_date <= ?)
         AND (b.end_date IS NULL OR b.end_date >= ?)
         ORDER BY b.created_at DESC`,
        [position, formattedDate, formattedDate]
      );
      
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy banner hoạt động:', error);
      throw new Error('Lỗi khi lấy banner hoạt động: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin banner
   * @param {number} id - ID banner cần cập nhật
   * @param {Object} bannerData - Dữ liệu cập nhật
   * @param {number} [bannerData.image_id] - ID của hình ảnh mới
   * @param {string} [bannerData.title] - Tiêu đề mới
   * @param {string} [bannerData.description] - Mô tả mới
   * @param {string} [bannerData.link] - Liên kết mới
   * @param {string} [bannerData.position] - Vị trí hiển thị mới
   * @param {boolean} [bannerData.is_active] - Trạng thái hiển thị mới
   * @param {Date|string} [bannerData.start_date] - Thời gian bắt đầu mới
   * @param {Date|string} [bannerData.end_date] - Thời gian kết thúc mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   * @throws {Error} Nếu có lỗi trong quá trình cập nhật
   */
  update: async (id, bannerData) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID banner là bắt buộc');
      }
      
      // Kiểm tra banner tồn tại
      const bannerExists = await Banner.exists(id);
      if (!bannerExists) {
        throw new Error('Banner không tồn tại');
      }
      
      const {
        image_id,
        title,
        description,
        link,
        position,
        is_active,
        start_date,
        end_date
      } = bannerData;
      
      // Validate dữ liệu
      
      // Kiểm tra image_id nếu được cung cấp
      if (image_id !== undefined) {
        const imageExists = await Image.exists(image_id);
        if (!imageExists) {
          throw new Error('Hình ảnh không tồn tại');
        }
      }
      
      // Validate ngày bắt đầu và kết thúc nếu cả hai được cung cấp
      if (start_date !== undefined && end_date !== undefined) {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          throw new Error('Định dạng ngày không hợp lệ');
        }
        
        if (startDateObj > endDateObj) {
          throw new Error('Ngày bắt đầu phải trước ngày kết thúc');
        }
      }
      
      // Validate URL nếu được cung cấp
      if (link !== undefined && link !== null && !isValidUrl(link)) {
        throw new Error('Liên kết không hợp lệ');
      }

      // Xây dựng câu truy vấn cập nhật động
      let query = 'UPDATE banners SET ';
      const updates = [];
      const params = [];

      if (image_id !== undefined) {
        updates.push('image_id = ?');
        params.push(image_id);
      }
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (link !== undefined) {
        updates.push('link = ?');
        params.push(link);
      }
      if (position !== undefined) {
        updates.push('position = ?');
        params.push(position);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        params.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        params.push(end_date);
      }
      
      // Thêm updated_at tự động
      updates.push('updated_at = CURRENT_TIMESTAMP');

      if (updates.length === 0) {
        throw new Error('Không có trường hợp lệ để cập nhật');
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const [result] = await connection.execute(query, params);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi cập nhật banner:', error);
      throw new Error('Lỗi khi cập nhật banner: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa banner
   * @param {number} id - ID banner cần xóa
   * @returns {Promise<boolean>} Kết quả xóa
   * @throws {Error} Nếu có lỗi trong quá trình xóa
   */
  delete: async (id) => {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      if (!id) {
        throw new Error('ID banner là bắt buộc');
      }
      
      // Kiểm tra banner tồn tại
      const bannerExists = await Banner.exists(id);
      if (!bannerExists) {
        throw new Error('Banner không tồn tại');
      }
      
      const [result] = await connection.execute(
        'DELETE FROM banners WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi xóa banner:', error);
      throw new Error('Lỗi khi xóa banner: ' + error.message);
    } finally {
      connection.release();
    }
  },

  /**
   * Kiểm tra banner có tồn tại
   * @param {number} id - ID banner
   * @returns {Promise<boolean>} Banner có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM banners WHERE id = ?) as exist',
        [id]
      );
      
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi khi kiểm tra sự tồn tại của banner:', error);
      return false;
    }
  },
  
  /**
   * Cập nhật trạng thái hoạt động của banner
   * @param {number} id - ID banner
   * @param {boolean} isActive - Trạng thái hoạt động mới
   * @returns {Promise<boolean>} Kết quả cập nhật
   * @throws {Error} Nếu có lỗi trong quá trình cập nhật
   */
  updateStatus: async (id, isActive) => {
    try {
      if (!id) {
        throw new Error('ID banner là bắt buộc');
      }
      
      // Kiểm tra banner tồn tại
      const bannerExists = await Banner.exists(id);
      if (!bannerExists) {
        throw new Error('Banner không tồn tại');
      }
      
      const [result] = await db.execute(
        'UPDATE banners SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive ? 1 : 0, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái banner:', error);
      throw new Error('Lỗi khi cập nhật trạng thái banner: ' + error.message);
    }
  },
  
  /**
   * Đếm số banner theo vị trí
   * @param {string} position - Vị trí banner
   * @param {boolean} [onlyActive=false] - Chỉ đếm banner đang hoạt động
   * @returns {Promise<number>} Số lượng banner
   * @throws {Error} Nếu có lỗi trong quá trình đếm
   */
  countByPosition: async (position, onlyActive = false) => {
    try {
      if (!position) {
        throw new Error('Vị trí banner là bắt buộc');
      }
      
      let query = 'SELECT COUNT(*) as count FROM banners WHERE position = ?';
      const params = [position];
      
      if (onlyActive) {
        query += ' AND is_active = TRUE';
      }
      
      const [result] = await db.execute(query, params);
      return result[0].count;
    } catch (error) {
      console.error('Lỗi khi đếm banner theo vị trí:', error);
      throw new Error('Lỗi khi đếm banner theo vị trí: ' + error.message);
    }
  }
};

/**
 * Kiểm tra URL có hợp lệ hay không
 * @param {string} url - URL cần kiểm tra
 * @returns {boolean} URL có hợp lệ hay không
 */
function isValidUrl(url) {
  // Hỗ trợ cả đường dẫn tương đối (/path) và tuyệt đối (https://domain.com/path)
  // Đường dẫn tương đối bắt đầu bằng /
  if (url.startsWith('/')) return true;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = Banner; 