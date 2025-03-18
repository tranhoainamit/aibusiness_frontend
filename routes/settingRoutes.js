const express = require('express');
const router = express.Router();
const {
  SettingController,
  settingValidation,
  bulkUpdateValidation
} = require('../controllers/settingController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/public', SettingController.getPublic);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.get('/', SettingController.getAll);
router.get('/group/:group', SettingController.getByGroup);
router.get('/:key', SettingController.getByKey);
router.post('/', settingValidation, SettingController.create);
router.put('/:key', settingValidation, SettingController.update);
router.post('/bulk-update', bulkUpdateValidation, SettingController.bulkUpdate);
router.delete('/:key', SettingController.delete);

module.exports = router; 