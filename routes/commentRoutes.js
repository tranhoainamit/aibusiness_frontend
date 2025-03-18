const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes - Get comments
router.get('/', commentController.getAll);
router.get('/:id', commentController.getById);
router.get('/:id/replies', commentController.getReplies);
router.get('/counts', commentController.getCounts);

// Protected routes - Require authentication
router.use(auth);

// Create comment
router.post('/', commentController.create);

// Update and delete comments - Only owner or admin
router.put('/:id', commentController.update);
router.delete('/:id', commentController.delete);

module.exports = router; 