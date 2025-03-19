const Role = require('../models/Role');
const { body, validationResult } = require('express-validator');

// Validation rules
const roleValidation = [
  body('name')
    .notEmpty()
    .withMessage('Tên vai trò là bắt buộc')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tên vai trò không được vượt quá 50 ký tự'),
  
  body('description')
    .optional()
    .trim(),
  
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Danh sách quyền phải là một mảng')
];

// Get all roles with their permissions
const getAll = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json({
      message: 'Lấy danh sách vai trò thành công',
      data: roles
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách vai trò' });
  }
};

// Get role by ID
const getById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    }
    res.json({
      message: 'Lấy thông tin vai trò thành công',
      data: role
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin vai trò' });
  }
};

// Create new role
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    // Check if role name already exists
    const existingRole = await Role.findByName(req.body.name);
    if (existingRole) {
      return res.status(400).json({ message: 'Tên vai trò đã tồn tại' });
    }

    // Create role
    const roleId = await Role.create({
      name: req.body.name,
      description: req.body.description
    });

    // Add permissions if provided
    if (req.body.permissions) {
      await Role.addPermissions(roleId, req.body.permissions);
    }

    const role = await Role.findById(roleId);
    res.status(201).json({
      message: 'Tạo vai trò thành công',
      data: role
    });
  } catch (error) {
    console.error('Lỗi tạo vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi tạo vai trò' });
  }
};

// Update role
const update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    }

    // Check if new name already exists (excluding current role)
    if (req.body.name !== role.name) {
      const existingRole = await Role.findByName(req.body.name);
      if (existingRole) {
        return res.status(400).json({ message: 'Tên vai trò đã tồn tại' });
      }
    }

    // Update role
    await Role.update(req.params.id, {
      name: req.body.name,
      description: req.body.description
    });

    // Update permissions if provided
    if (req.body.permissions) {
      await Role.addPermissions(req.params.id, req.body.permissions);
    }

    const updatedRole = await Role.findById(req.params.id);
    res.json({
      message: 'Cập nhật vai trò thành công',
      data: updatedRole
    });
  } catch (error) {
    console.error('Lỗi cập nhật vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật vai trò' });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    }

    // Check if role has users
    const usersCount = await Role.getUsersCount(req.params.id);
    if (usersCount > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa vai trò đang được gán cho người dùng. Vui lòng gán người dùng sang vai trò khác trước.' 
      });
    }

    await Role.delete(req.params.id);
    res.json({ message: 'Xóa vai trò thành công' });
  } catch (error) {
    console.error('Lỗi xóa vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi xóa vai trò' });
  }
};

// Get role permissions
const getPermissions = async (req, res) => {
  try {
    const permissions = await Role.getPermissions(req.params.id);
    res.json({
      message: 'Lấy danh sách quyền thành công',
      data: permissions
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách quyền:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách quyền' });
  }
};

// Update role permissions
const updatePermissions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    }

    await Role.addPermissions(req.params.id, req.body.permissions);
    
    const updatedRole = await Role.findById(req.params.id);
    res.json({
      message: 'Cập nhật quyền vai trò thành công',
      data: updatedRole
    });
  } catch (error) {
    console.error('Lỗi cập nhật quyền vai trò:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật quyền vai trò' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteRole,
  getPermissions,
  updatePermissions,
  roleValidation
}; 