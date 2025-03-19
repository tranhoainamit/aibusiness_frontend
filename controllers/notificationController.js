const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');

// Quy tắc validation
const notificationValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ max: 255 })
    .withMessage('Tiêu đề không được vượt quá 255 ký tự'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Nội dung không được để trống'),
  
  body('type')
    .optional()
    .isIn(['general', 'course', 'payment', 'system'])
    .withMessage('Loại thông báo không hợp lệ'),
  
  body('link')
    .optional()
    .isURL()
    .withMessage('Link không hợp lệ')
    .isLength({ max: 255 })
    .withMessage('Link không được vượt quá 255 ký tự'),
  
  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID người dùng không hợp lệ')
];

// Validation cho tạo nhiều thông báo
const multipleNotificationValidation = [
  body('notifications')
    .isArray()
    .withMessage('Dữ liệu phải là một mảng thông báo')
    .notEmpty()
    .withMessage('Mảng thông báo không được rỗng'),
  body('notifications.*.user_id')
    .isInt({ min: 1 })
    .withMessage('ID người dùng không hợp lệ'),
  body('notifications.*.title')
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề không được để trống'),
  body('notifications.*.content')
    .trim()
    .notEmpty()
    .withMessage('Nội dung không được để trống')
];

// Tạo thông báo mới
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const notificationId = await Notification.create(req.body);
    const notification = await Notification.findById(notificationId);

    res.status(201).json({
      message: 'Tạo thông báo thành công',
      data: notification
    });
  } catch (error) {
    console.error('Lỗi tạo thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi tạo thông báo' });
  }
};

// Tạo nhiều thông báo
const createMultiple = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const count = await Notification.createMultiple(req.body.notifications);
    res.status(201).json({
      message: 'Tạo thông báo hàng loạt thành công',
      data: { count }
    });
  } catch (error) {
    console.error('Lỗi tạo nhiều thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi tạo nhiều thông báo' });
  }
};

// Lấy thông báo của người dùng
const getByUser = async (req, res) => {
  try {
    const filters = {
      is_read: req.query.is_read === 'true' ? true : 
               req.query.is_read === 'false' ? false : undefined,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Notification.findByUserId(req.user.id, filters);
    res.json({
      message: 'Lấy danh sách thông báo thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
  }
};

// Đánh dấu thông báo đã đọc
const markAsRead = async (req, res) => {
  try {
    const exists = await Notification.exists(req.params.id, req.user.id);
    if (!exists) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    const marked = await Notification.markAsRead(req.params.id, req.user.id);
    if (marked) {
      res.json({ message: 'Đánh dấu thông báo đã đọc thành công' });
    } else {
      res.status(400).json({ message: 'Đánh dấu thông báo đã đọc thất bại' });
    }
  } catch (error) {
    console.error('Lỗi đánh dấu thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu thông báo đã đọc' });
  }
};

// Đánh dấu tất cả thông báo đã đọc
const markAllAsRead = async (req, res) => {
  try {
    const count = await Notification.markAllAsRead(req.user.id);
    res.json({
      message: 'Đánh dấu tất cả thông báo đã đọc thành công',
      data: { count }
    });
  } catch (error) {
    console.error('Lỗi đánh dấu tất cả thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu tất cả thông báo đã đọc' });
  }
};

// Xóa thông báo
const deleteNotification = async (req, res) => {
  try {
    const exists = await Notification.exists(req.params.id, req.user.id);
    if (!exists) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    const deleted = await Notification.delete(req.params.id, req.user.id);
    if (deleted) {
      res.json({ message: 'Xóa thông báo thành công' });
    } else {
      res.status(400).json({ message: 'Xóa thông báo thất bại' });
    }
  } catch (error) {
    console.error('Lỗi xóa thông báo:', error);
    res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
  }
};

// Xóa tất cả thông báo đã đọc
const deleteAllRead = async (req, res) => {
  try {
    const count = await Notification.deleteAllRead(req.user.id);
    res.json({
      message: 'Xóa tất cả thông báo đã đọc thành công',
      data: { count }
    });
  } catch (error) {
    console.error('Lỗi xóa tất cả thông báo đã đọc:', error);
    res.status(500).json({ message: 'Lỗi khi xóa tất cả thông báo đã đọc' });
  }
};

// Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countUnread(req.user.id);
    res.json({ 
      message: 'Lấy số lượng thông báo chưa đọc thành công',
      data: { count } 
    });
  } catch (error) {
    console.error('Lỗi đếm thông báo chưa đọc:', error);
    res.status(500).json({ message: 'Lỗi khi đếm thông báo chưa đọc' });
  }
};

module.exports = {
  create,
  createMultiple,
  getByUser,
  markAsRead,
  markAllAsRead,
  delete: deleteNotification,
  deleteAllRead,
  getUnreadCount,
  notificationValidation,
  multipleNotificationValidation
}; 