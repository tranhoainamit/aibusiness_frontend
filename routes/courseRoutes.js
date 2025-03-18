const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', courseController.getAll);
router.get('/:id', courseController.getById);

// Protected routes (require authentication)
router.post('/', auth, checkRole([2, 3]), courseController.create); // Admin and instructors can create courses
router.put('/:id', auth, courseController.update); // Course owner or admin can update
router.delete('/:id', auth, courseController.delete); // Course owner or admin can delete
router.put('/:id/publish', auth, courseController.togglePublish); // Course owner or admin can publish/unpublish

module.exports = router; 