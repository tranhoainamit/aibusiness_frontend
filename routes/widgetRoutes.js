const express = require('express');
const router = express.Router();
const { WidgetController, widgetValidation } = require('../controllers/widgetController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', WidgetController.getAll);
router.get('/position/:position', WidgetController.getByPosition);
router.get('/:id', WidgetController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', widgetValidation, WidgetController.create);
router.put('/:id', widgetValidation, WidgetController.update);
router.delete('/:id', WidgetController.delete);
router.patch('/:id/toggle-active', WidgetController.toggleActive);
router.patch('/:id/order', WidgetController.updateOrder);

module.exports = router; 