const Comment = require('../models/Comment');
const { body, validationResult } = require('express-validator');

// Validation rules
const commentValidation = [
  body('content')
    .notEmpty()
    .withMessage('Nội dung bình luận là bắt buộc')
    .trim(),
  
  body('lesson_id')
    .optional()
    .isInt()
    .withMessage('ID bài học không hợp lệ'),
  
  body('post_id')
    .optional()
    .isInt()
    .withMessage('ID bài viết không hợp lệ'),
  
  body('parent_id')
    .optional()
    .isInt()
    .withMessage('ID bình luận cha không hợp lệ')
];

// Validation rules for update
const updateValidation = [
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nội dung bình luận không được để trống'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái kích hoạt không hợp lệ')
];

const commentController = {
  // Create new comment
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }

      // Check that either lesson_id or post_id is provided, but not both
      if ((!req.body.lesson_id && !req.body.post_id) || (req.body.lesson_id && req.body.post_id)) {
        return res.status(400).json({ message: 'Chỉ được cung cấp một trong hai: ID bài học hoặc ID bài viết' });
      }

      // Check if parent comment exists if parent_id is provided
      if (req.body.parent_id) {
        const parentExists = await Comment.exists(req.body.parent_id);
        if (!parentExists) {
          return res.status(404).json({ message: 'Không tìm thấy bình luận cha' });
        }
      }

      const commentData = {
        ...req.body,
        user_id: req.user.id // From auth middleware
      };

      const commentId = await Comment.create(commentData);
      const comment = await Comment.findById(commentId);

      res.status(201).json({
        message: 'Tạo bình luận thành công',
        data: comment
      });
    } catch (error) {
      console.error('Lỗi tạo bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi tạo bình luận' });
    }
  },

  // Get all comments with filtering
  getAll: async (req, res) => {
    try {
      const { lesson_id, post_id, user_id, parent_id, limit = 10, page = 1 } = req.query;
      
      const result = await Comment.findAll({
        lesson_id,
        post_id, 
        user_id,
        parent_id,
        limit: parseInt(limit),
        page: parseInt(page)
      });
      
      res.json({
        message: 'Lấy danh sách bình luận thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách bình luận' });
    }
  },

  // Get comment by ID
  getById: async (req, res) => {
    try {
      const commentId = req.params.id;
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }
      
      res.json({
        message: 'Lấy thông tin bình luận thành công',
        data: comment
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi lấy thông tin bình luận' });
    }
  },

  // Get replies to a comment
  getReplies: async (req, res) => {
    try {
      const commentId = req.params.id;
      const { limit = 10, page = 1 } = req.query;
      
      const replies = await Comment.findReplies(commentId, {
        limit: parseInt(limit),
        page: parseInt(page)
      });
      
      res.json({
        message: 'Lấy danh sách phản hồi thành công',
        data: replies
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách phản hồi:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách phản hồi' });
    }
  },

  // Update comment
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
      }
      
      const commentId = req.params.id;
      const { content, is_active } = req.body;
      
      // Check if comment exists
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }
      
      // Check if user is authorized (owner of the comment or admin)
      if (comment.user_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật bình luận này' });
      }
      
      // Update comment
      const updateData = {};
      if (content) updateData.content = content;
      if (is_active !== undefined && req.user.role_id === 3) {
        // Only admin can update is_active status
        updateData.is_active = is_active;
      }
      
      const success = await Comment.update(commentId, updateData);
      
      if (!success) {
        return res.status(400).json({ message: 'Cập nhật bình luận thất bại' });
      }
      
      // Get updated comment
      const updatedComment = await Comment.findById(commentId);
      
      res.json({
        message: 'Cập nhật bình luận thành công',
        data: updatedComment
      });
    } catch (error) {
      console.error('Lỗi cập nhật bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật bình luận' });
    }
  },

  // Delete comment
  delete: async (req, res) => {
    try {
      const commentId = req.params.id;
      
      // Check if comment exists
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }
      
      // Check if user is authorized (owner of the comment or admin)
      if (comment.user_id !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này' });
      }
      
      // Delete comment and its replies
      const success = await Comment.delete(commentId);
      
      res.json({
        message: 'Xóa bình luận thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi xóa bình luận' });
    }
  },

  // Get comment counts by item
  getCounts: async (req, res) => {
    try {
      const { lesson_id, post_id } = req.query;
      
      if (!lesson_id && !post_id) {
        return res.status(400).json({ message: 'Phải cung cấp ID bài học hoặc ID bài viết' });
      }
      
      const counts = await Comment.getCounts({ lesson_id, post_id });
      
      res.json({
        message: 'Lấy số lượng bình luận thành công',
        data: counts
      });
    } catch (error) {
      console.error('Lỗi lấy số lượng bình luận:', error);
      res.status(500).json({ message: 'Lỗi khi lấy số lượng bình luận' });
    }
  }
};

module.exports = {
  ...commentController,
  commentValidation,
  updateValidation
}; 