const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');

exports.create = async (req, res) => {
  try {
    // Validate input
    await body('name').notEmpty().trim().withMessage('Name is required').run(req);
    await body('description').optional().trim().run(req);
    await body('parent_id').optional().isInt().withMessage('Parent ID must be an integer').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, parent_id } = req.body;

    // If parent_id is provided, check if it exists
    if (parent_id) {
      const parentExists = await Category.exists(parent_id);
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
    }

    const categoryId = await Category.create({
      name,
      description,
      parent_id
    });

    const newCategory = await Category.findById(categoryId);
    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { stats } = req.query;
    const categories = await Category.findAll(stats === 'true');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTree = async (req, res) => {
  try {
    const tree = await Category.getTree();
    res.json({ categories: tree });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Validate input
    await body('name').notEmpty().trim().withMessage('Name is required').run(req);
    await body('description').optional().trim().run(req);
    await body('parent_id').optional().isInt().withMessage('Parent ID must be an integer').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, parent_id } = req.body;

    // Check if category exists
    const categoryExists = await Category.exists(id);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // If parent_id is provided, check if it exists
    if (parent_id) {
      const parentExists = await Category.exists(parent_id);
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
    }

    await Category.update(id, {
      name,
      description,
      parent_id
    });

    const updatedCategory = await Category.findById(id);
    res.json({
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    if (error.message.includes('Circular reference')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const categoryExists = await Category.exists(id);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Category.delete(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error.message.includes('Cannot delete category')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Category.getStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};