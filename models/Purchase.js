// File này đã được deprecated.
// Chức năng mua khóa học đã được tích hợp vào model Enrollment.js
// Xin hãy sử dụng Enrollment.js thay vì Purchase.js để quản lý việc mua và đăng ký khóa học

const Enrollment = require('./Enrollment');

// Re-export Enrollment để tránh breaking changes
module.exports = Enrollment; 