const { body, validationResult } = require('express-validator');
const Partner = require('../models/Partner');

// Validation rules
const partnerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên đối tác không được để trống')
    .isLength({ max: 100 })
    .withMessage('Tên đối tác không được vượt quá 100 ký tự'),
  
  body('logo_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL logo phải là URL hợp lệ'),
  
  body('website_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL website phải là URL hợp lệ'),
  
  body('description')
    .optional()
    .trim(),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái kích hoạt phải là giá trị boolean')
];

// Create new partner
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const partnerId = await Partner.create(req.body);
    const partner = await Partner.findById(partnerId);

    res.status(201).json({
      message: 'Tạo đối tác thành công',
      data: partner
    });
  } catch (error) {
    console.error('Lỗi tạo đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi tạo đối tác' });
  }
};

// Get all partners with filters
const getAll = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active === 'true' ? true : 
                 req.query.is_active === 'false' ? false : undefined,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortDesc: req.query.sortDesc === 'true'
    };

    const result = await Partner.findAll(filters);
    res.json({
      message: 'Lấy danh sách đối tác thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đối tác: ' + error.message });
  }
};

// Get partner by ID
const getById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy đối tác' });
    }
    res.json({
      message: 'Lấy thông tin đối tác thành công',
      data: partner
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin đối tác' });
  }
};

// Find partner by name
const getByName = async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) {
      return res.status(400).json({ message: 'Tên đối tác là bắt buộc' });
    }
    
    const partner = await Partner.findByName(name);
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy đối tác' });
    }
    
    res.json({
      message: 'Lấy thông tin đối tác theo tên thành công',
      data: partner
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin đối tác theo tên:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin đối tác theo tên: ' + error.message });
  }
};

// Update partner
const update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy đối tác' });
    }

    const updated = await Partner.update(req.params.id, req.body);
    if (updated) {
      const updatedPartner = await Partner.findById(req.params.id);
      res.json({
        message: 'Cập nhật đối tác thành công',
        data: updatedPartner
      });
    } else {
      res.status(400).json({ message: 'Cập nhật đối tác thất bại' });
    }
  } catch (error) {
    console.error('Lỗi cập nhật đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật đối tác' });
  }
};

// Delete partner
const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy đối tác' });
    }

    const deleted = await Partner.delete(req.params.id);
    if (deleted) {
      res.json({ message: 'Xóa đối tác thành công' });
    } else {
      res.status(400).json({ message: 'Xóa đối tác thất bại' });
    }
  } catch (error) {
    console.error('Lỗi xóa đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi xóa đối tác' });
  }
};

// Toggle partner active status
const toggleActive = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Không tìm thấy đối tác' });
    }

    const toggled = await Partner.toggleActive(req.params.id);
    if (toggled) {
      const updatedPartner = await Partner.findById(req.params.id);
      res.json({
        message: 'Thay đổi trạng thái đối tác thành công',
        data: updatedPartner
      });
    } else {
      res.status(400).json({ message: 'Thay đổi trạng thái đối tác thất bại' });
    }
  } catch (error) {
    console.error('Lỗi thay đổi trạng thái đối tác:', error);
    res.status(500).json({ message: 'Lỗi khi thay đổi trạng thái đối tác' });
  }
};

// Get active partners
const getActive = async (req, res) => {
  try {
    // Check if limit is provided
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    
    const partners = await Partner.getActive(limit);
    res.json({
      message: 'Lấy danh sách đối tác đang hoạt động thành công',
      data: partners
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đối tác đang hoạt động:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đối tác đang hoạt động: ' + error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  getByName,
  update,
  delete: deletePartner,
  toggleActive,
  getActive,
  partnerValidation
}; 