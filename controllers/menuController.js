const { body, validationResult } = require('express-validator');
const Menu = require('../models/Menu');

// Quy tắc validation
const menuValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên menu không được để trống')
    .isLength({ max: 100 })
    .withMessage('Tên menu không được vượt quá 100 ký tự'),
  
  body('url')
    .trim()
    .notEmpty()
    .withMessage('URL không được để trống')
    .isLength({ max: 255 })
    .withMessage('URL không được vượt quá 255 ký tự'),
  
  body('parent_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('ID menu cha phải là số nguyên dương'),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Vị trí không được vượt quá 50 ký tự'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái active phải là giá trị boolean'),
  
  body('order_number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số thứ tự phải là số nguyên không âm')
];

class MenuController {
  // Tạo menu mới
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Kiểm tra menu cha nếu có
      if (req.body.parent_id) {
        const parentExists = await Menu.exists(req.body.parent_id);
        if (!parentExists) {
          return res.status(400).json({ message: 'Menu cha không tồn tại' });
        }
      }

      const menuId = await Menu.create(req.body);
      const menu = await Menu.findById(menuId);

      res.status(201).json({
        message: 'Tạo menu thành công',
        menu
      });
    } catch (error) {
      console.error('Lỗi tạo menu:', error);
      res.status(500).json({ message: 'Lỗi khi tạo menu' });
    }
  }

  // Lấy tất cả menu với bộ lọc
  static async getAll(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true : 
                   req.query.is_active === 'false' ? false : undefined,
        position: req.query.position,
        parent_id: req.query.parent_id === 'null' ? null :
                  req.query.parent_id ? parseInt(req.query.parent_id) : undefined,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Menu.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Lỗi lấy danh sách menu:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách menu' });
    }
  }

  // Lấy cấu trúc menu dạng cây
  static async getTree(req, res) {
    try {
      const menuTree = await Menu.getMenuTree();
      res.json(menuTree);
    } catch (error) {
      console.error('Lỗi lấy cấu trúc menu:', error);
      res.status(500).json({ message: 'Lỗi khi lấy cấu trúc menu' });
    }
  }

  // Lấy menu theo ID
  static async getById(req, res) {
    try {
      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: 'Không tìm thấy menu' });
      }
      res.json(menu);
    } catch (error) {
      console.error('Lỗi lấy menu:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin menu' });
    }
  }

  // Cập nhật menu
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: 'Không tìm thấy menu' });
      }

      // Kiểm tra menu cha nếu có
      if (req.body.parent_id) {
        const parentExists = await Menu.exists(req.body.parent_id);
        if (!parentExists) {
          return res.status(400).json({ message: 'Menu cha không tồn tại' });
        }
        // Không cho phép đặt menu cha là chính nó
        if (req.body.parent_id === parseInt(req.params.id)) {
          return res.status(400).json({ message: 'Menu không thể là cha của chính nó' });
        }
      }

      const updated = await Menu.update(req.params.id, req.body);
      if (updated) {
        const updatedMenu = await Menu.findById(req.params.id);
        res.json({
          message: 'Cập nhật menu thành công',
          menu: updatedMenu
        });
      } else {
        res.status(400).json({ message: 'Cập nhật menu thất bại' });
      }
    } catch (error) {
      console.error('Lỗi cập nhật menu:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật menu' });
    }
  }

  // Xóa menu
  static async delete(req, res) {
    try {
      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: 'Không tìm thấy menu' });
      }

      const deleted = await Menu.delete(req.params.id);
      if (deleted) {
        res.json({ message: 'Xóa menu thành công' });
      } else {
        res.status(400).json({ message: 'Xóa menu thất bại' });
      }
    } catch (error) {
      console.error('Lỗi xóa menu:', error);
      res.status(500).json({ message: 'Lỗi khi xóa menu' });
    }
  }

  // Bật/tắt trạng thái active của menu
  static async toggleActive(req, res) {
    try {
      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: 'Không tìm thấy menu' });
      }

      const toggled = await Menu.toggleActive(req.params.id);
      if (toggled) {
        const updatedMenu = await Menu.findById(req.params.id);
        res.json({
          message: 'Thay đổi trạng thái menu thành công',
          menu: updatedMenu
        });
      } else {
        res.status(400).json({ message: 'Thay đổi trạng thái menu thất bại' });
      }
    } catch (error) {
      console.error('Lỗi thay đổi trạng thái menu:', error);
      res.status(500).json({ message: 'Lỗi khi thay đổi trạng thái menu' });
    }
  }

  // Cập nhật thứ tự menu
  static async updateOrder(req, res) {
    try {
      const { order_number } = req.body;
      
      if (typeof order_number !== 'number' || order_number < 0) {
        return res.status(400).json({ message: 'Số thứ tự không hợp lệ' });
      }

      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: 'Không tìm thấy menu' });
      }

      const updated = await Menu.updateOrder(req.params.id, order_number);
      if (updated) {
        const updatedMenu = await Menu.findById(req.params.id);
        res.json({
          message: 'Cập nhật thứ tự menu thành công',
          menu: updatedMenu
        });
      } else {
        res.status(400).json({ message: 'Cập nhật thứ tự menu thất bại' });
      }
    } catch (error) {
      console.error('Lỗi cập nhật thứ tự menu:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật thứ tự menu' });
    }
  }
}

module.exports = {
  MenuController,
  menuValidation
}; 