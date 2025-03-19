const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', partnerController.getAll);
router.get('/active', partnerController.getActive);
router.get('/name/:name', partnerController.getByName);
router.get('/:id', partnerController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', partnerController.partnerValidation, partnerController.create);
router.put('/:id', partnerController.partnerValidation, partnerController.update);
router.delete('/:id', partnerController.delete);
router.patch('/:id/toggle-active', partnerController.toggleActive);

module.exports = router; 