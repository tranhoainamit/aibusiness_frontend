const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', menuController.getAll);
router.get('/tree', menuController.getTree);
router.get('/:id', menuController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', menuController.menuValidation, menuController.create);
router.put('/:id', menuController.menuValidation, menuController.update);
router.delete('/:id', menuController.delete);
router.patch('/:id/toggle-active', menuController.toggleActive);
router.patch('/:id/order', menuController.updateOrder);

module.exports = router; 