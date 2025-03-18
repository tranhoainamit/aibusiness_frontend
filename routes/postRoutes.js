const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', postController.getAll);
router.get('/slug/:slug', postController.getBySlug);
router.get('/:id', postController.getById);

// Protected routes
router.use(auth);

// Create post - Admin and Editor (role 2) only
router.post('/', checkRole([2, 3]), postController.create);

// Update and delete - Admin, Editor, or post author
router.put('/:id', auth, postController.update);
router.delete('/:id', auth, postController.delete);

module.exports = router; 