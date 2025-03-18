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

class NotificationController {
  // Tạo thông báo mới
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notificationId = await Notification.create(req.body);
      const notification = await Notification.findById(notificationId);

      res.status(201).json({
        message: 'Tạo thông báo thành công',
        notification
      });
    } catch (error) {
      console.error('Lỗi tạo thông báo:', error);
      res.status(500).json({ message: 'Lỗi khi tạo thông báo' });
    }
  }

  // Tạo nhiều thông báo
  static async createMultiple(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const count = await Notification.createMultiple(req.body.notifications);
      res.status(201).json({
        message: 'Tạo thông báo hàng loạt thành công',
        count
      });
    } catch (error) {
      console.error('Lỗi tạo nhiều thông báo:', error);
      res.status(500).json({ message: 'Lỗi khi tạo nhiều thông báo' });
    }
  }

  // Lấy thông báo của người dùng
  static async getByUser(req, res) {
    try {
      const filters = {
        is_read: req.query.is_read === 'true' ? true : 
                 req.query.is_read === 'false' ? false : undefined,
        type: req.query.type,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Notification.findByUserId(req.user.id, filters);
      res.json(result);
    } catch (error) {
      console.error('Lỗi lấy thông báo:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
    }
  }

  // Đánh dấu thông báo đã đọc
  static async markAsRead(req, res) {
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
  }

  // Đánh dấu tất cả thông báo đã đọc
  static async markAllAsRead(req, res) {
    try {
      const count = await Notification.markAllAsRead(req.user.id);
      res.json({
        message: 'Đánh dấu tất cả thông báo đã đọc thành công',
        count
      });
    } catch (error) {
      console.error('Lỗi đánh dấu tất cả thông báo:', error);
      res.status(500).json({ message: 'Lỗi khi đánh dấu tất cả thông báo đã đọc' });
    }
  }

  // Xóa thông báo
  static async delete(req, res) {
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
  }

  // Xóa tất cả thông báo đã đọc
  static async deleteAllRead(req, res) {
    try {
      const count = await Notification.deleteAllRead(req.user.id);
      res.json({
        message: 'Xóa tất cả thông báo đã đọc thành công',
        count
      });
    } catch (error) {
      console.error('Lỗi xóa tất cả thông báo đã đọc:', error);
      res.status(500).json({ message: 'Lỗi khi xóa tất cả thông báo đã đọc' });
    }
  }

  // Đếm số thông báo chưa đọc
  static async getUnreadCount(req, res) {
    try {
      const count = await Notification.countUnread(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Lỗi đếm thông báo chưa đọc:', error);
      res.status(500).json({ message: 'Lỗi khi đếm thông báo chưa đọc' });
    }
  }
}

module.exports = {
  NotificationController,
  notificationValidation,
  multipleNotificationValidation
}; 