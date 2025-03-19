const { body, validationResult } = require('express-validator');
const Widget = require('../models/Widget');

// Validation rules
const widgetValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên widget là bắt buộc')
    .isLength({ max: 100 })
    .withMessage('Tên widget không được vượt quá 100 ký tự'),
  
  body('content')
    .optional()
    .trim(),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Vị trí không được vượt quá 50 ký tự'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái kích hoạt phải là giá trị boolean'),
  
  body('order_number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số thứ tự phải là số nguyên không âm')
];

// Create new widget
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const widgetId = await Widget.create(req.body);
    const widget = await Widget.findById(widgetId);

    res.status(201).json({
      message: 'Tạo widget thành công',
      data: widget
    });
  } catch (error) {
    console.error('Lỗi tạo widget:', error);
    res.status(500).json({ message: 'Lỗi khi tạo widget' });
  }
};

// Get all widgets with filters
const getAll = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active === 'true' ? true : 
                 req.query.is_active === 'false' ? false : undefined,
      position: req.query.position,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Widget.findAll(filters);
    res.json({
      message: 'Lấy danh sách widget thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách widget:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách widget' });
  }
};

// Get widget by ID
const getById = async (req, res) => {
  try {
    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      return res.status(404).json({ message: 'Không tìm thấy widget' });
    }
    res.json({
      message: 'Lấy thông tin widget thành công',
      data: widget
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin widget:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin widget' });
  }
};

// Update widget
const update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      return res.status(404).json({ message: 'Không tìm thấy widget' });
    }

    const updated = await Widget.update(req.params.id, req.body);
    if (updated) {
      const updatedWidget = await Widget.findById(req.params.id);
      res.json({
        message: 'Cập nhật widget thành công',
        data: updatedWidget
      });
    } else {
      res.status(400).json({ message: 'Cập nhật widget thất bại' });
    }
  } catch (error) {
    console.error('Lỗi cập nhật widget:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật widget' });
  }
};

// Delete widget
const deleteWidget = async (req, res) => {
  try {
    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      return res.status(404).json({ message: 'Không tìm thấy widget' });
    }

    const deleted = await Widget.delete(req.params.id);
    if (deleted) {
      res.json({ message: 'Xóa widget thành công' });
    } else {
      res.status(400).json({ message: 'Xóa widget thất bại' });
    }
  } catch (error) {
    console.error('Lỗi xóa widget:', error);
    res.status(500).json({ message: 'Lỗi khi xóa widget' });
  }
};

// Toggle widget active status
const toggleActive = async (req, res) => {
  try {
    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      return res.status(404).json({ message: 'Không tìm thấy widget' });
    }

    const toggled = await Widget.toggleActive(req.params.id);
    if (toggled) {
      const updatedWidget = await Widget.findById(req.params.id);
      res.json({
        message: 'Thay đổi trạng thái widget thành công',
        data: updatedWidget
      });
    } else {
      res.status(400).json({ message: 'Thay đổi trạng thái widget thất bại' });
    }
  } catch (error) {
    console.error('Lỗi thay đổi trạng thái widget:', error);
    res.status(500).json({ message: 'Lỗi khi thay đổi trạng thái widget' });
  }
};

// Get widgets by position
const getByPosition = async (req, res) => {
  try {
    const widgets = await Widget.getByPosition(req.params.position);
    res.json({
      message: 'Lấy danh sách widget theo vị trí thành công',
      data: widgets
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách widget theo vị trí:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách widget theo vị trí' });
  }
};

// Update widget order
const updateOrder = async (req, res) => {
  try {
    const { order_number } = req.body;
    
    if (typeof order_number !== 'number' || order_number < 0) {
      return res.status(400).json({ message: 'Số thứ tự không hợp lệ' });
    }

    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      return res.status(404).json({ message: 'Không tìm thấy widget' });
    }

    const updated = await Widget.updateOrder(req.params.id, order_number);
    if (updated) {
      const updatedWidget = await Widget.findById(req.params.id);
      res.json({
        message: 'Cập nhật thứ tự widget thành công',
        data: updatedWidget
      });
    } else {
      res.status(400).json({ message: 'Cập nhật thứ tự widget thất bại' });
    }
  } catch (error) {
    console.error('Lỗi cập nhật thứ tự widget:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật thứ tự widget' });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  delete: deleteWidget,
  toggleActive,
  getByPosition,
  updateOrder,
  widgetValidation
}; 