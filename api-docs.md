# API Documentation

## Cấu trúc Response

Tất cả các API trong dự án đều tuân theo cấu trúc phản hồi chuẩn như sau:

### Success Response
```json
{
  "message": "Thông báo thành công",
  "data": {
    // Dữ liệu trả về
  }
}
```

hoặc (đối với các thao tác không cần trả về dữ liệu):

```json
{
  "message": "Thông báo thành công"
}
```

### Error Response
```json
{
  "message": "Thông báo lỗi",
  "errors": [
    {
      "param": "tên_trường",
      "msg": "Chi tiết lỗi"
    }
  ]
}
```

## HTTP Status Codes

API sẽ sử dụng các mã HTTP status code tiêu chuẩn:

- `200 OK`: Yêu cầu thành công
- `201 Created`: Tài nguyên được tạo thành công
- `400 Bad Request`: Yêu cầu không hợp lệ (lỗi validation, dữ liệu sai định dạng...)
- `401 Unauthorized`: Cần xác thực
- `403 Forbidden`: Không có quyền truy cập
- `404 Not Found`: Không tìm thấy tài nguyên
- `500 Internal Server Error`: Lỗi server

## Authentication APIs

### 1. Đăng ký tài khoản
```
POST /api/auth/register
```

**Yêu cầu:**
- Username không được trùng
- Email không được trùng
- Password phải có ít nhất 6 ký tự

**Request Body:**
```json
{
  "username": "example",
  "email": "example@email.com",
  "password": "password123",
  "full_name": "Nguyen Van A",
  "phone": "0123456789",     // Không bắt buộc
  "bio": "Giới thiệu",       // Không bắt buộc
  "role_id": 1               // Mặc định là 1 (user thường)
}
```

**Success Response (201):**
```json
{
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": 1,
      "username": "example",
      "email": "example@email.com",
      "full_name": "Nguyen Van A", 
      "phone": "0123456789",
      "bio": "Giới thiệu",
      "role_id": 1,
      "status": "active"
    },
    "token": "jwt_token_here"
  }
}
```

**Error Responses:**
- **400 - Email đã tồn tại**
```json
{
  "message": "Email đã được đăng ký"
}
```

- **400 - Username đã tồn tại**
```json
{
  "message": "Tên đăng nhập đã tồn tại"
}
```

### 2. Đăng nhập
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "example@email.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": 1,
      "username": "example",
      "email": "example@email.com",
      "full_name": "Nguyen Van A",
      "role_id": 1,
      "status": "active"
    },
    "token": "jwt_token_here"
  }
}
```

**Error Responses:**
- **401 - Sai email hoặc mật khẩu**
```json
{
  "message": "Email hoặc mật khẩu không đúng"
}
```

### 3. Xác thực token
```
GET /api/auth/verify
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Xác thực token thành công",
  "data": {
    "user": {
      "id": 1,
      "name": "Nguyen Van A",
      "email": "example@email.com",
      "role_id": 1,
      "avatar": null
    }
  }
}
```

**Error Responses:**
- **401 - Token không hợp lệ**
```json
{
  "message": "Token không hợp lệ"
}
```

### 4. Đổi mật khẩu
```
PUT /api/auth/change-password
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "newPassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Cập nhật mật khẩu thành công"
}
```

**Error Responses:**
- **401 - Mật khẩu hiện tại không đúng**
```json
{
  "message": "Mật khẩu hiện tại không đúng"
}
```

## User APIs

### 1. Lấy thông tin profile
```
GET /api/users/profile
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Lấy thông tin người dùng thành công",
  "data": {
    "id": 1,
    "username": "example",
    "email": "example@email.com",
    "full_name": "Nguyen Van A",
    "phone": "0123456789",
    "avatar_url": "url_to_avatar",
    "bio": "Giới thiệu",
    "role_id": 1,
    "status": "active",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### 2. Cập nhật profile
```
PUT /api/users/profile
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "full_name": "Nguyen Van B",
  "phone": "0123456789",
  "bio": "Giới thiệu mới",
  "avatar_url": "url_to_new_avatar"
}
```

**Success Response (200):**
```json
{
  "message": "Cập nhật thông tin người dùng thành công",
  "data": {
    "id": 1,
    "username": "example",
    "email": "example@email.com",
    "full_name": "Nguyen Van B",
    "phone": "0123456789",
    "avatar_url": "url_to_new_avatar",
    "bio": "Giới thiệu mới",
    "role_id": 1,
    "status": "active"
  }
}
```

### 3. Xóa tài khoản
```
DELETE /api/users/account
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Xóa tài khoản thành công"
}
```

## Course APIs

### 1. Lấy danh sách khóa học
```
GET /api/courses
```

**Query Parameters:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10)
- `search`: Tìm kiếm theo tiêu đề và mô tả
- `category`: Lọc theo danh mục
- `featured`: Lọc khóa học nổi bật (true/false)

**Success Response (200):**
```json
{
  "message": "Lấy danh sách khóa học thành công",
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "Complete Web Development Course",
        "description": "Learn web development from scratch",
        "price": 29.99,
        "sale_price": 19.99,
        "thumbnail": "url_to_thumbnail",
        "instructor_name": "Nguyen Van A",
        "instructor_avatar": "url_to_avatar",
        "level": "beginner",
        "average_rating": "4.5",
        "review_count": 50,
        "student_count": 500,
        "categories": [
          {
            "id": 1,
            "name": "Web Development"
          }
        ]
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "total_pages": 5
    }
  }
}
```

### 2. Lấy chi tiết khóa học
```
GET /api/courses/:id
```

**Success Response (200):**
```json
{
  "message": "Lấy thông tin khóa học thành công",
  "data": {
    "id": 1,
    "title": "Complete Web Development Course",
    "description": "Learn web development from scratch",
    "price": 29.99,
    "sale_price": 19.99,
    "thumbnail": "url_to_thumbnail",
    "instructor_id": 2,
    "instructor_name": "Nguyen Van A",
    "instructor_avatar": "url_to_avatar",
    "level": "beginner",
    "meta_title": "Learn Web Development",
    "meta_description": "Comprehensive web development course",
    "slug": "complete-web-development",
    "is_published": true,
    "average_rating": "4.5",
    "review_count": 50,
    "student_count": 500,
    "lesson_count": 20,
    "created_at": "2023-01-01T00:00:00Z",
    "categories": [
      {
        "id": 1,
        "name": "Web Development"
      }
    ],
    "lessons": [
      {
        "id": 1,
        "title": "Introduction to HTML",
        "video_url": "url_to_video",
        "duration": 1800,
        "order_number": 1
      }
    ]
  }
}
```

**Error Responses:**
- **404 - Không tìm thấy khóa học**
```json
{
  "message": "Không tìm thấy khóa học"
}
```

### 3. Tạo khóa học mới (Instructor/Admin)
```
POST /api/courses
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "title": "Complete Web Development Course",
  "description": "Learn web development from scratch",
  "price": 29.99,
  "sale_price": 19.99,
  "thumbnail": "url_to_thumbnail",
  "level": "beginner",
  "meta_title": "Learn Web Development",
  "meta_description": "Comprehensive web development course",
  "slug": "complete-web-development",
  "is_published": false,
  "categories": [1, 2]
}
```

**Success Response (201):**
```json
{
  "message": "Tạo khóa học thành công",
  "data": {
    "id": 1,
    "title": "Complete Web Development Course",
    "description": "Learn web development from scratch",
    "price": 29.99,
    "sale_price": 19.99,
    "thumbnail": "url_to_thumbnail",
    "instructor_id": 2,
    "level": "beginner",
    "meta_title": "Learn Web Development",
    "meta_description": "Comprehensive web development course",
    "slug": "complete-web-development",
    "is_published": false,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### 4. Cập nhật khóa học (Instructor owner/Admin)
```
PUT /api/courses/:id
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "title": "Updated Web Development Course",
  "price": 39.99,
  "is_published": true,
  "categories": [1, 3]
}
```

**Success Response (200):**
```json
{
  "message": "Cập nhật khóa học thành công",
  "data": {
    "id": 1,
    "title": "Updated Web Development Course",
    "description": "Learn web development from scratch",
    "price": 39.99,
    "sale_price": 19.99,
    "thumbnail": "url_to_thumbnail",
    "instructor_id": 2,
    "level": "beginner",
    "meta_title": "Learn Web Development",
    "meta_description": "Comprehensive web development course",
    "slug": "complete-web-development",
    "is_published": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-02T00:00:00Z"
  }
}
```

### 5. Xóa khóa học (Instructor owner/Admin)
```
DELETE /api/courses/:id
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Xóa khóa học thành công"
}
```

## Lesson APIs

### 1. Lấy danh sách bài học theo khóa học
```
GET /api/lessons/course/:courseId
```

**Success Response (200):**
```json
{
  "message": "Lấy danh sách bài học thành công",
  "data": [
    {
      "id": 1,
      "course_id": 1,
      "title": "Introduction to HTML",
      "description": "Learn the basics of HTML",
      "video_url": "url_to_video",
      "duration": 1800,
      "order_number": 1,
      "created_at": "2023-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "course_id": 1,
      "title": "CSS Fundamentals",
      "description": "Learn the basics of CSS",
      "video_url": "url_to_video",
      "duration": 2400,
      "order_number": 2,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Lấy chi tiết bài học
```
GET /api/lessons/:id
```

**Success Response (200):**
```json
{
  "message": "Lấy thông tin bài học thành công",
  "data": {
    "id": 1,
    "course_id": 1,
    "title": "Introduction to HTML",
    "description": "Learn the basics of HTML",
    "video_url": "url_to_video",
    "duration": 1800,
    "order_number": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

### 3. Tạo bài học mới (Instructor/Admin)
```
POST /api/lessons
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "course_id": 1,
  "title": "JavaScript Basics",
  "description": "Learn the fundamentals of JavaScript",
  "video_url": "url_to_video",
  "duration": 3600,
  "order_number": 3
}
```

**Success Response (201):**
```json
{
  "message": "Tạo bài học thành công",
  "data": {
    "id": 3,
    "course_id": 1,
    "title": "JavaScript Basics",
    "description": "Learn the fundamentals of JavaScript",
    "video_url": "url_to_video",
    "duration": 3600,
    "order_number": 3,
    "created_at": "2023-01-02T00:00:00Z"
  }
}
```

## Category APIs

### 1. Lấy danh sách danh mục
```
GET /api/categories
```

**Query Parameters:**
- `stats`: Bao gồm thống kê (true/false, mặc định: false)

**Success Response (200):**
```json
{
  "message": "Lấy danh sách danh mục thành công",
  "data": [
    {
      "id": 1,
      "name": "Web Development",
      "description": "Web development courses",
      "parent_id": null,
      "course_count": 15,
      "student_count": 750
    },
    {
      "id": 2,
      "name": "Mobile Development",
      "description": "Mobile app development courses",
      "parent_id": null,
      "course_count": 8,
      "student_count": 420
    }
  ]
}
```

### 2. Lấy cây danh mục
```
GET /api/categories/tree
```

**Success Response (200):**
```json
{
  "message": "Lấy cây danh mục thành công",
  "data": [
    {
      "id": 1,
      "name": "Web Development",
      "description": "Web development courses",
      "children": [
        {
          "id": 3,
          "name": "Frontend",
          "description": "Frontend development",
          "children": []
        },
        {
          "id": 4,
          "name": "Backend",
          "description": "Backend development",
          "children": []
        }
      ]
    },
    {
      "id": 2,
      "name": "Mobile Development",
      "description": "Mobile app development courses",
      "children": []
    }
  ]
}
```

## Comment APIs

### 1. Tạo bình luận mới
```
POST /api/comments
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "content": "Bài học rất hay và dễ hiểu!",
  "lesson_id": 1,
  "parent_id": null
}
```

hoặc

```json
{
  "content": "Bài viết rất hữu ích!",
  "post_id": 2,
  "parent_id": null
}
```

**Success Response (201):**
```json
{
  "message": "Tạo bình luận thành công",
  "data": {
    "id": 1,
    "content": "Bài học rất hay và dễ hiểu!",
    "lesson_id": 1,
    "post_id": null,
    "parent_id": null,
    "user_id": 1,
    "is_active": true,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### 2. Lấy danh sách bình luận
```
GET /api/comments
```

**Query Parameters:**
- `lesson_id`: Lọc theo bài học
- `post_id`: Lọc theo bài viết
- `user_id`: Lọc theo người dùng
- `parent_id`: Lọc các phản hồi của một bình luận
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10)

**Success Response (200):**
```json
{
  "message": "Lấy danh sách bình luận thành công",
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "Bài học rất hay và dễ hiểu!",
        "lesson_id": 1,
        "post_id": null,
        "parent_id": null,
        "user_id": 1,
        "username": "user1",
        "full_name": "Nguyen Van A",
        "avatar_url": "url_to_avatar",
        "is_active": true,
        "created_at": "2023-01-01T00:00:00Z",
        "reply_count": 2
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "total_pages": 2
    }
  }
}
```

## Payment APIs

### 1. Tạo thanh toán mới
```
POST /api/payments
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "purchase_id": 1,
  "amount": 29.99,
  "payment_method": "momo",
  "transaction_id": null,
  "payment_details": null
}
```

**Success Response (201):**
```json
{
  "message": "Tạo thanh toán thành công",
  "data": {
    "id": 1,
    "purchase_id": 1,
    "user_id": 1,
    "amount": 29.99,
    "payment_method": "momo",
    "status": "pending",
    "transaction_id": null,
    "payment_details": null,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### 2. Cập nhật trạng thái thanh toán (Admin)
```
PUT /api/payments/:id/status
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "status": "completed",
  "transaction_id": "TXN12345",
  "payment_details": "Thanh toán thành công qua MoMo"
}
```

**Success Response (200):**
```json
{
  "message": "Cập nhật trạng thái thanh toán thành công",
  "data": {
    "id": 1,
    "purchase_id": 1,
    "user_id": 1,
    "amount": 29.99,
    "payment_method": "momo",
    "status": "completed",
    "transaction_id": "TXN12345",
    "payment_details": "Thanh toán thành công qua MoMo",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:05:00Z"
  }
}
```

## Post APIs

### 1. Lấy danh sách bài viết
```
GET /api/posts
```

**Query Parameters:**
- `author_id`: Lọc theo tác giả
- `status`: Lọc theo trạng thái (published/draft)
- `search`: Tìm kiếm theo tiêu đề và nội dung
- `category_id`: Lọc theo danh mục
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10)

**Success Response (200):**
```json
{
  "message": "Lấy danh sách bài viết thành công",
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "Getting Started with React",
        "content": "React is a JavaScript library for building user interfaces...",
        "thumbnail": "url_to_thumbnail",
        "author_id": 2,
        "author_name": "Nguyen Van A",
        "status": "published",
        "categories": [
          {
            "id": 1,
            "name": "Web Development"
          }
        ],
        "created_at": "2023-01-01T00:00:00Z",
        "comment_count": 5
      }
    ],
    "pagination": {
      "total": 20,
      "page": 1,
      "limit": 10,
      "total_pages": 2
    }
  }
}
```

### 2. Tạo bài viết mới (Editor/Admin)
```
POST /api/posts
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "title": "Introduction to Node.js",
  "content": "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine...",
  "thumbnail": "url_to_thumbnail",
  "status": "draft",
  "meta_title": "Learn Node.js",
  "meta_description": "Introduction to Node.js for beginners",
  "canonical_url": null,
  "categories": [1, 3]
}
```

**Success Response (201):**
```json
{
  "message": "Tạo bài viết thành công",
  "data": {
    "id": 2,
    "title": "Introduction to Node.js",
    "content": "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine...",
    "thumbnail": "url_to_thumbnail",
    "author_id": 2,
    "status": "draft",
    "meta_title": "Learn Node.js",
    "meta_description": "Introduction to Node.js for beginners",
    "canonical_url": null,
    "created_at": "2023-01-02T00:00:00Z"
  }
}
```

## Settings APIs

### 1. Lấy tất cả cài đặt (Admin)
```
GET /api/settings
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Lấy danh sách cài đặt thành công",
  "data": {
    "site_name": "Course Platform",
    "site_description": "Learn new skills online",
    "contact_email": "contact@example.com",
    "social_links": {
      "facebook": "https://facebook.com/courseplatform",
      "twitter": "https://twitter.com/courseplatform"
    },
    "payment_methods": ["momo", "bank_transfer"],
    "homepage_layout": "featured_courses",
    "theme_color": "#3498db"
  }
}
```

### 2. Cập nhật cài đặt (Admin)
```
PUT /api/settings
```

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "site_name": "New Course Platform",
  "homepage_layout": "category_grid"
}
```

**Success Response (200):**
```json
{
  "message": "Cập nhật cài đặt thành công",
  "data": {
    "site_name": "New Course Platform",
    "site_description": "Learn new skills online",
    "contact_email": "contact@example.com",
    "social_links": {
      "facebook": "https://facebook.com/courseplatform",
      "twitter": "https://twitter.com/courseplatform"
    },
    "payment_methods": ["momo", "bank_transfer"],
    "homepage_layout": "category_grid",
    "theme_color": "#3498db"
  }
}
```
