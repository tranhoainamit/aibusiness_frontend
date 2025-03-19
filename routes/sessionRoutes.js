const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { auth, checkRole } = require('../middleware/auth');

// Tất cả các routes đều yêu cầu xác thực
router.use(auth);

// Routes cho người dùng đã đăng nhập
router.post('/', sessionController.sessionValidation, sessionController.create);
router.get('/me', sessionController.getByUser);
router.get('/:id', sessionController.getDetails);
router.delete('/:id', sessionController.deactivate);
router.post('/deactivate-all', sessionController.deactivateAll);
router.patch('/update-activity', sessionController.updateActivity);

// Routes cho admin
router.delete('/cleanup/expired', checkRole([3]), sessionController.cleanupExpired);

module.exports = router; 