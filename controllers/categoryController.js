const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');

// Validation rules
const categoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Tên danh mục là bắt buộc')
    .trim(),
  
  body('description')
    .optional()
    .trim(),
  
  body('parent_id')
    .optional()
    .isInt()
    .withMessage('ID danh mục cha phải là số nguyên')
];

const categoryController = {
  // Create new category
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      const { name, description, parent_id } = req.body;

      // If parent_id is provided, check if it exists
      if (parent_id) {
        const parentExists = await Category.exists(parent_id);
        if (!parentExists) {
          return res.status(404).json({ message: 'Không tìm thấy danh mục cha' });
        }
      }

      const categoryId = await Category.create({
        name,
        description,
        parent_id
      });

      const newCategory = await Category.findById(categoryId);
      res.status(201).json({
        message: 'Tạo danh mục thành công',
        data: newCategory
      });
    } catch (error) {
      console.error('Lỗi tạo danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi tạo danh mục' });
    }
  },

  // Get all categories
  getAll: async (req, res) => {
    try {
      const { stats } = req.query;
      const categories = await Category.findAll(stats === 'true');
      
      // Format the response data
      const formattedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        parent_id: category.parent_id,
        created_at: category.created_at,
        updated_at: category.updated_at,
        course_count: category.course_count || 0,
        student_count: category.student_count || 0
      }));

      res.json({
        message: 'Lấy danh sách danh mục thành công',
        data: formattedCategories
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách danh mục' });
    }
  },

  // Get category tree
  getTree: async (req, res) => {
    try {
      const tree = await Category.getTree();
      res.json({
        message: 'Lấy cây danh mục thành công',
        data: tree
      });
    } catch (error) {
      console.error('Lỗi lấy cây danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi lấy cây danh mục' });
    }
  },

  // Get category by ID
  getById: async (req, res) => {
    try {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Không tìm thấy danh mục' });
      }
      
      res.json({
        message: 'Lấy thông tin danh mục thành công',
        data: category
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin danh mục' });
    }
  },

  // Update category
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }
      
      const categoryId = req.params.id;
      const { name, description, parent_id } = req.body;
      
      // Check if category exists
      const categoryExists = await Category.exists(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Không tìm thấy danh mục' });
      }
      
      // If parent_id is provided, check if it exists and is not the same as category
      if (parent_id) {
        if (parent_id == categoryId) {
          return res.status(400).json({ message: 'Danh mục không thể là cha của chính nó' });
        }
        
        const parentExists = await Category.exists(parent_id);
        if (!parentExists) {
          return res.status(404).json({ message: 'Không tìm thấy danh mục cha' });
        }
        
        // Check if parent is not a child of this category (cyclic relationship)
        const isValidParent = await Category.isValidParent(categoryId, parent_id);
        if (!isValidParent) {
          return res.status(400).json({ 
            message: 'Không thể chọn danh mục con làm danh mục cha (tránh vòng lặp)' 
          });
        }
      }
      
      // Update category
      const success = await Category.update(categoryId, {
        name,
        description,
        parent_id
      });
      
      if (!success) {
        return res.status(400).json({ message: 'Cập nhật danh mục thất bại' });
      }
      
      const updatedCategory = await Category.findById(categoryId);
      
      res.json({
        message: 'Cập nhật danh mục thành công',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Lỗi cập nhật danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật danh mục' });
    }
  },

  // Delete category
  delete: async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const categoryExists = await Category.exists(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Không tìm thấy danh mục' });
      }
      
      // Check if category has children
      const hasChildren = await Category.hasChildren(categoryId);
      if (hasChildren) {
        return res.status(400).json({ message: 'Không thể xóa danh mục có danh mục con' });
      }
      
      // Delete category
      const success = await Category.delete(categoryId);
      
      res.json({
        message: 'Xóa danh mục thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi xóa danh mục' });
    }
  },

  // Get category statistics
  getStats: async (req, res) => {
    try {
      const stats = await Category.getStats();
      
      res.json({
        message: 'Lấy thông tin thống kê danh mục thành công',
        data: stats
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin thống kê danh mục:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin thống kê danh mục' });
    }
  }
};

module.exports = {
  ...categoryController,
  categoryValidation
};