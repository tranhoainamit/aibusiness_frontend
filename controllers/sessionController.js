const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// Quy tắc validation
const sessionValidation = [
  body('device_info')
    .optional()
    .isString()
    .withMessage('Thông tin thiết bị phải là chuỗi')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Thông tin thiết bị không được vượt quá 255 ký tự'),
  
  body('ip_address')
    .optional()
    .isIP()
    .withMessage('Địa chỉ IP không hợp lệ'),
  
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Thời gian hết hạn không hợp lệ')
];

class SessionController {
  // Tạo phiên mới
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const sessionData = {
        user_id: req.user.id,
        token: uuidv4(),
        device_info: req.body.device_info,
        ip_address: req.ip,
        expires_at: req.body.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000) // Mặc định 24h
      };

      const sessionId = await Session.create(sessionData);
      const session = await Session.findById(sessionId);

      res.status(201).json({
        message: 'Tạo phiên thành công',
        session
      });
    } catch (error) {
      console.error('Lỗi tạo phiên:', error);
      res.status(500).json({ message: 'Lỗi khi tạo phiên' });
    }
  }

  // Lấy tất cả phiên của người dùng
  static async getByUser(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true : 
                   req.query.is_active === 'false' ? false : undefined,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Session.findByUserId(req.user.id, filters);
      res.json(result);
    } catch (error) {
      console.error('Lỗi lấy phiên:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách phiên' });
    }
  }

  // Lấy thông tin chi tiết phiên
  static async getDetails(req, res) {
    try {
      const session = await Session.getSessionDetails(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Không tìm thấy phiên' });
      }

      // Kiểm tra quyền truy cập
      if (session.user_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Không có quyền truy cập phiên này' });
      }

      res.json(session);
    } catch (error) {
      console.error('Lỗi lấy chi tiết phiên:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin chi tiết phiên' });
    }
  }

  // Vô hiệu hóa phiên
  static async deactivate(req, res) {
    try {
      const session = await Session.findById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Không tìm thấy phiên' });
      }

      // Kiểm tra quyền truy cập
      if (session.user_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Không có quyền vô hiệu hóa phiên này' });
      }

      const deactivated = await Session.deactivate(req.params.id, session.user_id);
      if (deactivated) {
        res.json({ message: 'Vô hiệu hóa phiên thành công' });
      } else {
        res.status(400).json({ message: 'Vô hiệu hóa phiên thất bại' });
      }
    } catch (error) {
      console.error('Lỗi vô hiệu hóa phiên:', error);
      res.status(500).json({ message: 'Lỗi khi vô hiệu hóa phiên' });
    }
  }

  // Vô hiệu hóa tất cả phiên trừ phiên hiện tại
  static async deactivateAll(req, res) {
    try {
      const currentSession = await Session.findByToken(req.token);
      if (!currentSession) {
        return res.status(401).json({ message: 'Phiên không hợp lệ' });
      }

      const count = await Session.deactivateAllExceptCurrent(
        req.user.id,
        currentSession.id
      );

      res.json({
        message: 'Vô hiệu hóa tất cả phiên khác thành công',
        count
      });
    } catch (error) {
      console.error('Lỗi vô hiệu hóa tất cả phiên:', error);
      res.status(500).json({ message: 'Lỗi khi vô hiệu hóa tất cả phiên' });
    }
  }

  // Xóa phiên hết hạn (chỉ dành cho admin)
  static async cleanupExpired(req, res) {
    try {
      const count = await Session.deleteExpired();
      res.json({
        message: 'Xóa phiên hết hạn thành công',
        count
      });
    } catch (error) {
      console.error('Lỗi xóa phiên hết hạn:', error);
      res.status(500).json({ message: 'Lỗi khi xóa phiên hết hạn' });
    }
  }

  // Cập nhật thời gian hoạt động cuối
  static async updateActivity(req, res) {
    try {
      const session = await Session.findByToken(req.token);
      if (!session) {
        return res.status(401).json({ message: 'Phiên không hợp lệ' });
      }

      await Session.updateLastActivity(session.id);
      res.json({ message: 'Cập nhật thời gian hoạt động thành công' });
    } catch (error) {
      console.error('Lỗi cập nhật thời gian hoạt động:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật thời gian hoạt động' });
    }
  }
}

module.exports = {
  SessionController,
  sessionValidation
}; 