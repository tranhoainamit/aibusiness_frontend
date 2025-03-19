const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const progressRoutes = require('./routes/progressRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const imageRoutes = require('./routes/imageRoutes');
const postRoutes = require('./routes/postRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const commentRoutes = require('./routes/commentRoutes');
const roleRoutes = require('./routes/roleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const menuRoutes = require('./routes/menuRoutes');
const settingRoutes = require('./routes/settingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const statsRoutes = require('./routes/statsRoutes');
const authRoutes = require('./routes/authRoutes');
const partnerRoutes = require('./routes/partnerRoutes');

const app = express();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging middleware

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API đang hoạt động', 
    status: 'ok',
    time: new Date().toISOString() 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/partners', partnerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Không tìm thấy đường dẫn' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err.stack);
  
  // Return different response based on error type
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Dữ liệu không hợp lệ', 
      errors: err.errors 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Không có quyền truy cập' });
  }
  
  // Default server error
  res.status(500).json({ 
    message: 'Đã xảy ra lỗi hệ thống',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});

module.exports = app;
