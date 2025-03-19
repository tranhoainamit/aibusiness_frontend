-- Tạo cơ sở dữ liệu course_website
CREATE DATABASE course_website;
USE course_website;

-- 1. Bảng roles: Quản lý các vai trò (admin, editor, instructor, user, v.v.)
-- Tạo trước vì được tham chiếu bởi bảng users và permissions
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho vai trò, tự động tăng
    name VARCHAR(50) NOT NULL UNIQUE,                   -- Tên vai trò (ví dụ: admin, editor, instructor, user), không được trùng, không được để trống
    description TEXT                                    -- Mô tả vai trò, có thể để trống
);

-- 2. Bảng users: Quản lý thông tin người dùng (admin, học viên, giảng viên, v.v.)
-- Tạo sau bảng roles vì có khóa ngoại role_id tham chiếu đến roles
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho người dùng, tự động tăng
    username VARCHAR(50) NOT NULL UNIQUE,               -- Tên người dùng, không được trùng, không được để trống
    email VARCHAR(100) NOT NULL UNIQUE,                 -- Email của người dùng, không được trùng, không được để trống
    password VARCHAR(255) NOT NULL,                     -- Mật khẩu (mã hóa, ví dụ bằng bcrypt), không được để trống
    avatar_url VARCHAR(255),                            -- Đường dẫn đến ảnh đại diện của người dùng, có thể để trống
    role_id INT,                                        -- ID của vai trò (tham chiếu đến bảng roles), có thể để trống nếu không có vai trò cụ thể
    full_name VARCHAR(100),                             -- Họ và tên đầy đủ của người dùng, có thể để trống
    phone VARCHAR(20),                                  -- Số điện thoại của người dùng, có thể để trống
    bio TEXT,                                           -- Tiểu sử ngắn gọn về người dùng (dành cho giảng viên hoặc hồ sơ công khai), có thể để trống
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active', -- Trạng thái tài khoản: hoạt động, không hoạt động, bị khóa, mặc định là active
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo tài khoản, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến bảng roles, nếu vai trò bị xóa thì đặt thành NULL
);

-- 3. Bảng permissions: Quản lý quyền của từng vai trò
-- Tạo sau bảng roles vì có khóa ngoại role_id tham chiếu đến roles
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho quyền, tự động tăng
    role_id INT NOT NULL,                               -- ID của vai trò, không được để trống
    permission VARCHAR(100) NOT NULL,                   -- Tên quyền (ví dụ: create_course, delete_post), không được để trống
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng roles, nếu vai trò bị xóa thì quyền cũng bị xóa
);

-- 4. Bảng courses: Quản lý thông tin các khóa học
-- Tạo sau bảng users vì có khóa ngoại instructor_id tham chiếu đến users
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho khóa học, tự động tăng
    title VARCHAR(255) NOT NULL,                        -- Tiêu đề khóa học, không được để trống
    description TEXT,                                   -- Mô tả chi tiết về khóa học, có thể để trống
    price DECIMAL(10, 2) NOT NULL,                      -- Giá gốc của khóa học, không được để trống
    sale_price DECIMAL(10, 2),                          -- Giá sau khi giảm (giá sell, nếu có khuyến mãi), có thể để trống
    thumbnail VARCHAR(255),                             -- Đường dẫn đến ảnh đại diện của khóa học, có thể để trống
    instructor_id INT,                                  -- ID của giảng viên tạo khóa học, có thể là NULL nếu giảng viên bị xóa
    level ENUM('beginner', 'intermediate', 'advanced'), -- Cấp độ khóa học: cơ bản, trung cấp, nâng cao, có thể để trống
    meta_title VARCHAR(255),                            -- Tiêu đề SEO của khóa học, tối ưu cho công cụ tìm kiếm, có thể để trống
    meta_description TEXT,                              -- Mô tả SEO của khóa học, tối ưu cho công cụ tìm kiếm, có thể để trống
    slug VARCHAR(255) UNIQUE,                           -- Đường dẫn thân thiện SEO (ví dụ: /khoa-hoc-lap-trinh), không được trùng, có thể để trống
    canonical_url VARCHAR(255),                         -- URL chuẩn (canonical) để tránh nội dung trùng lặp, có thể để trống
    is_published BOOLEAN DEFAULT FALSE,                 -- Trạng thái xuất bản khóa học (TRUE: đã xuất bản, FALSE: chưa xuất bản), mặc định là FALSE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo khóa học, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến bảng users, nếu giảng viên bị xóa thì đặt thành NULL
);

-- 5. Bảng lessons: Quản lý bài học (video) trong các khóa học
-- Tạo sau bảng courses vì có khóa ngoại course_id tham chiếu đến courses
CREATE TABLE lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho bài học, tự động tăng
    course_id INT NOT NULL,                             -- ID của khóa học mà bài học thuộc về, không được để trống
    title VARCHAR(255) NOT NULL,                        -- Tiêu đề bài học, không được để trống
    video_url VARCHAR(255) NOT NULL,                    -- Đường dẫn đến video bài học, không được để trống
    duration INT,                                       -- Thời lượng video (tính bằng giây), có thể để trống
    order_number INT,                                   -- Thứ tự bài học trong khóa học, có thể để trống
    is_preview BOOLEAN DEFAULT FALSE,                   -- Trạng thái bài học có thể xem trước (TRUE: xem trước được, FALSE: không), mặc định là FALSE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo bài học, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì bài học cũng bị xóa
);

-- 6. Bảng posts: Quản lý bài viết blog/marketing
-- Tạo sau bảng users vì có khóa ngoại author_id tham chiếu đến users
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho bài viết, tự động tăng
    title VARCHAR(255) NOT NULL,                        -- Tiêu đề bài viết, không được để trống
    content TEXT NOT NULL,                              -- Nội dung bài viết, không được để trống
    thumbnail VARCHAR(255),                             -- Đường dẫn đến ảnh đại diện bài viết, có thể để trống
    author_id INT,                                      -- ID của tác giả (user), có thể là NULL nếu user bị xóa
    status ENUM('draft', 'published') DEFAULT 'draft',  -- Trạng thái bài viết: nháp (draft) hoặc đã đăng (published), mặc định là draft
    meta_title VARCHAR(255),                            -- Tiêu đề SEO của bài viết, tối ưu cho công cụ tìm kiếm, có thể để trống
    meta_description TEXT,                              -- Mô tả SEO của bài viết, tối ưu cho công cụ tìm kiếm, có thể để trống
    slug VARCHAR(255) UNIQUE,                           -- Đường dẫn thân thiện SEO (ví dụ: /bai-viet-seo), không được trùng, có thể để trống
    canonical_url VARCHAR(255),                         -- URL chuẩn (canonical) để tránh nội dung trùng lặp, có thể để trống
    views_count INT DEFAULT 0,                          -- Số lượt xem bài viết, mặc định là 0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo bài viết, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì đặt thành NULL
);

-- 7. Bảng images: Quản lý hình ảnh tải lên hệ thống
-- Tạo sau bảng users vì có khóa ngoại uploaded_by tham chiếu đến users
CREATE TABLE images (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho hình ảnh, tự động tăng
    url VARCHAR(255) NOT NULL,                          -- Đường dẫn đến hình ảnh, không được để trống
    alt_text VARCHAR(255),                              -- Văn bản thay thế (alt) cho hình ảnh, tối ưu SEO, có thể để trống
    uploaded_by INT,                                    -- ID của người dùng tải ảnh lên, có thể là NULL nếu người dùng bị xóa
    file_size INT,                                      -- Kích thước tệp hình ảnh (tính bằng byte), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tải ảnh lên, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì đặt thành NULL
);

-- 8. Bảng banners: Quản lý banner quảng cáo trên website
-- Tạo sau bảng images vì có khóa ngoại image_id tham chiếu đến images
CREATE TABLE banners (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho banner, tự động tăng
    image_id INT NOT NULL,                              -- ID của ảnh dùng cho banner, không được để trống
    title VARCHAR(255),                                 -- Tiêu đề banner, có thể để trống
    description TEXT,                                   -- Mô tả banner, có thể để trống
    link VARCHAR(255),                                  -- Liên kết khi click vào banner, có thể để trống
    position VARCHAR(50),                               -- Vị trí hiển thị banner (ví dụ: homepage, sidebar), có thể để trống
    is_active BOOLEAN DEFAULT TRUE,                     -- Trạng thái hiển thị banner (TRUE: hiển thị, FALSE: ẩn), mặc định là TRUE
    start_date TIMESTAMP,                               -- Thời gian bắt đầu hiển thị banner, có thể để trống
    end_date TIMESTAMP,                                 -- Thời gian kết thúc hiển thị banner, có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo banner, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng images, nếu ảnh bị xóa thì banner cũng bị xóa
);

-- 9. Bảng categories: Quản lý danh mục cho khóa học và bài viết
-- Tạo trước vì không phụ thuộc vào bảng khác, nhưng được tham chiếu bởi category_items
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho danh mục, tự động tăng
    name VARCHAR(100) NOT NULL,                         -- Tên danh mục (ví dụ: Lập trình, Marketing), không được để trống
    type ENUM('course', 'post') NOT NULL,               -- Loại danh mục: course (khóa học) hoặc post (bài viết), không được để trống
    slug VARCHAR(100) UNIQUE,                           -- Đường dẫn thân thiện SEO cho danh mục (ví dụ: /lap-trinh), không được trùng, có thể để trống
    description TEXT,                                   -- Mô tả danh mục, có thể để trống
    parent_id INT,                                      -- ID của danh mục cha (nếu là danh mục con), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo danh mục, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến chính bảng categories, nếu danh mục cha bị xóa thì đặt thành NULL
);

-- 10. Bảng category_items: Liên kết danh mục với khóa học hoặc bài viết
-- Tạo sau bảng categories vì có khóa ngoại category_id tham chiếu đến categories
CREATE TABLE category_items (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho liên kết, tự động tăng
    category_id INT NOT NULL,                           -- ID của danh mục, không được để trống
    item_id INT NOT NULL,                               -- ID của khóa học hoặc bài viết, không được để trống
    item_type ENUM('course', 'post') NOT NULL,          -- Loại mục: course (khóa học) hoặc post (bài viết), không được để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo liên kết, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng categories, nếu danh mục bị xóa thì liên kết cũng bị xóa
);

-- 11. Bảng coupons: Quản lý mã giảm giá
-- Tạo trước vì được tham chiếu bởi bảng purchases và coupon_courses
CREATE TABLE coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho mã giảm giá, tự động tăng
    code VARCHAR(50) NOT NULL UNIQUE,                   -- Mã giảm giá (ví dụ: GIAMGIA1), không được trùng, không được để trống
    discount_type ENUM('percentage', 'fixed') NOT NULL, -- Loại giảm giá: phần trăm hoặc cố định, không được để trống
    discount_value DECIMAL(10, 2) NOT NULL,             -- Giá trị giảm giá (ví dụ: 50% hoặc 500,000 VNĐ), không được để trống
    max_uses INT,                                       -- Số lần tối đa mã có thể được sử dụng (ví dụ: 3), nếu NULL thì không giới hạn
    used_count INT DEFAULT 0,                           -- Số lần mã đã được sử dụng, mặc định là 0
    start_date TIMESTAMP,                               -- Thời gian bắt đầu hiệu lực, có thể để trống
    end_date TIMESTAMP,                                 -- Thời gian hết hiệu lực, có thể để trống
    is_active BOOLEAN DEFAULT TRUE,                     -- Trạng thái mã giảm giá (TRUE: hoạt động, FALSE: không hoạt động), mặc định là TRUE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- Thời gian tạo mã giảm giá, tự động ghi nhận thời điểm hiện tại
);

-- 12. Bảng purchases: Quản lý giao dịch mua khóa học
-- Tạo sau bảng users, courses và coupons vì có khóa ngoại tham chiếu đến chúng
CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho giao dịch, tự động tăng
    user_id INT NOT NULL,                               -- ID của người dùng mua khóa học, không được để trống
    course_id INT NOT NULL,                             -- ID của khóa học được mua, không được để trống
    coupon_id INT,                                      -- ID của mã giảm giá được sử dụng (nếu có), có thể để trống
    original_price DECIMAL(10, 2) NOT NULL,             -- Giá gốc của khóa học tại thời điểm mua, không được để trống
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,        -- Số tiền giảm giá (nếu có), mặc định là 0
    total_amount DECIMAL(10, 2) NOT NULL,               -- Tổng số tiền sau khi áp dụng giảm giá, không được để trống
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Thời gian mua khóa học, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì giao dịch cũng bị xóa
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì giao dịch cũng bị xóa
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL, -- Khóa ngoại tham chiếu đến bảng coupons, nếu mã giảm giá bị xóa thì đặt thành NULL
    UNIQUE (user_id, course_id)                         -- Ràng buộc duy nhất: mỗi user chỉ mua một khóa học một lần
);

-- 13. Bảng payments: Quản lý chi tiết thanh toán
-- Tạo sau bảng purchases vì có khóa ngoại purchase_id tham chiếu đến purchases
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho thanh toán, tự động tăng
    purchase_id INT NOT NULL,                           -- ID của giao dịch trong bảng purchases, không được để trống
    amount DECIMAL(10, 2) NOT NULL,                     -- Số tiền thanh toán, không được để trống
    payment_method ENUM('card', 'bank', 'paypal', 'momo') NOT NULL, -- Phương thức thanh toán: thẻ, chuyển khoản, PayPal, MoMo, không được để trống
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending', -- Trạng thái thanh toán: đang chờ, hoàn thành, thất bại, mặc định là pending
    transaction_id VARCHAR(255),                        -- Mã giao dịch từ cổng thanh toán, có thể để trống
    payment_details TEXT,                               -- Chi tiết thanh toán (ví dụ: JSON từ cổng thanh toán), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo thanh toán, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng purchases, nếu giao dịch bị xóa thì thanh toán cũng bị xóa
);

-- 14. Bảng user_progress: Quản lý tiến độ học của người dùng
-- Tạo sau bảng users, courses và lessons vì có khóa ngoại tham chiếu đến chúng
CREATE TABLE user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho tiến độ, tự động tăng
    user_id INT NOT NULL,                               -- ID của người dùng, không được để trống
    course_id INT NOT NULL,                             -- ID của khóa học, không được để trống
    lesson_id INT NOT NULL,                             -- ID của bài học, không được để trống
    is_completed BOOLEAN DEFAULT FALSE,                 -- Trạng thái hoàn thành bài học (TRUE: đã hoàn thành, FALSE: chưa hoàn thành), mặc định là FALSE
    completed_at TIMESTAMP,                             -- Thời gian hoàn thành bài học, NULL nếu chưa hoàn thành
    last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Thời gian xem bài học cuối cùng, tự động ghi nhận thời điểm hiện tại
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,     -- Phần trăm tiến độ hoàn thành bài học (0-100%), mặc định là 0
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì tiến độ cũng bị xóa
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì tiến độ cũng bị xóa
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng lessons, nếu bài học bị xóa thì tiến độ cũng bị xóa
    UNIQUE (user_id, course_id, lesson_id)              -- Ràng buộc duy nhất: mỗi user chỉ có một tiến độ cho mỗi bài học trong mỗi khóa học
);

-- 15. Bảng comments: Quản lý bình luận của người dùng
-- Tạo sau bảng users vì có khóa ngoại user_id tham chiếu đến users, và tham chiếu chính nó qua parent_id
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho bình luận, tự động tăng
    user_id INT NOT NULL,                               -- ID của người dùng đăng bình luận, không được để trống
    item_id INT NOT NULL,                               -- ID của khóa học hoặc bài viết được bình luận, không được để trống
    item_type ENUM('course', 'post') NOT NULL,          -- Loại mục: course (khóa học) hoặc post (bài viết), không được để trống
    content TEXT NOT NULL,                              -- Nội dung bình luận, không được để trống
    parent_id INT,                                      -- ID của bình luận cha (nếu là trả lời bình luận), có thể để trống
    is_approved BOOLEAN DEFAULT FALSE,                  -- Trạng thái duyệt bình luận (TRUE: đã duyệt, FALSE: chưa duyệt), mặc định là FALSE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo bình luận, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì bình luận cũng bị xóa
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến chính bảng comments, nếu bình luận cha bị xóa thì đặt thành NULL
);

-- 16. Bảng reviews: Quản lý đánh giá khóa học
-- Tạo sau bảng users và courses vì có khóa ngoại tham chiếu đến chúng
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho đánh giá, tự động tăng
    user_id INT NOT NULL,                               -- ID của người đánh giá, không được để trống
    course_id INT NOT NULL,                             -- ID của khóa học được đánh giá, không được để trống
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Điểm đánh giá (1-5 sao), không được để trống
    comment TEXT,                                       -- Nhận xét (tùy chọn), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo đánh giá, tự động ghi nhận thời điểm hiện tại
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Thời gian cập nhật cuối cùng, tự động cập nhật khi thay đổi
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì đánh giá cũng bị xóa
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì đánh giá cũng bị xóa
    UNIQUE (user_id, course_id)                         -- Ràng buộc duy nhất: mỗi user chỉ đánh giá một khóa học một lần
);

-- 17. Bảng notifications: Quản lý thông báo cho người dùng
-- Tạo sau bảng users vì có khóa ngoại user_id tham chiếu đến users
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho thông báo, tự động tăng
    user_id INT NOT NULL,                               -- ID của người nhận thông báo, không được để trống
    title VARCHAR(255) NOT NULL,                        -- Tiêu đề thông báo, không được để trống
    message TEXT NOT NULL,                              -- Nội dung thông báo, không được để trống
    type ENUM('system', 'course', 'payment') NOT NULL,  -- Loại thông báo: hệ thống, khóa học, thanh toán, không được để trống
    link VARCHAR(255),                                  -- Liên kết đến trang chi tiết (ví dụ: khóa học, giao dịch), có thể để trống
    is_read BOOLEAN DEFAULT FALSE,                      -- Trạng thái đã đọc (TRUE: đã đọc, FALSE: chưa đọc), mặc định là FALSE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo thông báo, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì thông báo cũng bị xóa
);

-- 18. Bảng password_resets: Quản lý yêu cầu đặt lại mật khẩu
-- Tạo sau bảng users vì có khóa ngoại user_id tham chiếu đến users
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho yêu cầu đặt lại mật khẩu, tự động tăng
    user_id INT NOT NULL,                               -- ID của người dùng yêu cầu đặt lại mật khẩu, không được để trống
    token VARCHAR(255) NOT NULL,                        -- Token dùng để xác thực yêu cầu (gửi qua email), không được để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo yêu cầu, tự động ghi nhận thời điểm hiện tại
    expires_at TIMESTAMP NOT NULL,                      -- Thời gian hết hạn của token (ví dụ: 1 giờ sau khi tạo), không được để trống
    is_used BOOLEAN DEFAULT FALSE,                      -- Trạng thái token: đã sử dụng hay chưa, mặc định là FALSE
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì yêu cầu cũng bị xóa
);

-- 19. Bảng menus: Quản lý các menu trên website
-- Tạo trước vì không phụ thuộc bảng khác, nhưng được tham chiếu bởi menu_items
CREATE TABLE menus (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho menu, tự động tăng
    name VARCHAR(100) NOT NULL,                         -- Tên menu (ví dụ: main_menu, footer_menu), không được để trống
    position VARCHAR(50),                               -- Vị trí hiển thị menu (ví dụ: header, footer), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- Thời gian tạo menu, tự động ghi nhận thời điểm hiện tại
);

-- 20. Bảng menu_items: Quản lý các mục trong menu
-- Tạo sau bảng menus vì có khóa ngoại menu_id tham chiếu đến menus
CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho mục menu, tự động tăng
    menu_id INT NOT NULL,                               -- ID của menu chứa mục này, không được để trống
    label VARCHAR(100) NOT NULL,                        -- Nhãn hiển thị của mục menu (ví dụ: Trang chủ), không được để trống
    url VARCHAR(255) NOT NULL,                          -- Đường dẫn của mục menu (ví dụ: /home), không được để trống
    parent_id INT,                                      -- ID của mục cha (nếu là menu con), có thể là NULL
    order_number INT,                                   -- Thứ tự hiển thị của mục menu, có thể để trống
    is_active BOOLEAN DEFAULT TRUE,                     -- Trạng thái hiển thị mục menu (TRUE: hiển thị, FALSE: ẩn), mặc định là TRUE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo mục menu, tự động ghi nhận thời điểm hiện tại
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng menus, nếu menu bị xóa thì mục cũng bị xóa
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL -- Khóa ngoại tham chiếu đến chính bảng menu_items, nếu mục cha bị xóa thì đặt thành NULL
);

-- 21. Bảng partners: Quản lý thông tin đối tác
-- Tạo trước vì không phụ thuộc bảng khác
CREATE TABLE partners (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho đối tác, tự động tăng
    name VARCHAR(100) NOT NULL,                         -- Tên đối tác, không được để trống
    logo_url VARCHAR(255),                              -- Đường dẫn đến logo của đối tác, có thể để trống
    website_url VARCHAR(255),                           -- Đường dẫn đến website của đối tác, có thể để trống
    description TEXT,                                   -- Mô tả về đối tác, có thể để trống
    is_active BOOLEAN DEFAULT TRUE,                     -- Trạng thái hiển thị đối tác (TRUE: hiển thị, FALSE: ẩn), mặc định là TRUE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- Thời gian thêm đối tác, tự động ghi nhận thời điểm hiện tại
);

-- 22. Bảng widgets: Quản lý các khối nội dung (widget) trên website
-- Tạo trước vì không phụ thuộc bảng khác
CREATE TABLE widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho widget, tự động tăng
    name VARCHAR(100) NOT NULL,                         -- Tên widget (ví dụ: Quảng cáo sidebar), không được để trống
    content TEXT,                                       -- Nội dung của widget (có thể là HTML), có thể để trống
    position VARCHAR(50),                               -- Vị trí hiển thị widget (ví dụ: sidebar, footer), có thể để trống
    is_active BOOLEAN DEFAULT TRUE,                     -- Trạng thái hiển thị widget (TRUE: hiển thị, FALSE: ẩn), mặc định là TRUE
    order_number INT,                                   -- Thứ tự hiển thị widget, có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- Thời gian tạo widget, tự động ghi nhận thời điểm hiện tại
);

-- 23. Bảng sessions: Quản lý phiên đăng nhập của người dùng
-- Tạo sau bảng users vì có khóa ngoại user_id tham chiếu đến users
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho phiên đăng nhập, tự động tăng
    user_id INT NOT NULL,                               -- ID của người dùng, không được để trống
    token VARCHAR(255) NOT NULL,                        -- Token xác thực phiên đăng nhập (ví dụ: JWT), không được để trống
    ip_address VARCHAR(45),                             -- Địa chỉ IP của người dùng khi đăng nhập, có thể để trống (hỗ trợ IPv6)
    device_info VARCHAR(255),                           -- Thông tin thiết bị (ví dụ: trình duyệt, hệ điều hành), có thể để trống
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo phiên, tự động ghi nhận thời điểm hiện tại
    expires_at TIMESTAMP,                               -- Thời gian hết hạn của phiên, có thể để trống
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì phiên cũng bị xóa
);

-- 24. Bảng settings: Quản lý các cài đặt chung của website
-- Tạo trước vì không phụ thuộc bảng khác
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho cài đặt, tự động tăng
    setting_key VARCHAR(100) NOT NULL UNIQUE,           -- Tên cài đặt (ví dụ: site_name, logo_url, email_support), không được trùng, không được để trống
    setting_value TEXT,                                 -- Giá trị cài đặt (có thể là chuỗi dài), có thể để trống
    description TEXT,                                   -- Mô tả cài đặt, có thể để trống
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Thời gian cập nhật cài đặt, tự động cập nhật khi thay đổi
);

-- 25. Bảng coupon_courses: Liên kết mã giảm giá với các khóa học cụ thể
-- Tạo sau bảng coupons và courses vì có khóa ngoại tham chiếu đến chúng
CREATE TABLE coupon_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho liên kết, tự động tăng
    coupon_id INT NOT NULL,                             -- ID của mã giảm giá, không được để trống
    course_id INT NOT NULL,                             -- ID của khóa học mà mã giảm giá áp dụng, không được để trống
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng coupons, nếu mã giảm giá bị xóa thì liên kết cũng bị xóa
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì liên kết cũng bị xóa
    UNIQUE (coupon_id, course_id)                       -- Ràng buộc duy nhất: mỗi mã giảm giá chỉ liên kết với một khóa học một lần
);

-- 26. Bảng certificates: Quản lý chứng chỉ của học viên
CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- Mã định danh duy nhất cho chứng chỉ, tự động tăng
    user_id INT NOT NULL,                               -- ID của học viên nhận chứng chỉ, không được để trống
    course_id INT NOT NULL,                             -- ID của khóa học hoàn thành, không được để trống
    certificate_number VARCHAR(100) UNIQUE,             -- Số chứng chỉ duy nhất, không được trùng
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Ngày cấp chứng chỉ, tự động ghi nhận thời điểm hiện tại
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Thời gian tạo chứng chỉ, tự động ghi nhận thời điểm hiện tại
    deleted_at TIMESTAMP,                               -- Thời gian xóa chứng chỉ (soft delete), có thể để trống
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại tham chiếu đến bảng users, nếu user bị xóa thì chứng chỉ cũng bị xóa
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE -- Khóa ngoại tham chiếu đến bảng courses, nếu khóa học bị xóa thì chứng chỉ cũng bị xóa
);

-- Thêm các chỉ mục (index) để tối ưu hóa tìm kiếm
CREATE INDEX idx_users_email ON users(email);           -- Chỉ mục cho email người dùng để tăng tốc tìm kiếm
CREATE INDEX idx_courses_title ON courses(title);       -- Chỉ mục cho tiêu đề khóa học để tăng tốc tìm kiếm
CREATE INDEX idx_posts_title ON posts(title);           -- Chỉ mục cho tiêu đề bài viết để tăng tốc tìm kiếm
CREATE INDEX idx_purchases_user_id ON purchases(user_id); -- Chỉ mục cho ID người dùng trong giao dịch để tăng tốc tìm kiếm
CREATE INDEX idx_notifications_user_id ON notifications(user_id); -- Chỉ mục cho ID người dùng trong thông báo để tăng tốc tìm kiếm