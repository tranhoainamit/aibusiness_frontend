const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widgetController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', widgetController.getAll);
router.get('/position/:position', widgetController.getByPosition);
router.get('/:id', widgetController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', widgetController.widgetValidation, widgetController.create);
router.put('/:id', widgetController.widgetValidation, widgetController.update);
router.delete('/:id', widgetController.delete);
router.patch('/:id/toggle-active', widgetController.toggleActive);
router.patch('/:id/order', widgetController.updateOrder);

module.exports = router; 