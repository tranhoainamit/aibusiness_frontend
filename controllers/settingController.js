const { body, validationResult } = require('express-validator');
const Setting = require('../models/Setting');

// Quy tắc validation
const settingValidation = [
  body('key')
    .trim()
    .notEmpty()
    .withMessage('Key không được để trống')
    .matches(/^[a-zA-Z0-9_\.]+$/)
    .withMessage('Key chỉ được chứa chữ cái, số, dấu gạch dưới và dấu chấm')
    .isLength({ max: 100 })
    .withMessage('Key không được vượt quá 100 ký tự'),
  
  body('value')
    .notEmpty()
    .withMessage('Giá trị không được để trống'),
  
  body('type')
    .optional()
    .isIn(['string', 'number', 'boolean', 'json', 'array'])
    .withMessage('Loại cài đặt không hợp lệ'),
  
  body('group')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Nhóm không được vượt quá 50 ký tự'),
  
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái public phải là giá trị boolean'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Mô tả không được vượt quá 255 ký tự')
];

// Validation cho cập nhật hàng loạt
const bulkUpdateValidation = [
  body('settings')
    .isArray()
    .withMessage('Dữ liệu phải là một mảng các cài đặt')
    .notEmpty()
    .withMessage('Mảng cài đặt không được rỗng'),
  body('settings.*.key')
    .trim()
    .notEmpty()
    .withMessage('Key không được để trống'),
  body('settings.*.value')
    .notEmpty()
    .withMessage('Giá trị không được để trống')
];

class SettingController {
  // Tạo cài đặt mới
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Kiểm tra key đã tồn tại
      const exists = await Setting.exists(req.body.key);
      if (exists) {
        return res.status(400).json({ message: 'Key đã tồn tại' });
      }

      const settingId = await Setting.create(req.body);
      const setting = await Setting.findByKey(req.body.key);

      res.status(201).json({
        message: 'Tạo cài đặt thành công',
        setting
      });
    } catch (error) {
      console.error('Lỗi tạo cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi tạo cài đặt' });
    }
  }

  // Lấy tất cả cài đặt với bộ lọc
  static async getAll(req, res) {
    try {
      const filters = {
        is_public: req.query.is_public === 'true' ? true : 
                   req.query.is_public === 'false' ? false : undefined,
        group: req.query.group,
        type: req.query.type,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Setting.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Lỗi lấy danh sách cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách cài đặt' });
    }
  }

  // Lấy cài đặt công khai
  static async getPublic(req, res) {
    try {
      const settings = await Setting.getPublicSettings();
      res.json(settings);
    } catch (error) {
      console.error('Lỗi lấy cài đặt công khai:', error);
      res.status(500).json({ message: 'Lỗi khi lấy cài đặt công khai' });
    }
  }

  // Lấy cài đặt theo nhóm
  static async getByGroup(req, res) {
    try {
      const settings = await Setting.getByGroup(req.params.group);
      res.json(settings);
    } catch (error) {
      console.error('Lỗi lấy cài đặt theo nhóm:', error);
      res.status(500).json({ message: 'Lỗi khi lấy cài đặt theo nhóm' });
    }
  }

  // Lấy cài đặt theo key
  static async getByKey(req, res) {
    try {
      const setting = await Setting.findByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Lỗi lấy cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin cài đặt' });
    }
  }

  // Cập nhật cài đặt
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const setting = await Setting.findByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
      }

      const updated = await Setting.update(req.params.key, req.body);
      if (updated) {
        const updatedSetting = await Setting.findByKey(req.params.key);
        res.json({
          message: 'Cập nhật cài đặt thành công',
          setting: updatedSetting
        });
      } else {
        res.status(400).json({ message: 'Cập nhật cài đặt thất bại' });
      }
    } catch (error) {
      console.error('Lỗi cập nhật cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật cài đặt' });
    }
  }

  // Cập nhật nhiều cài đặt cùng lúc
  static async bulkUpdate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updated = await Setting.bulkUpdate(req.body.settings);
      if (updated) {
        res.json({ message: 'Cập nhật hàng loạt cài đặt thành công' });
      } else {
        res.status(400).json({ message: 'Cập nhật hàng loạt cài đặt thất bại' });
      }
    } catch (error) {
      console.error('Lỗi cập nhật hàng loạt cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật hàng loạt cài đặt' });
    }
  }

  // Xóa cài đặt
  static async delete(req, res) {
    try {
      const setting = await Setting.findByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
      }

      const deleted = await Setting.delete(req.params.key);
      if (deleted) {
        res.json({ message: 'Xóa cài đặt thành công' });
      } else {
        res.status(400).json({ message: 'Xóa cài đặt thất bại' });
      }
    } catch (error) {
      console.error('Lỗi xóa cài đặt:', error);
      res.status(500).json({ message: 'Lỗi khi xóa cài đặt' });
    }
  }
}

module.exports = {
  SettingController,
  settingValidation,
  bulkUpdateValidation
}; 