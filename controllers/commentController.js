const Comment = require('../models/Comment');
const { body, validationResult } = require('express-validator');

exports.create = async (req, res) => {
  try {
    // Validate input
    await body('content').notEmpty().trim().withMessage('Content is required').run(req);
    await body('lesson_id').optional().isInt().withMessage('Invalid lesson ID').run(req);
    await body('post_id').optional().isInt().withMessage('Invalid post ID').run(req);
    await body('parent_id').optional().isInt().withMessage('Invalid parent comment ID').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that either lesson_id or post_id is provided, but not both
    if ((!req.body.lesson_id && !req.body.post_id) || (req.body.lesson_id && req.body.post_id)) {
      return res.status(400).json({ message: 'Exactly one of lesson_id or post_id must be provided' });
    }

    // Check if parent comment exists if parent_id is provided
    if (req.body.parent_id) {
      const parentExists = await Comment.exists(req.body.parent_id);
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }

    const commentData = {
      ...req.body,
      user_id: req.user.id // From auth middleware
    };

    const commentId = await Comment.create(commentData);
    const comment = await Comment.findById(commentId);

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filters = {
      lesson_id: req.query.lesson_id,
      post_id: req.query.post_id,
      user_id: req.query.user_id,
      is_active: req.query.is_active === 'true' ? true : (req.query.is_active === 'false' ? false : undefined),
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Comment.findAll(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.json({ comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await Comment.getReplies(req.params.id, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Validate input
    await body('content').optional().trim().notEmpty().withMessage('Content cannot be empty').run(req);
    await body('is_active').optional().isBoolean().withMessage('Invalid active status').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is authorized to update the comment
    if (comment.user_id !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    await Comment.update(req.params.id, req.body);
    const updatedComment = await Comment.findById(req.params.id);

    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is authorized to delete the comment
    if (comment.user_id !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.delete(req.params.id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCounts = async (req, res) => {
  try {
    const filters = {
      lesson_id: req.query.lesson_id,
      post_id: req.query.post_id,
      user_id: req.query.user_id
    };

    const count = await Comment.getCounts(filters);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 