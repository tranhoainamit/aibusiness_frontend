const Post = require('../models/Post');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');

// Validation rules
const postValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề bài viết là bắt buộc')
    .trim(),
  
  body('content')
    .notEmpty()
    .withMessage('Nội dung bài viết là bắt buộc'),
  
  body('status')
    .isIn(['draft', 'published'])
    .withMessage('Trạng thái bài viết không hợp lệ'),
  
  body('categories')
    .optional()
    .isArray()
    .withMessage('Danh mục phải là một mảng')
];

const postController = {
  // Create new post
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const postData = {
        title: req.body.title,
        content: req.body.content,
        thumbnail: req.body.thumbnail,
        author_id: req.user.id,
        status: req.body.status,
        meta_title: req.body.meta_title,
        meta_description: req.body.meta_description,
        canonical_url: req.body.canonical_url
      };

      // Create post
      const postId = await Post.create(postData);

      // Add categories if provided
      if (req.body.categories && req.body.categories.length > 0) {
        await Post.addCategories(postId, req.body.categories);
      }

      const newPost = await Post.findById(postId);
      res.status(201).json({
        message: 'Tạo bài viết thành công',
        data: newPost
      });
    } catch (error) {
      console.error('Lỗi tạo bài viết:', error);
      res.status(500).json({ message: 'Lỗi khi tạo bài viết' });
    }
  },

  // Get all posts with filtering
  getAll: async (req, res) => {
    try {
      const { author_id, status, search, category_id, limit = 10, page = 1 } = req.query;
      
      // If user is not authenticated or not admin, only show published posts
      const filterStatus = (!req.user || req.user.role_id !== 3) ? 'published' : status;
      
      const result = await Post.findAll({
        author_id,
        status: filterStatus,
        search,
        category_id,
        limit: parseInt(limit),
        page: parseInt(page)
      });

      res.json({
        message: 'Lấy danh sách bài viết thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách bài viết:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách bài viết' });
    }
  },

  // Get post by ID
  getById: async (req, res) => {
    try {
      const postId = req.params.id;
      const post = await Post.findById(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }
      
      // If post is not published, check if user is authorized
      if (post.status !== 'published') {
        // If not authenticated or not author/admin
        if (!req.user || (req.user.id !== post.author_id && req.user.role_id !== 3)) {
          return res.status(403).json({ message: 'Bạn không có quyền xem bài viết này' });
        }
      }
      
      res.json({
        message: 'Lấy thông tin bài viết thành công',
        data: post
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin bài viết:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin bài viết' });
    }
  },

  // Get post by slug
  getBySlug: async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await Post.findBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }
      
      // If post is not published, check if user is authorized
      if (post.status !== 'published') {
        // If not authenticated or not author/admin
        if (!req.user || (req.user.id !== post.author_id && req.user.role_id !== 3)) {
          return res.status(403).json({ message: 'Bạn không có quyền xem bài viết này' });
        }
      }
      
      res.json({
        message: 'Lấy thông tin bài viết thành công',
        data: post
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin bài viết theo slug:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin bài viết' });
    }
  },

  // Update post
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }
      
      const postId = req.params.id;
      
      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }
      
      // Check authorization - only author, admin, or editor can update
      if (post.author_id !== req.user.id && req.user.role_id !== 3 && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật bài viết này' });
      }
      
      // Prepare update data
      const updateData = {};
      const allowedFields = [
        'title', 'content', 'thumbnail', 'status',
        'meta_title', 'meta_description', 'canonical_url'
      ];
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      // Update post
      const success = await Post.update(postId, updateData);
      
      // Update categories if provided
      if (req.body.categories && Array.isArray(req.body.categories)) {
        await Post.clearCategories(postId);
        await Post.addCategories(postId, req.body.categories);
      }
      
      // Get updated post
      const updatedPost = await Post.findById(postId);
      
      res.json({
        message: 'Cập nhật bài viết thành công',
        data: updatedPost
      });
    } catch (error) {
      console.error('Lỗi cập nhật bài viết:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật bài viết' });
    }
  },

  // Delete post
  delete: async (req, res) => {
    try {
      const postId = req.params.id;
      
      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }
      
      // Check authorization - only author, admin, or editor can delete
      if (post.author_id !== req.user.id && req.user.role_id !== 3 && req.user.role_id !== 2) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bài viết này' });
      }
      
      // Delete post
      const success = await Post.delete(postId);
      
      res.json({
        message: 'Xóa bài viết thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa bài viết:', error);
      res.status(500).json({ message: 'Lỗi khi xóa bài viết' });
    }
  }
};

module.exports = {
  ...postController,
  postValidation
}; 