const db = require('../config/database');
const { validationResult } = require('express-validator');
const Course = require('./Course');

/**
 * Model bài học
 * Quản lý các bài học trong khóa học
 */
const Lesson = {
  /**
   * Tạo bài học mới
   * @param {Object} lessonData - Dữ liệu bài học
   * @param {number} lessonData.course_id - ID khóa học
   * @param {string} lessonData.title - Tiêu đề bài học
   * @param {string} lessonData.video_url - URL video bài học
   * @param {number} [lessonData.duration] - Thời lượng video (giây)
   * @param {number} [lessonData.order_number] - Thứ tự bài học trong khóa học
   * @param {string} [lessonData.description] - Mô tả bài học
   * @param {boolean} [lessonData.is_preview] - Bài học xem trước hay không
   * @returns {Promise<number>} ID của bài học đã tạo
   */
  create: async (lessonData) => {
    try {
      const {
        course_id,
        title,
        video_url,
        duration,
        order_number,
        description,
        is_preview
      } = lessonData;

      // Validate dữ liệu đầu vào
      if (!course_id || !title || !video_url) {
        throw new Error('Thiếu thông tin bắt buộc: course_id, title, video_url');
      }

      // Kiểm tra khóa học có tồn tại
      const courseExists = await Course.exists(course_id);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Validate video_url format
      const videoUrlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!videoUrlPattern.test(video_url)) {
        throw new Error('URL video không hợp lệ');
      }

      // Xác định order_number mặc định nếu không được cung cấp
      let nextOrderNumber = order_number;
      if (!nextOrderNumber) {
        const [maxOrderResult] = await db.execute(
          'SELECT MAX(order_number) as max_order FROM lessons WHERE course_id = ?',
          [course_id]
        );
        nextOrderNumber = (maxOrderResult[0].max_order || 0) + 1;
      }

      const [result] = await db.execute(
        `INSERT INTO lessons (
          course_id, title, video_url, duration, order_number, description, is_preview, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          course_id,
          title,
          video_url,
          duration || 0,
          nextOrderNumber,
          description || '',
          is_preview || false
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Lỗi tạo bài học:', error);
      throw new Error('Lỗi tạo bài học: ' + error.message);
    }
  },

  /**
   * Tìm bài học theo ID
   * @param {number} id - ID bài học
   * @param {boolean} [includeProgress=false] - Có lấy thông tin tiến độ không
   * @returns {Promise<Object|null>} Thông tin bài học hoặc null nếu không tìm thấy
   */
  findById: async (id, includeProgress = false) => {
    try {
      let query = `
        SELECT l.*, c.title as course_title, c.instructor_id, c.slug as course_slug
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = ?`;
      
      const [rows] = await db.execute(query, [id]);
      
      if (!rows[0]) return null;
      
      // Lấy thông tin tiến độ nếu yêu cầu
      if (includeProgress) {
        const [progressRows] = await db.execute(
          `SELECT COUNT(*) as total_progress
           FROM user_progress 
           WHERE lesson_id = ?`,
          [id]
        );
        rows[0].progress_count = progressRows[0]?.total_progress || 0;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi tìm bài học theo ID:', error);
      throw new Error('Lỗi tìm bài học: ' + error.message);
    }
  },
  
  /**
   * Tìm bài học theo khóa học và thứ tự
   * @param {number} courseId - ID khóa học
   * @param {number} orderNumber - Thứ tự bài học
   * @returns {Promise<Object|null>} Thông tin bài học hoặc null nếu không tìm thấy
   */
  findByOrder: async (courseId, orderNumber) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM lessons
         WHERE course_id = ? AND order_number = ?`,
        [courseId, orderNumber]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi tìm bài học theo thứ tự:', error);
      throw new Error('Lỗi tìm bài học: ' + error.message);
    }
  },

  /**
   * Tìm tất cả bài học của khóa học
   * @param {number} courseId - ID khóa học
   * @param {Object} [options={}] - Tùy chọn
   * @param {boolean} [options.withProgress=false] - Có lấy thông tin tiến độ không
   * @param {number} [options.userId] - ID người dùng (cần thiết nếu withProgress=true)
   * @returns {Promise<Array>} Danh sách bài học
   */
  findByCourseId: async (courseId, options = {}) => {
    try {
      const { withProgress = false, userId } = options;
      
      let query = `SELECT l.* FROM lessons l WHERE l.course_id = ?`;
      
      if (withProgress && userId) {
        query = `
          SELECT l.*,
                 up.is_completed,
                 up.progress_percentage,
                 up.last_watched
          FROM lessons l
          LEFT JOIN user_progress up ON l.id = up.lesson_id AND up.user_id = ? AND up.course_id = ?
          WHERE l.course_id = ?
        `;
      }
      
      query += ` ORDER BY l.order_number ASC`;
      
      const params = withProgress && userId 
        ? [userId, courseId, courseId] 
        : [courseId];
      
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Lỗi tìm bài học theo khóa học:', error);
      throw new Error('Lỗi tìm bài học: ' + error.message);
    }
  },

  /**
   * Cập nhật bài học
   * @param {number} id - ID bài học
   * @param {Object} lessonData - Dữ liệu cập nhật
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (id, lessonData) => {
    try {
      // Kiểm tra bài học tồn tại
      const lessonExists = await Lesson.exists(id);
      if (!lessonExists) {
        throw new Error('Bài học không tồn tại');
      }
      
      // Lấy dữ liệu đầu vào
      const {
        title,
        video_url,
        duration,
        order_number,
        description,
        is_preview
      } = lessonData;

      // Validate video_url nếu được cung cấp
      if (video_url) {
        const videoUrlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!videoUrlPattern.test(video_url)) {
          throw new Error('URL video không hợp lệ');
        }
      }

      // Xây dựng câu lệnh UPDATE
      const updates = [];
      const values = [];
      
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      
      if (video_url !== undefined) {
        updates.push('video_url = ?');
        values.push(video_url);
      }
      
      if (duration !== undefined) {
        updates.push('duration = ?');
        values.push(duration);
      }
      
      if (order_number !== undefined) {
        updates.push('order_number = ?');
        values.push(order_number);
      }
      
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      
      if (is_preview !== undefined) {
        updates.push('is_preview = ?');
        values.push(is_preview);
      }
      
      // Nếu không có trường nào cần cập nhật
      if (updates.length === 0) {
        return false;
      }
      
      values.push(id);
      
      const [result] = await db.execute(
        `UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật bài học:', error);
      throw new Error('Lỗi cập nhật bài học: ' + error.message);
    }
  },

  /**
   * Xóa bài học
   * @param {number} id - ID bài học
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      // Kiểm tra bài học tồn tại
      const lessonExists = await Lesson.exists(id);
      if (!lessonExists) {
        throw new Error('Bài học không tồn tại');
      }
      
      // Kiểm tra xem bài học có tiến độ học tập liên quan không
      const [progressRows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_progress WHERE lesson_id = ?',
        [id]
      );
      
      // Bắt đầu giao dịch nếu cần xóa cả tiến độ học tập
      if (progressRows[0].count > 0) {
        await db.execute('START TRANSACTION');
        
        try {
          // Xóa tiến độ học tập trước
          await db.execute('DELETE FROM user_progress WHERE lesson_id = ?', [id]);
          
          // Xóa bài học
          const [result] = await db.execute('DELETE FROM lessons WHERE id = ?', [id]);
          
          // Hoàn thành giao dịch
          await db.execute('COMMIT');
          return result.affectedRows > 0;
        } catch (error) {
          // Rollback trong trường hợp lỗi
          await db.execute('ROLLBACK');
          throw error;
        }
      } else {
        // Nếu không có tiến độ học tập, chỉ cần xóa bài học
        const [result] = await db.execute('DELETE FROM lessons WHERE id = ?', [id]);
        return result.affectedRows > 0;
      }
    } catch (error) {
      console.error('Lỗi xóa bài học:', error);
      throw new Error('Lỗi xóa bài học: ' + error.message);
    }
  },

  /**
   * Kiểm tra quyền truy cập bài học
   * @param {number} lessonId - ID bài học
   * @param {number} userId - ID người dùng
   * @returns {Promise<boolean>} Người dùng có quyền truy cập hay không
   */
  checkAccess: async (lessonId, userId) => {
    try {
      const [rows] = await db.execute(
        `SELECT l.*, c.instructor_id, p.id as purchase_id
         FROM lessons l
         JOIN courses c ON l.course_id = c.id
         LEFT JOIN purchases p ON p.course_id = c.id AND p.user_id = ?
         WHERE l.id = ?`,
        [userId, lessonId]
      );

      if (!rows[0]) {
        return false;
      }

      const lesson = rows[0];
      
      // Bài học xem trước, người dùng là giảng viên, hoặc đã mua khóa học
      return lesson.is_preview || 
             lesson.instructor_id === userId || 
             lesson.purchase_id !== null;
    } catch (error) {
      console.error('Lỗi kiểm tra quyền truy cập bài học:', error);
      throw new Error('Lỗi kiểm tra quyền truy cập: ' + error.message);
    }
  },

  /**
   * Sắp xếp lại các bài học trong khóa học
   * @param {number} courseId - ID khóa học
   * @param {Array<{id: number, order: number}>} lessonOrders - Mảng thứ tự bài học mới
   * @returns {Promise<boolean>} Kết quả sắp xếp
   */
  reorder: async (courseId, lessonOrders) => {
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!Array.isArray(lessonOrders) || lessonOrders.length === 0) {
        throw new Error('Dữ liệu thứ tự bài học không hợp lệ');
      }
      
      // Kiểm tra khóa học tồn tại
      const courseExists = await Course.exists(courseId);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }
      
      // Bắt đầu giao dịch
      await db.execute('START TRANSACTION');

      try {
        for (const lessonOrder of lessonOrders) {
          const { id, order } = lessonOrder;
          
          // Kiểm tra bài học thuộc khóa học
          const [lessonRows] = await db.execute(
            'SELECT COUNT(*) as count FROM lessons WHERE id = ? AND course_id = ?',
            [id, courseId]
          );
          
          if (lessonRows[0].count === 0) {
            throw new Error(`Bài học ID ${id} không thuộc khóa học ID ${courseId}`);
          }
          
          // Cập nhật thứ tự
          await db.execute(
            'UPDATE lessons SET order_number = ? WHERE id = ? AND course_id = ?',
            [order, id, courseId]
          );
        }

        // Hoàn thành giao dịch
        await db.execute('COMMIT');
        return true;
      } catch (error) {
        // Rollback trong trường hợp lỗi
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Lỗi sắp xếp lại bài học:', error);
      throw new Error('Lỗi sắp xếp lại bài học: ' + error.message);
    }
  },

  /**
   * Lấy tổng số bài học trong khóa học
   * @param {number} courseId - ID khóa học
   * @returns {Promise<number>} Số lượng bài học
   */
  countByCourseId: async (courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?',
        [courseId]
      );
      return parseInt(rows[0].count, 10);
    } catch (error) {
      console.error('Lỗi đếm số bài học:', error);
      throw new Error('Lỗi đếm số bài học: ' + error.message);
    }
  },

  /**
   * Lấy tổng thời lượng của khóa học (tính bằng giây)
   * @param {number} courseId - ID khóa học
   * @returns {Promise<number>} Tổng thời lượng (giây)
   */
  getTotalDuration: async (courseId) => {
    try {
      const [rows] = await db.execute(
        'SELECT SUM(duration) as total_duration FROM lessons WHERE course_id = ?',
        [courseId]
      );
      return parseInt(rows[0].total_duration || 0, 10);
    } catch (error) {
      console.error('Lỗi lấy tổng thời lượng:', error);
      throw new Error('Lỗi lấy tổng thời lượng: ' + error.message);
    }
  },

  /**
   * Lấy bài học tiếp theo trong chuỗi
   * @param {number} courseId - ID khóa học
   * @param {number} currentLessonId - ID bài học hiện tại
   * @returns {Promise<Object|null>} Bài học tiếp theo hoặc null nếu là bài cuối
   */
  getNextLesson: async (courseId, currentLessonId) => {
    try {
      const [rows] = await db.execute(
        `SELECT l.* FROM lessons l
         WHERE l.course_id = ? AND l.order_number > (
           SELECT order_number FROM lessons WHERE id = ?
         )
         ORDER BY l.order_number ASC
         LIMIT 1`,
        [courseId, currentLessonId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi khi lấy bài học tiếp theo:', error);
      throw new Error('Lỗi khi lấy bài học tiếp theo: ' + error.message);
    }
  },

  /**
   * Lấy bài học trước đó trong chuỗi
   * @param {number} courseId - ID khóa học
   * @param {number} currentLessonId - ID bài học hiện tại
   * @returns {Promise<Object|null>} Bài học trước đó hoặc null nếu là bài đầu
   */
  getPreviousLesson: async (courseId, currentLessonId) => {
    try {
      const [rows] = await db.execute(
        `SELECT l.* FROM lessons l
         WHERE l.course_id = ? AND l.order_number < (
           SELECT order_number FROM lessons WHERE id = ?
         )
         ORDER BY l.order_number DESC
         LIMIT 1`,
        [courseId, currentLessonId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi khi lấy bài học trước đó:', error);
      throw new Error('Lỗi khi lấy bài học trước đó: ' + error.message);
    }
  },
  
  /**
   * Lấy bài học đầu tiên của khóa học
   * @param {number} courseId - ID khóa học
   * @returns {Promise<Object|null>} Bài học đầu tiên hoặc null nếu không có bài học
   */
  getFirstLesson: async (courseId) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM lessons 
         WHERE course_id = ? 
         ORDER BY order_number ASC 
         LIMIT 1`,
        [courseId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi khi lấy bài học đầu tiên:', error);
      throw new Error('Lỗi khi lấy bài học đầu tiên: ' + error.message);
    }
  },
  
  /**
   * Lấy danh sách bài học xem trước của khóa học
   * @param {number} courseId - ID khóa học
   * @returns {Promise<Array>} Danh sách bài học xem trước
   */
  getPreviewLessons: async (courseId) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM lessons 
         WHERE course_id = ? AND is_preview = true
         ORDER BY order_number ASC`,
        [courseId]
      );
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bài học xem trước:', error);
      throw new Error('Lỗi khi lấy danh sách bài học xem trước: ' + error.message);
    }
  },

  /**
   * Kiểm tra bài học có tồn tại
   * @param {number} id - ID bài học
   * @returns {Promise<boolean>} Bài học có tồn tại hay không
   */
  exists: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM lessons WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của bài học:', error);
      return false;
    }
  }
};

module.exports = Lesson; 