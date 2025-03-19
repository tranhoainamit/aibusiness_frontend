const db = require('../config/database');
const User = require('./User');

/**
 * Model khóa học - quản lý thông tin và thao tác với khóa học
 */
const Course = {
  /**
   * Tạo khóa học mới
   * @param {Object} courseData Dữ liệu khóa học
   * @returns {Promise<number>} ID của khóa học mới
   */
  create: async (courseData) => {
    try {
      const {
        title,
        description,
        price,
        sale_price = null,
        thumbnail = null,
        instructor_id,
        level = null,
        meta_title = null,
        meta_description = null,
        slug = null,
        canonical_url = null,
        is_published = false
      } = courseData;

      // Validate dữ liệu đầu vào
      if (!title || !description || price === undefined || !instructor_id) {
        throw new Error('Thiếu thông tin bắt buộc (tiêu đề, mô tả, giá, ID giảng viên)');
      }

      // Validate giá
      if (isNaN(price) || price < 0 || (sale_price && (isNaN(sale_price) || sale_price < 0))) {
        throw new Error('Giá không hợp lệ');
      }

      // Validate slug nếu có
      if (slug) {
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(slug)) {
          throw new Error('Slug không hợp lệ (chỉ chấp nhận chữ thường, số và dấu gạch ngang)');
        }
        
        // Kiểm tra slug đã tồn tại chưa
        const slugExists = await Course.slugExists(slug);
        if (slugExists) {
          throw new Error('Slug đã tồn tại, vui lòng chọn slug khác');
        }
      }

      // Kiểm tra instructor có tồn tại không
      const instructorExists = await User.exists(instructor_id);
      if (!instructorExists) {
        throw new Error('Giảng viên không tồn tại');
      }

      // Validate level
      if (level && !['beginner', 'intermediate', 'advanced'].includes(level)) {
        throw new Error('Cấp độ khóa học không hợp lệ (chỉ chấp nhận beginner, intermediate, advanced)');
      }

      // Thực hiện thêm khóa học vào database
      const [result] = await db.execute(
        `INSERT INTO courses (
          title, description, price, sale_price, thumbnail, instructor_id,
          level, meta_title, meta_description, slug, canonical_url, is_published,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          title, description, price, sale_price, thumbnail, instructor_id,
          level, meta_title, meta_description, slug, canonical_url, is_published
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo khóa học:', error);
      throw new Error('Lỗi tạo khóa học: ' + error.message);
    }
  },

  /**
   * Tìm khóa học theo ID
   * @param {number} id ID khóa học
   * @param {boolean} includeDetails Có bao gồm thông tin chi tiết không (giảng viên, số lượng học viên, đánh giá)
   * @returns {Promise<Object>} Thông tin khóa học
   */
  findById: async (id, includeDetails = true) => {
    try {
      let query, params;

      if (includeDetails) {
        query = `
          SELECT c.*, 
                 u.username as instructor_username, 
                 u.full_name as instructor_name,
                 u.avatar_url as instructor_avatar,
                 COUNT(DISTINCT p.id) as student_count,
                 AVG(r.rating) as average_rating,
                 COUNT(DISTINCT r.id) as review_count,
                 (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count
          FROM courses c
          LEFT JOIN users u ON c.instructor_id = u.id
          LEFT JOIN purchases p ON c.id = p.course_id
          LEFT JOIN reviews r ON c.id = r.course_id
          WHERE c.id = ?
          GROUP BY c.id
        `;
      } else {
        query = 'SELECT * FROM courses WHERE id = ?';
      }

      params = [id];
      const [rows] = await db.execute(query, params);

      // Nếu không tìm thấy, trả về null
      if (rows.length === 0) {
        return null;
      }

      // Định dạng dữ liệu
      if (rows[0]) {
        // Định dạng số liệu
        if (rows[0].average_rating) {
          rows[0].average_rating = parseFloat(rows[0].average_rating).toFixed(1);
        }
        rows[0].student_count = parseInt(rows[0].student_count || 0);
        rows[0].review_count = parseInt(rows[0].review_count || 0);
        rows[0].lesson_count = parseInt(rows[0].lesson_count || 0);
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm khóa học theo ID:', error);
      throw new Error('Lỗi tìm khóa học: ' + error.message);
    }
  },

  /**
   * Tìm khóa học theo slug
   * @param {string} slug Slug khóa học
   * @param {boolean} includeDetails Có bao gồm thông tin chi tiết không (giảng viên, số lượng học viên, đánh giá)
   * @returns {Promise<Object>} Thông tin khóa học
   */
  findBySlug: async (slug, includeDetails = true) => {
    try {
      let query, params;

      if (includeDetails) {
        query = `
          SELECT c.*, 
                 u.username as instructor_username, 
                 u.full_name as instructor_name,
                 u.avatar_url as instructor_avatar,
                 COUNT(DISTINCT p.id) as student_count,
                 AVG(r.rating) as average_rating,
                 COUNT(DISTINCT r.id) as review_count,
                 (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count
          FROM courses c
          LEFT JOIN users u ON c.instructor_id = u.id
          LEFT JOIN purchases p ON c.id = p.course_id
          LEFT JOIN reviews r ON c.id = r.course_id
          WHERE c.slug = ?
          GROUP BY c.id
        `;
      } else {
        query = 'SELECT * FROM courses WHERE slug = ?';
      }

      params = [slug];
      const [rows] = await db.execute(query, params);

      // Nếu không tìm thấy, trả về null
      if (rows.length === 0) {
        return null;
      }

      // Định dạng dữ liệu
      if (rows[0]) {
        // Định dạng số liệu
        if (rows[0].average_rating) {
          rows[0].average_rating = parseFloat(rows[0].average_rating).toFixed(1);
        }
        rows[0].student_count = parseInt(rows[0].student_count || 0);
        rows[0].review_count = parseInt(rows[0].review_count || 0);
        rows[0].lesson_count = parseInt(rows[0].lesson_count || 0);
      }

      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm khóa học theo slug:', error);
      throw new Error('Lỗi tìm khóa học: ' + error.message);
    }
  },

  /**
   * Tìm tất cả khóa học với bộ lọc
   * @param {Object} filters Các tùy chọn lọc
   * @returns {Promise<Object>} Danh sách khóa học và thông tin phân trang
   */
  findAll: async (filters = {}) => {
    try {
      const {
        instructor_id,
        level,
        is_published,
        search,
        category_id,
        price_min,
        price_max,
        sort_by = 'created_at',
        sort_order = 'DESC',
        page = 1,
        limit = 10
      } = filters;

      // Validate các tham số đầu vào
      const allowedSortFields = ['title', 'price', 'created_at', 'student_count', 'average_rating'];
      const sanitizedSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sanitizedSortOrder = ['ASC', 'DESC'].includes(sort_order) ? sort_order : 'DESC';

      // Xây dựng câu truy vấn cơ bản
      let query = `
        SELECT c.*, 
               u.username as instructor_username, 
               u.full_name as instructor_name,
               COUNT(DISTINCT p.id) as student_count,
               AVG(r.rating) as average_rating,
               COUNT(DISTINCT r.id) as review_count,
               (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN purchases p ON c.id = p.course_id
        LEFT JOIN reviews r ON c.id = r.course_id
        WHERE 1=1
      `;
      
      const params = [];

      // Thêm các điều kiện lọc
      if (instructor_id) {
        query += ' AND c.instructor_id = ?';
        params.push(instructor_id);
      }

      if (level) {
        query += ' AND c.level = ?';
        params.push(level);
      }

      if (is_published !== undefined) {
        query += ' AND c.is_published = ?';
        params.push(is_published);
      }

      if (search) {
        query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category_id) {
        query += ` AND EXISTS (
          SELECT 1 FROM category_items ci 
          WHERE ci.item_id = c.id 
          AND ci.item_type = 'course' 
          AND ci.category_id = ?
        )`;
        params.push(category_id);
      }

      if (price_min !== undefined && !isNaN(price_min)) {
        query += ' AND c.price >= ?';
        params.push(parseFloat(price_min));
      }

      if (price_max !== undefined && !isNaN(price_max)) {
        query += ' AND c.price <= ?';
        params.push(parseFloat(price_max));
      }

      // Thêm group by để tránh trùng lặp
      query += ' GROUP BY c.id';

      // Thêm sắp xếp
      if (sanitizedSortBy === 'student_count') {
        query += ` ORDER BY student_count ${sanitizedSortOrder}`;
      } else if (sanitizedSortBy === 'average_rating') {
        query += ` ORDER BY average_rating ${sanitizedSortOrder}`;
      } else {
        query += ` ORDER BY c.${sanitizedSortBy} ${sanitizedSortOrder}`;
      }

      // Thêm phân trang
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      query += ' LIMIT ? OFFSET ?';
      params.push(limitNum, offset);

      // Thực thi truy vấn chính
      const [rows] = await db.execute(query, params);

      // Định dạng dữ liệu
      rows.forEach(course => {
        if (course.average_rating) {
          course.average_rating = parseFloat(course.average_rating).toFixed(1);
        }
        course.student_count = parseInt(course.student_count || 0);
        course.review_count = parseInt(course.review_count || 0);
        course.lesson_count = parseInt(course.lesson_count || 0);
      });

      // Lấy tổng số lượng khóa học cho phân trang
      let countQuery = `
        SELECT COUNT(DISTINCT c.id) as total 
        FROM courses c
        WHERE 1=1
      `;
      
      // Thêm lại các điều kiện lọc cho truy vấn đếm
      if (instructor_id) countQuery += ' AND c.instructor_id = ?';
      if (level) countQuery += ' AND c.level = ?';
      if (is_published !== undefined) countQuery += ' AND c.is_published = ?';
      if (search) countQuery += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      if (category_id) {
        countQuery += ` AND EXISTS (
          SELECT 1 FROM category_items ci 
          WHERE ci.item_id = c.id 
          AND ci.item_type = 'course' 
          AND ci.category_id = ?
        )`;
      }
      if (price_min !== undefined && !isNaN(price_min)) countQuery += ' AND c.price >= ?';
      if (price_max !== undefined && !isNaN(price_max)) countQuery += ' AND c.price <= ?';

      // Thực thi truy vấn đếm, loại bỏ limit và offset từ params
      const [countResult] = await db.execute(
        countQuery,
        params.slice(0, -2)
      );

      // Trả về kết quả với thông tin phân trang
      return {
        courses: rows,
        total: countResult[0].total,
        page: pageNum,
        totalPages: Math.ceil(countResult[0].total / limitNum)
      };
    } catch (error) {
      console.error('Lỗi tìm danh sách khóa học:', error);
      throw new Error('Lỗi tìm danh sách khóa học: ' + error.message);
    }
  },

  /**
   * Cập nhật thông tin khóa học
   * @param {number} id ID khóa học
   * @param {Object} courseData Dữ liệu cập nhật
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (id, courseData) => {
    try {
      // Kiểm tra khóa học tồn tại
      const exists = await Course.exists(id);
      if (!exists) {
        throw new Error('Khóa học không tồn tại');
      }

      const allowedFields = [
        'title', 'description', 'price', 'sale_price', 'thumbnail',
        'level', 'meta_title', 'meta_description', 'slug', 'canonical_url',
        'is_published'
      ];
      const updates = [];
      const values = [];

      // Validate dữ liệu đầu vào
      if (courseData.price !== undefined) {
        if (isNaN(courseData.price) || courseData.price < 0) {
          throw new Error('Giá không hợp lệ');
        }
      }

      if (courseData.sale_price !== undefined) {
        if (isNaN(courseData.sale_price) || courseData.sale_price < 0) {
          throw new Error('Giá giảm không hợp lệ');
        }
      }

      if (courseData.slug) {
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(courseData.slug)) {
          throw new Error('Slug không hợp lệ (chỉ chấp nhận chữ thường, số và dấu gạch ngang)');
        }
        
        // Kiểm tra slug đã tồn tại chưa (và không phải là slug của chính khóa học này)
        const course = await Course.findBySlug(courseData.slug, false);
        if (course && course.id !== parseInt(id)) {
          throw new Error('Slug đã tồn tại, vui lòng chọn slug khác');
        }
      }

      // Validate level
      if (courseData.level && !['beginner', 'intermediate', 'advanced'].includes(courseData.level)) {
        throw new Error('Cấp độ khóa học không hợp lệ (chỉ chấp nhận beginner, intermediate, advanced)');
      }

      // Xây dựng câu truy vấn cập nhật
      for (const field of allowedFields) {
        if (courseData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(courseData[field]);
        }
      }

      if (updates.length === 0) return false;

      values.push(id);
      const query = `
        UPDATE courses SET 
        ${updates.join(', ')}, 
        updated_at = NOW()
        WHERE id = ?
      `;

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật khóa học:', error);
      throw new Error('Lỗi cập nhật khóa học: ' + error.message);
    }
  },

  /**
   * Xóa khóa học
   * @param {number} id ID khóa học
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      // Kiểm tra khóa học tồn tại
      const exists = await Course.exists(id);
      if (!exists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Kiểm tra nếu có học viên đã mua khóa học
      const studentCount = await Course.getStudentCount(id);
      if (studentCount > 0) {
        throw new Error(`Không thể xóa khóa học đã có ${studentCount} học viên đăng ký`);
      }

      // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Xóa các lesson liên quan
        await connection.execute('DELETE FROM lessons WHERE course_id = ?', [id]);
        
        // Xóa các liên kết category
        await connection.execute(
          'DELETE FROM category_items WHERE item_id = ? AND item_type = "course"',
          [id]
        );
        
        // Xóa khóa học
        const [result] = await connection.execute('DELETE FROM courses WHERE id = ?', [id]);
        
        await connection.commit();
        connection.release();
        
        return result.affectedRows > 0;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Lỗi xóa khóa học:', error);
      throw new Error('Lỗi xóa khóa học: ' + error.message);
    }
  },

  /**
   * Thêm khóa học vào danh mục
   * @param {number} courseId ID khóa học
   * @param {number} categoryId ID danh mục
   * @returns {Promise<number>} ID của bản ghi mới trong bảng category_items
   */
  addCategory: async (courseId, categoryId) => {
    try {
      // Kiểm tra khóa học tồn tại
      const courseExists = await Course.exists(courseId);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Kiểm tra danh mục tồn tại (tùy thuộc vào model Category)
      // const categoryExists = await Category.exists(categoryId);
      // if (!categoryExists) {
      //   throw new Error('Danh mục không tồn tại');
      // }

      // Kiểm tra xem đã thêm vào danh mục này chưa
      const [rows] = await db.execute(
        'SELECT id FROM category_items WHERE category_id = ? AND item_id = ? AND item_type = "course"',
        [categoryId, courseId]
      );

      if (rows.length > 0) {
        return rows[0].id; // Đã tồn tại, trả về ID hiện có
      }

      // Thực hiện thêm vào danh mục
      const [result] = await db.execute(
        'INSERT INTO category_items (category_id, item_id, item_type) VALUES (?, ?, "course")',
        [categoryId, courseId]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Lỗi thêm khóa học vào danh mục:', error);
      throw new Error('Lỗi thêm khóa học vào danh mục: ' + error.message);
    }
  },

  /**
   * Xóa khóa học khỏi danh mục
   * @param {number} courseId ID khóa học
   * @param {number} categoryId ID danh mục
   * @returns {Promise<boolean>} Kết quả xóa
   */
  removeCategory: async (courseId, categoryId) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM category_items WHERE item_id = ? AND item_type = "course" AND category_id = ?',
        [courseId, categoryId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa khóa học khỏi danh mục:', error);
      throw new Error('Lỗi xóa khóa học khỏi danh mục: ' + error.message);
    }
  },

  /**
   * Lấy danh sách danh mục của khóa học
   * @param {number} courseId ID khóa học
   * @returns {Promise<Array>} Danh sách danh mục
   */
  getCategories: async (courseId) => {
    try {
      const [rows] = await db.execute(
        `SELECT c.* 
         FROM categories c
         JOIN category_items ci ON c.id = ci.category_id
         WHERE ci.item_id = ? AND ci.item_type = "course"`,
        [courseId]
      );
      
      return rows;
    } catch (error) {
      console.error('Lỗi lấy danh sách danh mục:', error);
      throw new Error('Lỗi lấy danh sách danh mục: ' + error.message);
    }
  },

  /**
   * Lấy số lượng học viên của khóa học
   * @param {number} courseId ID khóa học
   * @returns {Promise<number>} Số lượng học viên
   */
  getStudentCount: async (courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(DISTINCT user_id) as count FROM purchases WHERE course_id = ?',
        [courseId]
      );
      
      return parseInt(rows[0].count || 0);
    } catch (error) {
      console.error('Lỗi lấy số lượng học viên:', error);
      throw new Error('Lỗi lấy số lượng học viên: ' + error.message);
    }
  },

  /**
   * Lấy đánh giá trung bình của khóa học
   * @param {number} courseId ID khóa học
   * @returns {Promise<Object>} Thông tin đánh giá trung bình
   */
  getAverageRating: async (courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE course_id = ?',
        [courseId]
      );
      
      return {
        averageRating: rows[0].average_rating ? parseFloat(rows[0].average_rating).toFixed(1) : 0,
        totalReviews: parseInt(rows[0].total_reviews || 0)
      };
    } catch (error) {
      console.error('Lỗi lấy đánh giá trung bình:', error);
      throw new Error('Lỗi lấy đánh giá trung bình: ' + error.message);
    }
  },

  /**
   * Lấy danh sách đánh giá của khóa học
   * @param {number} courseId ID khóa học
   * @param {Object} options Tùy chọn lọc và phân trang
   * @returns {Promise<Object>} Danh sách đánh giá và thông tin phân trang
   */
  getReviews: async (courseId, options = {}) => {
    try {
      const { 
        page = 1, 
        limit = 10,
        rating = null,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = options;

      // Validate các tham số đầu vào
      const allowedSortFields = ['rating', 'created_at'];
      const sanitizedSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sanitizedSortOrder = ['ASC', 'DESC'].includes(sort_order) ? sort_order : 'DESC';

      // Xây dựng câu truy vấn cơ bản
      let query = `
        SELECT r.*, u.username, u.full_name, u.avatar_url
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.course_id = ?
      `;
      
      const params = [courseId];

      // Lọc theo rating nếu có
      if (rating !== null && !isNaN(rating)) {
        query += ' AND r.rating = ?';
        params.push(parseInt(rating));
      }

      // Thêm sắp xếp
      query += ` ORDER BY r.${sanitizedSortBy} ${sanitizedSortOrder}`;

      // Thêm phân trang
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      query += ' LIMIT ? OFFSET ?';
      params.push(limitNum, offset);

      // Thực thi truy vấn chính
      const [rows] = await db.execute(query, params);

      // Lấy tổng số lượng đánh giá cho phân trang
      let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE course_id = ?';
      const countParams = [courseId];
      
      if (rating !== null && !isNaN(rating)) {
        countQuery += ' AND rating = ?';
        countParams.push(parseInt(rating));
      }

      const [countResult] = await db.execute(countQuery, countParams);

      // Trả về kết quả với thông tin phân trang
      return {
        reviews: rows,
        total: countResult[0].total,
        page: pageNum,
        totalPages: Math.ceil(countResult[0].total / limitNum)
      };
    } catch (error) {
      console.error('Lỗi lấy danh sách đánh giá:', error);
      throw new Error('Lỗi lấy danh sách đánh giá: ' + error.message);
    }
  },

  /**
   * Lấy danh sách bài học của khóa học
   * @param {number} courseId ID khóa học
   * @returns {Promise<Array>} Danh sách bài học
   */
  getLessons: async (courseId) => {
    try {
      const [rows] = await db.execute(
        `SELECT id, title, video_url, duration, order_number, description, is_preview
         FROM lessons
         WHERE course_id = ?
         ORDER BY order_number ASC, id ASC`,
        [courseId]
      );
      
      return rows;
    } catch (error) {
      console.error('Lỗi lấy danh sách bài học:', error);
      throw new Error('Lỗi lấy danh sách bài học: ' + error.message);
    }
  },

  /**
   * Kiểm tra học viên đã mua khóa học chưa
   * @param {number} userId ID học viên
   * @param {number} courseId ID khóa học
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  isEnrolled: async (userId, courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM purchases WHERE user_id = ? AND course_id = ?) as exist',
        [userId, courseId]
      );
      
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra đăng ký khóa học:', error);
      return false;
    }
  },

  /**
   * Kiểm tra khóa học có tồn tại
   * @param {number} id ID khóa học
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM courses WHERE id = ?) as exist',
        [id]
      );
      
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của khóa học:', error);
      return false;
    }
  },

  /**
   * Kiểm tra slug có tồn tại
   * @param {string} slug Slug cần kiểm tra
   * @returns {Promise<boolean>} Kết quả kiểm tra
   */
  slugExists: async (slug) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM courses WHERE slug = ?) as exist',
        [slug]
      );
      
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của slug:', error);
      return false;
    }
  },

  /**
   * Lấy số lượng khóa học của giảng viên
   * @param {number} instructorId ID giảng viên
   * @returns {Promise<number>} Số lượng khóa học
   */
  countByInstructor: async (instructorId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ?',
        [instructorId]
      );
      
      return parseInt(rows[0].count || 0);
    } catch (error) {
      console.error('Lỗi đếm số khóa học của giảng viên:', error);
      throw new Error('Lỗi đếm số khóa học: ' + error.message);
    }
  },

  /**
   * Tạo slug từ tiêu đề
   * @param {string} title Tiêu đề khóa học
   * @returns {string} Slug được tạo ra
   */
  createSlug: (title) => {
    if (!title) return '';
    
    // Chuyển đổi thành chữ thường và loại bỏ dấu tiếng Việt
    let slug = title.toLowerCase();
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Thay thế các ký tự không phải chữ cái, số bằng dấu gạch ngang
    slug = slug.replace(/[^a-z0-9]+/g, '-');
    
    // Loại bỏ dấu gạch ngang ở đầu và cuối
    slug = slug.replace(/^-+|-+$/g, '');
    
    return slug;
  },

  /**
   * Tạo khóa học từ bản nháp
   * @param {number} id ID khóa học (bản nháp)
   * @returns {Promise<boolean>} Kết quả xuất bản
   */
  publish: async (id) => {
    try {
      // Kiểm tra khóa học tồn tại
      const course = await Course.findById(id, false);
      if (!course) {
        throw new Error('Khóa học không tồn tại');
      }

      // Kiểm tra xem đã có bài học chưa
      const [lessonCount] = await db.execute(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?',
        [id]
      );

      if (parseInt(lessonCount[0].count) === 0) {
        throw new Error('Khóa học cần có ít nhất một bài học trước khi xuất bản');
      }

      // Cập nhật trạng thái xuất bản
      const [result] = await db.execute(
        'UPDATE courses SET is_published = 1, updated_at = NOW() WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xuất bản khóa học:', error);
      throw new Error('Lỗi xuất bản khóa học: ' + error.message);
    }
  },

  /**
   * Gỡ bỏ trạng thái xuất bản của khóa học
   * @param {number} id ID khóa học
   * @returns {Promise<boolean>} Kết quả gỡ bỏ xuất bản
   */
  unpublish: async (id) => {
    try {
      // Kiểm tra khóa học tồn tại
      const exists = await Course.exists(id);
      if (!exists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Cập nhật trạng thái xuất bản
      const [result] = await db.execute(
        'UPDATE courses SET is_published = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi gỡ bỏ xuất bản khóa học:', error);
      throw new Error('Lỗi gỡ bỏ xuất bản khóa học: ' + error.message);
    }
  }
};

module.exports = Course; 