const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/public', settingController.getPublic);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.get('/', settingController.getAll);
router.get('/group/:group', settingController.getByGroup);
router.get('/:key', settingController.getByKey);
router.post('/', settingController.settingValidation, settingController.create);
router.put('/:key', settingController.settingValidation, settingController.update);
router.post('/bulk-update', settingController.bulkUpdateValidation, settingController.bulkUpdate);
router.delete('/:key', settingController.delete);

module.exports = router; 