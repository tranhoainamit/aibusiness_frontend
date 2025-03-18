# Course Website Backend API

Backend API cho website bán khóa học trực tuyến, được xây dựng với Node.js, Express và MySQL.

## Tính năng

- 🔐 **Xác thực & Phân quyền**
  - Đăng ký, đăng nhập với JWT
  - Phân quyền theo vai trò (Admin, Instructor, User)
  - Quản lý phiên đăng nhập
  - Đặt lại mật khẩu

- 📚 **Quản lý Khóa học**
  - CRUD khóa học và bài học
  - Upload và quản lý video bài giảng
  - Phân loại khóa học theo danh mục
  - Đánh giá và bình luận

- 💰 **Thanh toán**
  - Tích hợp cổng thanh toán MoMo
  - Quản lý giao dịch mua khóa học
  - Hệ thống mã giảm giá
  - Lịch sử thanh toán

- 📝 **Quản lý Nội dung**
  - Blog/Tin tức
  - Banner quảng cáo
  - Widget tùy chỉnh
  - Menu động
  - Đối tác

- 👥 **Quản lý Người dùng**
  - Hồ sơ người dùng
  - Tiến độ học tập
  - Thông báo
  - Lịch sử hoạt động

## Yêu cầu hệ thống

- Node.js >= 14
- MySQL >= 8.0
- NPM hoặc Yarn

## Cài đặt

1. Clone repository:
\`\`\`bash
git clone https://github.com/tranhoainamit/aibusiness_backend.git
cd backend
\`\`\`

2. Cài đặt dependencies:
\`\`\`bash
npm install
\`\`\`

3. Tạo file .env từ mẫu:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Cấu hình biến môi trường trong file .env theo hướng dẫn trong file .env.example

5. Khởi tạo database:
\`\`\`bash
mysql -u root -p < db.sql
\`\`\`

6. Chạy server:
\`\`\`bash
# Development với nodemon
npm run dev

# Production
npm start
\`\`\`

## Cấu trúc thư mục

\`\`\`
backend/
├── config/             # Cấu hình database và các service
│   ├── database.js    # Kết nối MySQL
│   └── email.js       # Cấu hình SMTP
│
├── controllers/        # Xử lý logic nghiệp vụ
│   ├── authController.js      # Xử lý đăng nhập/đăng ký
│   ├── userController.js      # Quản lý người dùng
│   ├── courseController.js    # Quản lý khóa học
│   ├── lessonController.js    # Quản lý bài học
│   ├── categoryController.js  # Quản lý danh mục
│   ├── paymentController.js   # Xử lý thanh toán
│   ├── postController.js      # Quản lý bài viết
│   ├── commentController.js   # Quản lý bình luận
│   ├── imageController.js     # Upload và xử lý ảnh
│   ├── partnerController.js   # Quản lý đối tác
│   ├── widgetController.js    # Quản lý widget
│   ├── menuController.js      # Quản lý menu
│   ├── settingController.js   # Cài đặt hệ thống
│   ├── notificationController.js  # Quản lý thông báo
│   └── sessionController.js   # Quản lý phiên
│
├── middleware/         # Middleware
│   ├── auth.js        # Xác thực JWT
│   ├── upload.js      # Xử lý upload file
│   └── validator.js   # Validation dữ liệu
│
├── models/            # Models tương tác với database
│   ├── User.js        # Thao tác với bảng users
│   ├── Course.js      # Thao tác với bảng courses
│   ├── Lesson.js      # Thao tác với bảng lessons
│   ├── Category.js    # Thao tác với bảng categories
│   ├── Payment.js     # Thao tác với bảng payments
│   ├── Post.js        # Thao tác với bảng posts
│   ├── Comment.js     # Thao tác với bảng comments
│   ├── Image.js       # Thao tác với bảng images
│   ├── Partner.js     # Thao tác với bảng partners
│   ├── Widget.js      # Thao tác với bảng widgets
│   ├── Menu.js        # Thao tác với bảng menus
│   ├── Setting.js     # Thao tác với bảng settings
│   ├── Notification.js # Thao tác với bảng notifications
│   └── Session.js     # Thao tác với bảng sessions
│
├── routes/            # Định nghĩa routes
│   ├── authRoutes.js  # Routes xác thực
│   ├── userRoutes.js  # Routes người dùng
│   ├── courseRoutes.js # Routes khóa học
│   ├── lessonRoutes.js # Routes bài học
│   ├── categoryRoutes.js # Routes danh mục
│   ├── paymentRoutes.js # Routes thanh toán
│   ├── postRoutes.js  # Routes bài viết
│   ├── commentRoutes.js # Routes bình luận
│   ├── imageRoutes.js # Routes upload ảnh
│   ├── partnerRoutes.js # Routes đối tác
│   ├── widgetRoutes.js # Routes widget
│   ├── menuRoutes.js  # Routes menu
│   ├── settingRoutes.js # Routes cài đặt
│   ├── notificationRoutes.js # Routes thông báo
│   └── sessionRoutes.js # Routes phiên
│
├── uploads/           # Thư mục chứa files upload
│   ├── images/        # Ảnh upload
│   └── videos/        # Video bài giảng
│
├── app.js             # Entry point
├── db.sql             # Schema database
└── package.json
\`\`\`

## Chi tiết triển khai

### Controllers

Mỗi controller được thiết kế theo mô hình MVC, xử lý logic nghiệp vụ cụ thể:

- **authController.js**: Xử lý đăng ký, đăng nhập, refresh token, đặt lại mật khẩu
- **userController.js**: CRUD người dùng, cập nhật profile, quản lý role
- **courseController.js**: CRUD khóa học, quản lý nội dung, phân loại
- **lessonController.js**: CRUD bài học, upload video, tracking tiến độ
- **paymentController.js**: Xử lý thanh toán, tích hợp MoMo, quản lý giao dịch
- **postController.js**: CRUD bài viết, quản lý nội dung blog
- **imageController.js**: Upload và xử lý ảnh với multer
- **widgetController.js**: Quản lý widget và vị trí hiển thị
- **notificationController.js**: Gửi và quản lý thông báo
- **sessionController.js**: Quản lý phiên đăng nhập, tracking hoạt động

### Models

Các model triển khai các phương thức tương tác với database:

- **User.js**: Xác thực, CRUD, relations với roles
- **Course.js**: CRUD, relations với lessons, categories
- **Payment.js**: Xử lý giao dịch, tracking thanh toán
- **Post.js**: CRUD, SEO fields, relations với categories
- **Widget.js**: Quản lý content blocks, positioning
- **Session.js**: Tracking user sessions, activity logs

### Routes

API endpoints được tổ chức theo RESTful:

\`\`\`javascript
// authRoutes.js
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

// courseRoutes.js
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id

// lessonRoutes.js
GET    /api/lessons
POST   /api/lessons
GET    /api/lessons/:id
PUT    /api/lessons/:id
DELETE /api/lessons/:id
POST   /api/lessons/:id/complete

// paymentRoutes.js
POST   /api/payments/create
POST   /api/payments/momo-callback
GET    /api/payments/history

// Các routes khác tương tự...
\`\`\`

## API Documentation

Chi tiết API được mô tả trong Postman Collection. Import file sau vào Postman:
[Course Website API.postman_collection.json](./Course%20Website%20API.postman_collection.json)

## Security

1. **Xác thực**:
   - JWT cho API authentication
   - Refresh token rotation
   - Session management

2. **Bảo mật**:
   - Password hashing với bcrypt
   - Rate limiting cho API endpoints
   - CORS configuration
   - Helmet middleware cho HTTP headers
   - XSS protection
   - SQL injection prevention

3. **Validation**:
   - Input validation với express-validator
   - File upload validation
   - Data sanitization

## Error Handling

Hệ thống xử lý lỗi tập trung với các mã lỗi chuẩn:

\`\`\`javascript
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "field": "email",
      "message": "Email không đúng định dạng"
    }
  ]
}
\`\`\`

## Contributing

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

[MIT License](LICENSE)

## Contact

- Author: Tran Hoai Nam
- Email: tranhoainamit@gmail.com
- GitHub: https://github.com/tranhoainamit 