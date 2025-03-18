const express = require('express');
const router = express.Router();
const { SessionController, sessionValidation } = require('../controllers/sessionController');
const { auth, checkRole } = require('../middleware/auth');

// Tất cả các routes đều yêu cầu xác thực
router.use(auth);

// Routes cho người dùng đã đăng nhập
router.post('/', sessionValidation, SessionController.create);
router.get('/me', SessionController.getByUser);
router.get('/:id', SessionController.getDetails);
router.delete('/:id', SessionController.deactivate);
router.post('/deactivate-all', SessionController.deactivateAll);
router.patch('/update-activity', SessionController.updateActivity);

// Routes cho admin
router.delete('/cleanup/expired', checkRole([3]), SessionController.cleanupExpired);

module.exports = router; 