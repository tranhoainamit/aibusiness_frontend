const db = require('../config/database');

// Validation rules, if needed
// const statsValidation = [];

// Admin Stats
const getUserStats = async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role_id = 1 THEN 1 END) as students,
        COUNT(CASE WHEN role_id = 2 THEN 1 END) as instructors
      FROM users
      WHERE deleted_at IS NULL
    `);

    res.json({
      message: 'Lấy thống kê người dùng thành công',
      data: stats[0]
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê người dùng:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê người dùng',
      error: error.message
    });
  }
};

const getCourseStats = async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft
      FROM courses
      WHERE deleted_at IS NULL
    `);

    res.json({
      message: 'Lấy thống kê khóa học thành công',
      data: stats[0]
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê khóa học:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê khóa học',
      error: error.message
    });
  }
};

const getRevenueStats = async (req, res) => {
  try {
    const [stats] = await db.execute(`
      WITH monthly_revenue AS (
        SELECT 
          SUM(amount) as total,
          SUM(CASE 
            WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            THEN amount ELSE 0 END
          ) as this_month,
          SUM(CASE 
            WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            THEN amount ELSE 0 END
          ) as last_month
        FROM payments
        WHERE status = 'completed'
        AND deleted_at IS NULL
      )
      SELECT 
        COALESCE(total, 0) as total,
        COALESCE(this_month, 0) as thisMonth,
        COALESCE(last_month, 0) as lastMonth
      FROM monthly_revenue
    `);

    res.json({
      message: 'Lấy thống kê doanh thu thành công',
      data: stats[0]
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê doanh thu:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê doanh thu',
      error: error.message
    });
  }
};

// Instructor Stats
const getInstructorCourseStats = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COALESCE(AVG(rating), 0) as averageRating,
        COUNT(DISTINCT r.id) as totalReviews
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.instructor_id = ?
      AND c.deleted_at IS NULL
      GROUP BY c.instructor_id
    `, [instructor_id]);

    res.json({
      message: 'Lấy thống kê khóa học của giảng viên thành công',
      data: stats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        averageRating: 0,
        totalReviews: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê khóa học của giảng viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê khóa học của giảng viên',
      error: error.message
    });
  }
};

const getInstructorStudentStats = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT e.user_id) as total,
        COUNT(DISTINCT CASE 
          WHEN e.created_at >= DATE_TRUNC('month', CURRENT_DATE)
          THEN e.user_id END
        ) as thisMonth
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      WHERE c.instructor_id = ?
      AND c.deleted_at IS NULL
      AND e.deleted_at IS NULL
    `, [instructor_id]);

    res.json({
      message: 'Lấy thống kê học viên của giảng viên thành công',
      data: stats[0] || {
        total: 0,
        thisMonth: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê học viên của giảng viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê học viên của giảng viên',
      error: error.message
    });
  }
};

const getInstructorEarningStats = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const [stats] = await db.execute(`
      WITH instructor_earnings AS (
        SELECT 
          SUM(p.amount * c.instructor_share) as total,
          SUM(CASE 
            WHEN DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
            THEN p.amount * c.instructor_share ELSE 0 END
          ) as this_month,
          SUM(CASE 
            WHEN DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            THEN p.amount * c.instructor_share ELSE 0 END
          ) as last_month
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE c.instructor_id = ?
        AND p.status = 'completed'
        AND p.deleted_at IS NULL
      )
      SELECT 
        COALESCE(total, 0) as total,
        COALESCE(this_month, 0) as thisMonth,
        COALESCE(last_month, 0) as lastMonth
      FROM instructor_earnings
    `, [instructor_id]);

    res.json({
      message: 'Lấy thống kê thu nhập của giảng viên thành công',
      data: stats[0]
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê thu nhập của giảng viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê thu nhập của giảng viên',
      error: error.message
    });
  }
};

// Student Stats
const getStudentCourseStats = async (req, res) => {
  try {
    const { student_id } = req.query;
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN e.progress = 100 THEN 1 END) as completed,
        COUNT(CASE WHEN e.progress < 100 THEN 1 END) as inProgress
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      AND e.deleted_at IS NULL
      AND c.deleted_at IS NULL
    `, [student_id]);

    res.json({
      message: 'Lấy thống kê khóa học của học viên thành công',
      data: stats[0] || {
        total: 0,
        completed: 0,
        inProgress: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê khóa học của học viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê khóa học của học viên',
      error: error.message
    });
  }
};

const getStudentProgressStats = async (req, res) => {
  try {
    const { student_id } = req.query;
    const [stats] = await db.execute(`
      SELECT 
        COALESCE(AVG(progress), 0) as average
      FROM enrollments
      WHERE user_id = ?
      AND deleted_at IS NULL
    `, [student_id]);

    res.json({
      message: 'Lấy thống kê tiến độ của học viên thành công',
      data: {
        average: Math.round(stats[0].average || 0)
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê tiến độ của học viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê tiến độ của học viên',
      error: error.message
    });
  }
};

const getStudentCertificateStats = async (req, res) => {
  try {
    const { student_id } = req.query;
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE 
          WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
          THEN 1 END
        ) as thisMonth
      FROM certificates
      WHERE user_id = ?
      AND deleted_at IS NULL
    `, [student_id]);

    res.json({
      message: 'Lấy thống kê chứng chỉ của học viên thành công',
      data: stats[0] || {
        total: 0,
        thisMonth: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê chứng chỉ của học viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê chứng chỉ của học viên',
      error: error.message
    });
  }
};

// Public stats
const getGeneralStats = async (req, res) => {
  try {
    // Get user statistics
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role_id = 1 THEN 1 END) as total_students,
        COUNT(CASE WHEN role_id = 2 THEN 1 END) as total_instructors
      FROM users
    `);
    
    // Get course statistics
    const [courseStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_courses,
        COUNT(CASE WHEN is_published = 0 THEN 1 END) as draft_courses
      FROM courses
    `);
    
    res.json({
      message: 'Lấy thống kê tổng quan thành công',
      data: {
        ...userStats[0],
        ...courseStats[0]
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê tổng quan:', error);
    console.error('Chi tiết lỗi:', error.stack);
    res.status(500).json({
      message: 'Không thể lấy thống kê tổng quan',
      error: error.message
    });
  }
};

// Instructor Stats
const getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_published = 1 THEN 1 END) as published,
        COUNT(CASE WHEN is_published = 0 THEN 1 END) as draft,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.instructor_id = ?
      GROUP BY c.instructor_id
    `, [instructorId]);
    
    res.json({
      message: 'Lấy thống kê khóa học của giảng viên thành công',
      data: stats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        average_rating: 0,
        total_reviews: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê khóa học của giảng viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê khóa học của giảng viên',
      error: error.message
    });
  }
};

const getInstructorStudents = async (req, res) => {
  try {
    const instructorId = req.user.id;
    
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT e.user_id) as total,
        COUNT(DISTINCT CASE 
          WHEN e.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
          THEN e.user_id END
        ) as this_month
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      WHERE c.instructor_id = ?
    `, [instructorId]);
    
    res.json({
      message: 'Lấy thống kê học viên của giảng viên thành công',
      data: stats[0] || {
        total: 0,
        this_month: 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê học viên của giảng viên:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê học viên của giảng viên',
      error: error.message
    });
  }
};

module.exports = {
  getUserStats,
  getCourseStats,
  getRevenueStats,
  getInstructorCourseStats,
  getInstructorStudentStats,
  getInstructorEarningStats,
  getStudentCourseStats,
  getStudentProgressStats,
  getStudentCertificateStats,
  getGeneralStats,
  getInstructorCourses,
  getInstructorStudents
};