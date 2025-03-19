const db = require('../config/database');
const { validationResult } = require('express-validator');
const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');

/**
 * Model tiến độ học tập
 * Quản lý tiến độ học tập của người dùng với các bài học
 */
const Progress = {
  /**
   * Tạo tiến độ học tập mới
   * @param {Object} progressData - Dữ liệu tiến độ học tập
   * @param {number} progressData.user_id - ID người dùng
   * @param {number} progressData.course_id - ID khóa học
   * @param {number} progressData.lesson_id - ID bài học
   * @param {boolean} [progressData.is_completed=false] - Trạng thái hoàn thành
   * @param {number} [progressData.progress_percentage=0] - Phần trăm tiến độ (0-100)
   * @returns {Promise<number|boolean>} ID của tiến độ học tập đã tạo hoặc true nếu cập nhật
   */
  create: async (progressData) => {
    try {
      const {
        user_id,
        course_id,
        lesson_id,
        is_completed = false,
        progress_percentage = 0
      } = progressData;

      // Validate dữ liệu đầu vào
      if (!user_id || !course_id || !lesson_id) {
        throw new Error('Thiếu thông tin bắt buộc: user_id, course_id, lesson_id');
      }

      // Validate progress_percentage
      if (progress_percentage < 0 || progress_percentage > 100) {
        throw new Error('Phần trăm tiến độ phải từ 0 đến 100');
      }

      // Kiểm tra người dùng tồn tại
      const userExists = await User.exists(user_id);
      if (!userExists) {
        throw new Error('Người dùng không tồn tại');
      }

      // Kiểm tra khóa học tồn tại
      const courseExists = await Course.exists(course_id);
      if (!courseExists) {
        throw new Error('Khóa học không tồn tại');
      }

      // Kiểm tra bài học tồn tại
      const lessonExists = await Lesson.exists(lesson_id);
      if (!lessonExists) {
        throw new Error('Bài học không tồn tại');
      }

      // Kiểm tra bài học có thuộc khóa học không
      const [lessonCheck] = await db.execute(
        'SELECT COUNT(*) as count FROM lessons WHERE id = ? AND course_id = ?',
        [lesson_id, course_id]
      );
      
      if (lessonCheck[0].count === 0) {
        throw new Error('Bài học không thuộc khóa học này');
      }

      // Tạo hoặc cập nhật tiến độ học tập
      const [result] = await db.execute(
        `INSERT INTO user_progress (
          user_id, course_id, lesson_id, is_completed, 
          progress_percentage, last_watched
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          is_completed = VALUES(is_completed),
          progress_percentage = VALUES(progress_percentage),
          last_watched = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN VALUES(is_completed) = 1 AND is_completed = 0 
                         THEN CURRENT_TIMESTAMP 
                         ELSE completed_at END`,
        [
          user_id, 
          course_id, 
          lesson_id, 
          is_completed, 
          progress_percentage
        ]
      );

      return result.insertId || true;
    } catch (error) {
      console.error('Lỗi tạo tiến độ học tập:', error);
      throw new Error('Lỗi tạo tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Cập nhật tiến độ học tập
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {number} lesson_id - ID bài học
   * @param {Object} progressData - Dữ liệu cập nhật
   * @param {boolean} [progressData.is_completed] - Trạng thái hoàn thành
   * @param {number} [progressData.progress_percentage] - Phần trăm tiến độ (0-100)
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  update: async (user_id, course_id, lesson_id, progressData) => {
    try {
      // Kiểm tra tiến độ học tập tồn tại
      const [existCheck] = await db.execute(
        'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?',
        [user_id, course_id, lesson_id]
      );
      
      if (existCheck[0].count === 0) {
        throw new Error('Không tìm thấy tiến độ học tập để cập nhật');
      }
      
      const { is_completed, progress_percentage } = progressData;
      
      const updates = [];
      const values = [];
      
      if (progress_percentage !== undefined) {
        if (progress_percentage < 0 || progress_percentage > 100) {
          throw new Error('Phần trăm tiến độ phải từ 0 đến 100');
        }
        updates.push('progress_percentage = ?');
        values.push(progress_percentage);
      }
      
      if (is_completed !== undefined) {
        updates.push('is_completed = ?');
        values.push(is_completed);
        
        if (is_completed) {
          updates.push('completed_at = CURRENT_TIMESTAMP');
        }
      }
      
      if (updates.length === 0) return false;
      
      updates.push('last_watched = CURRENT_TIMESTAMP');
      
      values.push(user_id, course_id, lesson_id);
      
      const [result] = await db.execute(
        `UPDATE user_progress SET ${updates.join(', ')} 
         WHERE user_id = ? AND course_id = ? AND lesson_id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi cập nhật tiến độ học tập:', error);
      throw new Error('Lỗi cập nhật tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Cập nhật hoặc tạo mới tiến độ học tập
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {number} lesson_id - ID bài học
   * @param {Object} progressData - Dữ liệu tiến độ
   * @param {boolean} [progressData.is_completed] - Trạng thái hoàn thành
   * @param {number} [progressData.progress_percentage] - Phần trăm tiến độ (0-100)
   * @returns {Promise<number|boolean>} ID tiến độ mới hoặc kết quả cập nhật
   */
  updateOrCreate: async (user_id, course_id, lesson_id, progressData) => {
    try {
      // Validate các tham số
      if (!user_id || !course_id || !lesson_id) {
        throw new Error('Thiếu thông tin bắt buộc: user_id, course_id, lesson_id');
      }
      
      const { is_completed, progress_percentage } = progressData;
      
      // Validate progress_percentage
      if (progress_percentage !== undefined && (progress_percentage < 0 || progress_percentage > 100)) {
        throw new Error('Phần trăm tiến độ phải từ 0 đến 100');
      }
      
      // Kiểm tra tiến độ đã tồn tại chưa
      const [rows] = await db.execute(
        'SELECT id FROM user_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?',
        [user_id, course_id, lesson_id]
      );
      
      if (rows.length > 0) {
        // Cập nhật tiến độ hiện tại
        await Progress.update(user_id, course_id, lesson_id, progressData);
        return rows[0].id;
      } else {
        // Tạo mới tiến độ
        return await Progress.create({
          user_id,
          course_id,
          lesson_id,
          is_completed: is_completed || false,
          progress_percentage: progress_percentage || 0
        });
      }
    } catch (error) {
      console.error('Lỗi cập nhật/tạo tiến độ học tập:', error);
      throw new Error('Lỗi cập nhật/tạo tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Tìm tiến độ học tập theo ID
   * @param {number} id - ID tiến độ học tập
   * @param {boolean} [includeDetails=false] - Có lấy thêm thông tin chi tiết không
   * @returns {Promise<Object|null>} Thông tin tiến độ học tập hoặc null nếu không tìm thấy
   */
  findById: async (id, includeDetails = false) => {
    try {
      if (!id) {
        throw new Error('ID tiến độ học tập là bắt buộc');
      }
      
      let query = 'SELECT * FROM user_progress WHERE id = ?';
      
      if (includeDetails) {
        query = `
          SELECT up.*, 
                 u.username as user_name, u.full_name as user_full_name,
                 c.title as course_title, c.slug as course_slug,
                 l.title as lesson_title, l.order_number as lesson_order
          FROM user_progress up
          JOIN users u ON up.user_id = u.id
          JOIN courses c ON up.course_id = c.id
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.id = ?
        `;
      }
      
      const [rows] = await db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi tìm tiến độ học tập theo ID:', error);
      throw new Error('Lỗi tìm tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Tìm tiến độ học tập của bài học
   * @param {number} user_id - ID người dùng
   * @param {number} lesson_id - ID bài học
   * @param {boolean} [includeDetails=false] - Có lấy thêm thông tin chi tiết không
   * @returns {Promise<Object|null>} Thông tin tiến độ học tập hoặc null nếu không tìm thấy
   */
  findByLesson: async (user_id, lesson_id, includeDetails = false) => {
    try {
      if (!user_id || !lesson_id) {
        throw new Error('ID người dùng và ID bài học là bắt buộc');
      }
      
      let query = 'SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?';
      
      if (includeDetails) {
        query = `
          SELECT up.*, 
                 c.title as course_title, c.slug as course_slug,
                 l.title as lesson_title, l.order_number as lesson_order,
                 l.video_url, l.duration
          FROM user_progress up
          JOIN courses c ON up.course_id = c.id
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.user_id = ? AND up.lesson_id = ?
        `;
      }
      
      const [rows] = await db.execute(query, [user_id, lesson_id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Lỗi tìm tiến độ học tập của bài học:', error);
      throw new Error('Lỗi tìm tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Tìm tất cả tiến độ học tập của người dùng trong một khóa học
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {Object} [options={}] - Tùy chọn bổ sung
   * @param {boolean} [options.includeIncomplete=true] - Có bao gồm bài học chưa hoàn thành
   * @param {boolean} [options.includeDetails=false] - Có lấy thêm thông tin chi tiết
   * @returns {Promise<Array>} Danh sách tiến độ học tập
   */
  findByCourse: async (user_id, course_id, options = {}) => {
    try {
      if (!user_id || !course_id) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      const { includeIncomplete = true, includeDetails = false } = options;
      
      let query = `
        SELECT up.*, l.title as lesson_title, l.order_number  
        FROM user_progress up
        JOIN lessons l ON up.lesson_id = l.id
        WHERE up.user_id = ? AND up.course_id = ?
      `;
      
      if (!includeIncomplete) {
        query += ' AND up.is_completed = 1';
      }
      
      if (includeDetails) {
        query = `
          SELECT up.*, 
                 l.title as lesson_title, l.order_number, l.video_url, 
                 l.duration, l.is_preview
          FROM user_progress up
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.user_id = ? AND up.course_id = ?
        `;
        
        if (!includeIncomplete) {
          query += ' AND up.is_completed = 1';
        }
      }
      
      query += ' ORDER BY l.order_number ASC';
      
      const [rows] = await db.execute(query, [user_id, course_id]);
      return rows;
    } catch (error) {
      console.error('Lỗi tìm tiến độ học tập của khóa học:', error);
      throw new Error('Lỗi tìm tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Lấy tổng quan tiến độ của khóa học
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {boolean} [includeLastLesson=false] - Có lấy thông tin bài học cuối cùng đã xem
   * @returns {Promise<Object>} Thông tin tổng quan tiến độ
   */
  getCourseProgress: async (user_id, course_id, includeLastLesson = false) => {
    try {
      if (!user_id || !course_id) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      // Kiểm tra người dùng đã đăng ký khóa học chưa
      const [enrollmentCheck] = await db.execute(
        'SELECT COUNT(*) as enrolled FROM purchases WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );
      
      if (enrollmentCheck[0].enrolled === 0) {
        throw new Error('Người dùng chưa đăng ký khóa học này');
      }
      
      const [rows] = await db.execute(
        `SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN up.is_completed = 1 THEN up.lesson_id END) as completed_lessons,
          IFNULL(SUM(up.progress_percentage) / COUNT(DISTINCT l.id), 0) as avg_progress,
          MAX(up.last_watched) as last_activity
        FROM lessons l
        LEFT JOIN user_progress up ON l.id = up.lesson_id AND up.user_id = ?
        WHERE l.course_id = ?`,
        [user_id, course_id]
      );
      
      const progress = rows[0];
      progress.completion_rate = progress.total_lessons > 0 
        ? (progress.completed_lessons / progress.total_lessons) * 100 
        : 0;
      
      // Nếu yêu cầu thông tin bài học cuối cùng đã xem
      if (includeLastLesson) {
        const [lastLessonRows] = await db.execute(
          `SELECT up.*, l.title as lesson_title, l.order_number
           FROM user_progress up
           JOIN lessons l ON up.lesson_id = l.id
           WHERE up.user_id = ? AND up.course_id = ?
           ORDER BY up.last_watched DESC
           LIMIT 1`,
          [user_id, course_id]
        );
        
        if (lastLessonRows.length > 0) {
          progress.last_lesson = lastLessonRows[0];
        }
      }
        
      return progress;
    } catch (error) {
      console.error('Lỗi lấy tổng quan tiến độ khóa học:', error);
      throw new Error('Lỗi lấy tổng quan tiến độ: ' + error.message);
    }
  },

  /**
   * Đánh dấu bài học đã hoàn thành
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {number} lesson_id - ID bài học
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  markAsCompleted: async (user_id, course_id, lesson_id) => {
    try {
      return await Progress.updateOrCreate(user_id, course_id, lesson_id, {
        is_completed: true,
        progress_percentage: 100
      });
    } catch (error) {
      console.error('Lỗi đánh dấu bài học đã hoàn thành:', error);
      throw new Error('Lỗi đánh dấu bài học: ' + error.message);
    }
  },

  /**
   * Đánh dấu bài học chưa hoàn thành
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {number} lesson_id - ID bài học
   * @param {number} [progress_percentage=0] - Phần trăm tiến độ
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  markAsIncomplete: async (user_id, course_id, lesson_id, progress_percentage = 0) => {
    try {
      return await Progress.updateOrCreate(user_id, course_id, lesson_id, {
        is_completed: false,
        progress_percentage
      });
    } catch (error) {
      console.error('Lỗi đánh dấu bài học chưa hoàn thành:', error);
      throw new Error('Lỗi đánh dấu bài học: ' + error.message);
    }
  },

  /**
   * Cập nhật tiến độ xem video
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @param {number} lesson_id - ID bài học
   * @param {number} current_time - Thời gian hiện tại (giây)
   * @param {number} duration - Thời lượng tổng cộng (giây)
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  updateVideoProgress: async (user_id, course_id, lesson_id, current_time, duration) => {
    try {
      if (!user_id || !course_id || !lesson_id) {
        throw new Error('ID người dùng, ID khóa học và ID bài học là bắt buộc');
      }
      
      if (current_time < 0 || duration <= 0 || current_time > duration) {
        throw new Error('Giá trị thời gian không hợp lệ');
      }
      
      // Tính toán phần trăm tiến độ
      const progress_percentage = Math.min(Math.round((current_time / duration) * 100), 100);
      
      // Kiểm tra xem đã xem xong chưa (nếu đã xem 90% trở lên thì coi như hoàn thành)
      const is_completed = progress_percentage >= 90;
      
      return await Progress.updateOrCreate(user_id, course_id, lesson_id, {
        is_completed,
        progress_percentage
      });
    } catch (error) {
      console.error('Lỗi cập nhật tiến độ xem video:', error);
      throw new Error('Lỗi cập nhật tiến độ: ' + error.message);
    }
  },

  /**
   * Xóa tiến độ học tập
   * @param {number} id - ID tiến độ học tập
   * @returns {Promise<boolean>} Kết quả xóa
   */
  delete: async (id) => {
    try {
      if (!id) {
        throw new Error('ID tiến độ học tập là bắt buộc');
      }
      
      // Kiểm tra tiến độ tồn tại
      const exists = await Progress.exists(id);
      if (!exists) {
        throw new Error('Tiến độ học tập không tồn tại');
      }
      
      const [result] = await db.execute(
        'DELETE FROM user_progress WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa tiến độ học tập:', error);
      throw new Error('Lỗi xóa tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Xóa tất cả tiến độ học tập của một khóa học
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @returns {Promise<boolean>} Kết quả xóa
   */
  deleteAllByCourse: async (user_id, course_id) => {
    try {
      if (!user_id || !course_id) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      const [result] = await db.execute(
        'DELETE FROM user_progress WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi xóa tiến độ học tập của khóa học:', error);
      throw new Error('Lỗi xóa tiến độ học tập: ' + error.message);
    }
  },
  
  /**
   * Đặt lại tiến độ học tập của người dùng cho một khóa học
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @returns {Promise<boolean>} Kết quả đặt lại
   */
  resetProgress: async (user_id, course_id) => {
    try {
      if (!user_id || !course_id) {
        throw new Error('ID người dùng và ID khóa học là bắt buộc');
      }
      
      const [result] = await db.execute(
        `UPDATE user_progress 
         SET is_completed = 0, 
             progress_percentage = 0, 
             completed_at = NULL 
         WHERE user_id = ? AND course_id = ?`,
        [user_id, course_id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Lỗi đặt lại tiến độ học tập:', error);
      throw new Error('Lỗi đặt lại tiến độ học tập: ' + error.message);
    }
  },

  /**
   * Kiểm tra tiến độ học tập có tồn tại
   * @param {number} id - ID tiến độ học tập
   * @returns {Promise<boolean>} Tiến độ học tập có tồn tại hay không
   */
  exists: async (id) => {
    try {
      if (!id) return false;
      
      const [rows] = await db.execute(
        'SELECT EXISTS(SELECT 1 FROM user_progress WHERE id = ?) as exist',
        [id]
      );
      return rows[0].exist === 1;
    } catch (error) {
      console.error('Lỗi kiểm tra sự tồn tại của tiến độ học tập:', error);
      return false;
    }
  },
  
  /**
   * Kiểm tra người dùng đã bắt đầu học khóa học chưa
   * @param {number} user_id - ID người dùng
   * @param {number} course_id - ID khóa học
   * @returns {Promise<boolean>} Người dùng đã bắt đầu học hay chưa
   */
  hasStarted: async (user_id, course_id) => {
    try {
      if (!user_id || !course_id) return false;
      
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error('Lỗi kiểm tra người dùng đã bắt đầu học khóa học:', error);
      return false;
    }
  },
  
  /**
   * Lấy thống kê tiến độ học tập của nhiều người dùng
   * @param {number} course_id - ID khóa học
   * @param {Object} [options={}] - Tùy chọn bổ sung
   * @param {number} [options.limit=20] - Số lượng kết quả trả về
   * @param {number} [options.offset=0] - Vị trí bắt đầu
   * @returns {Promise<Object>} Thống kê tiến độ học tập
   */
  getStatsByCourse: async (course_id, options = {}) => {
    try {
      if (!course_id) {
        throw new Error('ID khóa học là bắt buộc');
      }
      
      const { limit = 20, offset = 0 } = options;
      
      // Lấy tổng số bài học trong khóa học
      const [lessonCountRows] = await db.execute(
        'SELECT COUNT(*) as total_lessons FROM lessons WHERE course_id = ?',
        [course_id]
      );
      
      const totalLessons = lessonCountRows[0].total_lessons;
      
      // Lấy thống kê tiến độ của từng người dùng
      const [rows] = await db.execute(
        `SELECT 
          u.id as user_id, u.username, u.full_name,
          COUNT(DISTINCT up.lesson_id) as completed_lessons,
          IFNULL(SUM(up.progress_percentage) / ?, 0) as avg_progress,
          MAX(up.last_watched) as last_activity
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_progress up ON p.user_id = up.user_id AND p.course_id = up.course_id AND up.is_completed = 1
        WHERE p.course_id = ?
        GROUP BY u.id
        ORDER BY completed_lessons DESC, last_activity DESC
        LIMIT ? OFFSET ?`,
        [totalLessons, course_id, limit, offset]
      );
      
      // Tính toán tỷ lệ hoàn thành cho mỗi người dùng
      rows.forEach(row => {
        row.completion_rate = totalLessons > 0 
          ? (row.completed_lessons / totalLessons) * 100 
          : 0;
      });
      
      // Lấy tổng số người dùng đã đăng ký khóa học
      const [countRows] = await db.execute(
        'SELECT COUNT(*) as total FROM purchases WHERE course_id = ?',
        [course_id]
      );
      
      return {
        stats: rows,
        total_users: countRows[0].total,
        total_lessons: totalLessons
      };
    } catch (error) {
      console.error('Lỗi lấy thống kê tiến độ học tập:', error);
      throw new Error('Lỗi lấy thống kê tiến độ học tập: ' + error.message);
    }
  }
};

module.exports = Progress; 