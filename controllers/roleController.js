const Role = require('../models/Role');
const { body, validationResult } = require('express-validator');

// Get all roles with their permissions
exports.getAll = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get role by ID
exports.getById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json({ role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new role
exports.create = async (req, res) => {
  try {
    // Validate input
    await body('name').notEmpty().trim().withMessage('Name is required')
      .isLength({ max: 50 }).withMessage('Name must be at most 50 characters').run(req);
    await body('description').optional().trim().run(req);
    await body('permissions').optional().isArray().withMessage('Permissions must be an array').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if role name already exists
    const existingRole = await Role.findByName(req.body.name);
    if (existingRole) {
      return res.status(400).json({ message: 'Role name already exists' });
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
      message: 'Role created successfully',
      role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update role
exports.update = async (req, res) => {
  try {
    // Validate input
    await body('name').notEmpty().trim().withMessage('Name is required')
      .isLength({ max: 50 }).withMessage('Name must be at most 50 characters').run(req);
    await body('description').optional().trim().run(req);
    await body('permissions').optional().isArray().withMessage('Permissions must be an array').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if new name already exists (excluding current role)
    if (req.body.name !== role.name) {
      const existingRole = await Role.findByName(req.body.name);
      if (existingRole) {
        return res.status(400).json({ message: 'Role name already exists' });
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
      message: 'Role updated successfully',
      role: updatedRole
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete role
exports.delete = async (req, res) => {
  try {
    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if role has users
    const usersCount = await Role.getUsersCount(req.params.id);
    if (usersCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role with associated users. Please reassign users to different roles first.' 
      });
    }

    await Role.delete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get role permissions
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Role.getPermissions(req.params.id);
    res.json({ permissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update role permissions
exports.updatePermissions = async (req, res) => {
  try {
    // Validate input
    await body('permissions').isArray().withMessage('Permissions must be an array').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await Role.addPermissions(req.params.id, req.body.permissions);
    
    const updatedRole = await Role.findById(req.params.id);
    res.json({
      message: 'Role permissions updated successfully',
      role: updatedRole
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 