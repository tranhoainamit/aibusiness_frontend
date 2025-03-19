const Banner = require('../models/Banner');
const Image = require('../models/Image');
const { body, validationResult } = require('express-validator');

// Validation rules
const bannerValidation = [
  body('image_id')
    .notEmpty()
    .withMessage('ID hình ảnh là bắt buộc')
    .isInt()
    .withMessage('ID hình ảnh phải là số nguyên'),
  
  body('title')
    .optional()
    .trim(),
  
  body('position')
    .notEmpty()
    .withMessage('Vị trí banner là bắt buộc'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Ngày bắt đầu không hợp lệ')
    .toDate(),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Ngày kết thúc không hợp lệ')
    .toDate(),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái kích hoạt phải là boolean')
];

// Validation rules for update
const updateValidation = [
  body('image_id')
    .optional()
    .isInt()
    .withMessage('ID hình ảnh phải là số nguyên'),
  
  body('title')
    .optional()
    .trim(),
  
  body('position')
    .optional(),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái kích hoạt phải là boolean'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Ngày bắt đầu không hợp lệ')
    .toDate(),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Ngày kết thúc không hợp lệ')
    .toDate()
];

// Create new banner
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    // Check if image exists
    const imageExists = await Image.exists(req.body.image_id);
    if (!imageExists) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }

    // Validate date range
    if (req.body.start_date && req.body.end_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      if (startDate > endDate) {
        return res.status(400).json({ message: 'Ngày bắt đầu phải trước ngày kết thúc' });
      }
    }

    const bannerId = await Banner.create(req.body);
    const banner = await Banner.findById(bannerId);

    res.status(201).json({
      message: 'Tạo banner thành công',
      data: banner
    });
  } catch (error) {
    console.error('Lỗi tạo banner:', error);
    res.status(500).json({ message: 'Lỗi khi tạo banner' });
  }
};

// Get all banners with filters
const getAll = async (req, res) => {
  try {
    const filters = {
      position: req.query.position,
      is_active: req.query.is_active === 'true' ? true : (req.query.is_active === 'false' ? false : undefined),
      current_date: req.query.current_only === 'true' ? new Date() : undefined,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Banner.findAll(filters);
    res.json({
      message: 'Lấy danh sách banner thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách banner:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách banner' });
  }
};

// Get banner by ID
const getById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Không tìm thấy banner' });
    }
    res.json({
      message: 'Lấy thông tin banner thành công',
      data: banner
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin banner:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin banner' });
  }
};

// Get banners by position
const getByPosition = async (req, res) => {
  try {
    const position = req.params.position;
    
    // Check if current_date is provided in query
    let date = undefined;
    if (req.query.date) {
      date = new Date(req.query.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Định dạng ngày không hợp lệ' });
      }
    } else {
      date = new Date(); // Use current date if not provided
    }
    
    const banners = await Banner.getActiveByPosition(position, date);
    res.json({
      message: 'Lấy danh sách banner theo vị trí thành công',
      data: banners
    });
  } catch (error) {
    console.error('Lỗi lấy banner theo vị trí:', error);
    res.status(500).json({ message: 'Lỗi khi lấy banner theo vị trí: ' + error.message });
  }
};

// Update banner
const update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Không tìm thấy banner' });
    }

    // Check if image exists if image_id is being updated
    if (req.body.image_id) {
      const imageExists = await Image.exists(req.body.image_id);
      if (!imageExists) {
        return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
      }
    }

    // Validate date range if both dates are provided
    if (req.body.start_date && req.body.end_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      if (startDate > endDate) {
        return res.status(400).json({ message: 'Ngày bắt đầu phải trước ngày kết thúc' });
      }
    }

    await Banner.update(req.params.id, req.body);
    const updatedBanner = await Banner.findById(req.params.id);

    res.json({
      message: 'Cập nhật banner thành công',
      data: updatedBanner
    });
  } catch (error) {
    console.error('Lỗi cập nhật banner:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật banner' });
  }
};

// Delete banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Không tìm thấy banner' });
    }

    await Banner.delete(req.params.id);
    res.json({ message: 'Xóa banner thành công' });
  } catch (error) {
    console.error('Lỗi xóa banner:', error);
    res.status(500).json({ message: 'Lỗi khi xóa banner' });
  }
};

// Toggle banner active status
const updateStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Không tìm thấy banner' });
    }

    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ message: 'Trạng thái hoạt động (is_active) là bắt buộc' });
    }

    const updated = await Banner.updateStatus(req.params.id, is_active);
    
    if (updated) {
      const updatedBanner = await Banner.findById(req.params.id);
      res.json({
        message: 'Cập nhật trạng thái banner thành công',
        data: updatedBanner
      });
    } else {
      res.status(400).json({ message: 'Cập nhật trạng thái banner thất bại' });
    }
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái banner:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái banner: ' + error.message });
  }
};

// Count banners by position
const countByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    const onlyActive = req.query.active === 'true';
    
    if (!position) {
      return res.status(400).json({ message: 'Vị trí banner là bắt buộc' });
    }
    
    const count = await Banner.countByPosition(position, onlyActive);
    
    res.json({
      message: 'Đếm banner theo vị trí thành công',
      data: {
        position,
        onlyActive,
        count
      }
    });
  } catch (error) {
    console.error('Lỗi đếm banner theo vị trí:', error);
    res.status(500).json({ message: 'Lỗi khi đếm banner theo vị trí: ' + error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  getByPosition,
  update,
  delete: deleteBanner,
  updateStatus,
  countByPosition,
  bannerValidation,
  updateValidation
}; 