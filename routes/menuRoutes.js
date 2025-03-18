const express = require('express');
const router = express.Router();
const { MenuController, menuValidation } = require('../controllers/menuController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', MenuController.getAll);
router.get('/tree', MenuController.getTree);
router.get('/:id', MenuController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', menuValidation, MenuController.create);
router.put('/:id', menuValidation, MenuController.update);
router.delete('/:id', MenuController.delete);
router.patch('/:id/toggle-active', MenuController.toggleActive);
router.patch('/:id/order', MenuController.updateOrder);

module.exports = router; 