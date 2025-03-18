const express = require('express');
const router = express.Router();
const { PartnerController, partnerValidation } = require('../controllers/partnerController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', PartnerController.getAll);
router.get('/active', PartnerController.getActive);
router.get('/:id', PartnerController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', partnerValidation, PartnerController.create);
router.put('/:id', partnerValidation, PartnerController.update);
router.delete('/:id', PartnerController.delete);
router.patch('/:id/toggle-active', PartnerController.toggleActive);

module.exports = router; 