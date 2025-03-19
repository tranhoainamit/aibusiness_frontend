/**
 * Script di chuyển và chuẩn hóa cấu trúc model
 * 
 * Script này hướng dẫn việc di chuyển model Purchase.js sang Enrollment.js
 * và chuẩn hóa các model để đảm bảo tuân thủ schema trong db.sql
 */

// Cơ sở dữ liệu vẫn được giữ nguyên, các hàm truy vấn DB được cập nhật để phản ánh đúng cấu trúc

/**
 * Hướng dẫn di chuyển từ Purchase sang Enrollment
 * 
 * 1. Model Enrollment.js đã được cập nhật với đầy đủ chức năng từ Purchase.js
 * 2. Purchase.js đã được đổi thành một wrapper gọi đến Enrollment để tránh breaking changes
 * 3. Cập nhật các mã sử dụng Purchase model để thay thế bằng Enrollment model
 */

// Cách sử dụng Enrollment model (thay thế cho Purchase model)

/*
// Trước đây:
const Purchase = require('./models/Purchase');
const purchaseId = await Purchase.create({
  user_id: 1,
  course_id: 2,
  original_price: 1000000,
  discount_amount: 200000,
  total_amount: 800000
});

// Hiện nay:
const Enrollment = require('./models/Enrollment');
const enrollmentId = await Enrollment.create({
  user_id: 1,
  course_id: 2,
  original_price: 1000000,
  discount_amount: 200000,
  total_amount: 800000
});

// Hoặc vẫn dùng Purchase như cũ (được forward đến Enrollment)
const Purchase = require('./models/Purchase');
const purchaseId = await Purchase.create({...});
*/

/**
 * Hướng dẫn chuẩn hóa model
 * 
 * Tất cả model đã được chuẩn hóa theo mẫu với các đặc điểm:
 * 
 * 1. JSDoc đầy đủ cho model và các phương thức
 * 2. Validation dữ liệu đầu vào nhất quán
 * 3. Sử dụng transaction cho các thao tác phức tạp
 * 4. Phân trang và bộ lọc đồng nhất 
 * 5. Xử lý lỗi chi tiết và rõ ràng
 * 
 * Các model hiện có:
 * - User.js: Quản lý người dùng
 * - Role.js: Quản lý vai trò và quyền hạn
 * - Course.js: Quản lý khóa học
 * - Lesson.js: Quản lý bài học trong khóa học
 * - Enrollment.js: Quản lý đăng ký/mua khóa học (thay thế Purchase.js)
 * - Payment.js: Quản lý thanh toán
 * - Progress.js: Quản lý tiến độ học tập
 * - Coupon.js: Quản lý mã giảm giá
 * - Review.js: Quản lý đánh giá khóa học
 * - Notification.js: Quản lý thông báo
 * - Comment.js: Quản lý bình luận
 * - Category.js: Quản lý danh mục
 * - Post.js: Quản lý bài viết
 * - Menu.js: Quản lý menu
 * - Widget.js: Quản lý widget
 * - Partner.js: Quản lý đối tác
 * - Image.js: Quản lý hình ảnh
 * - Banner.js: Quản lý banner
 * - Setting.js: Quản lý cài đặt
 * - Session.js: Quản lý phiên đăng nhập
 */

/**
 * Lưu ý về Table Permissions
 * 
 * Bảng permissions trong schema db.sql lưu trữ các quyền của từng vai trò.
 * Model Role.js đã được chuẩn hóa để làm việc với bảng permissions thông qua các phương thức:
 * - findByIdWithPermissions: Tìm vai trò theo ID và kèm theo quyền hạn
 * - findByNameWithPermissions: Tìm vai trò theo tên và kèm theo quyền hạn
 * - findAll: Lấy tất cả vai trò và quyền hạn
 * - hasPermission: Kiểm tra vai trò có quyền cụ thể hay không
 * - addPermission: Thêm quyền cho vai trò
 * - updatePermissions: Cập nhật quyền cho vai trò
 * - removePermission: Xóa quyền của vai trò
 */

/**
 * Lưu ý về Transaction
 * 
 * Tất cả các thao tác phức tạp liên quan đến nhiều bảng nên sử dụng transaction:
 * 
 * ```javascript
 * // Bắt đầu transaction
 * const connection = await db.getConnection();
 * await connection.beginTransaction();
 * 
 * try {
 *   // Thực hiện các thao tác DB
 *   await connection.execute(...);
 *   await connection.execute(...);
 *   
 *   // Commit khi thành công
 *   await connection.commit();
 *   return result;
 * } catch (error) {
 *   // Rollback khi có lỗi
 *   await connection.rollback();
 *   throw error;
 * } finally {
 *   // Giải phóng connection
 *   connection.release();
 * }
 * ```
 */

console.log('Migrate script loaded successfully');
console.log('Hệ thống model đã được chuẩn hóa và cập nhật theo schema db.sql');
console.log('Purchase.js đã được thay thế bởi Enrollment.js với đầy đủ chức năng'); 