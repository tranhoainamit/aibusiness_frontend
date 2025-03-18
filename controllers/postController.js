const Post = require('../models/Post');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');

exports.create = async (req, res) => {
  try {
    // Validate input
    await body('title').notEmpty().trim().withMessage('Title is required').run(req);
    await body('content').notEmpty().withMessage('Content is required').run(req);
    await body('status').isIn(['draft', 'published']).withMessage('Invalid status').run(req);
    await body('categories').optional().isArray().withMessage('Categories must be an array').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filters = {
      author_id: req.query.author_id,
      status: req.query.status,
      search: req.query.search,
      category_id: req.query.category_id,
      page: req.query.page,
      limit: req.query.limit
    };

    // If user is not admin, only show published posts
    if (req.user?.role !== 3) {
      filters.status = 'published';
    }

    const result = await Post.findAll(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If post is not published and user is not admin or author
    if (post.status === 'draft' && 
        req.user?.role !== 3 && 
        req.user?.id !== post.author_id) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }

    // Increment view count only for published posts
    if (post.status === 'published') {
      await Post.incrementViews(req.params.id);
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const post = await Post.findBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If post is not published and user is not admin or author
    if (post.status === 'draft' && 
        req.user?.role !== 3 && 
        req.user?.id !== post.author_id) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }

    // Increment view count only for published posts
    if (post.status === 'published') {
      await Post.incrementViews(post.id);
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Validate input
    await body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').run(req);
    await body('content').optional().notEmpty().withMessage('Content cannot be empty').run(req);
    await body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status').run(req);
    await body('categories').optional().isArray().withMessage('Categories must be an array').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check authorization
    if (req.user.role !== 3 && req.user.id !== post.author_id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Update post
    await Post.update(req.params.id, req.body);

    // Update categories if provided
    if (req.body.categories) {
      // Remove old categories
      await Post.removeCategories(req.params.id, post.categories);
      // Add new categories
      if (req.body.categories.length > 0) {
        await Post.addCategories(req.params.id, req.body.categories);
      }
    }

    const updatedPost = await Post.findById(req.params.id);
    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check authorization
    if (req.user.role !== 3 && req.user.id !== post.author_id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.delete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 