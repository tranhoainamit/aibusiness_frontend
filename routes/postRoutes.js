const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { auth, checkRole } = require('../middleware/auth');

// ------------------------------------------
// PUBLIC ROUTES - No authentication required
// ------------------------------------------
// Get all posts with filtering and pagination
router.get('/', postController.getAll);

// Get post by slug
router.get('/slug/:slug', postController.getBySlug);

// Get post by ID
router.get('/:id', postController.getById);

// ------------------------------------------
// PROTECTED ROUTES - Authentication required
// ------------------------------------------
router.use(auth);

// ------------------------------------------
// CONTENT MANAGEMENT - Admin and Editor only
// ------------------------------------------
// Create new post (Admin and Editor only)
router.post('/', checkRole([2, 3]), postController.postValidation, postController.create);

// ------------------------------------------
// POST MANAGEMENT - Author, Admin, or Editor
// ------------------------------------------
// Update existing post
router.put('/:id', postController.postValidation, postController.update);

// Delete post
router.delete('/:id', postController.delete);

module.exports = router; 