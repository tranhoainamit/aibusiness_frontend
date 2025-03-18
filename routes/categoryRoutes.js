const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', categoryController.getAll);
router.get('/tree', categoryController.getTree);
router.get('/stats', categoryController.getStats);
router.get('/:id', categoryController.getById);

// Protected routes - Admin only
router.post('/', auth, checkRole([3]), categoryController.create);
router.put('/:id', auth, checkRole([3]), categoryController.update);
router.delete('/:id', auth, checkRole([3]), categoryController.delete);

module.exports = router;