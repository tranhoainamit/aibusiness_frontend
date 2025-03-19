const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth, checkRole } = require('../middleware/auth');

// Tất cả các routes yêu cầu xác thực
router.use(auth);

// Routes cho người dùng
router.get('/', notificationController.getByUser);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/mark-read', notificationController.markAsRead);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.delete);
router.delete('/read/all', notificationController.deleteAllRead);

// Routes cho admin
router.use(checkRole([3]));
router.post('/', notificationController.notificationValidation, notificationController.create);
router.post('/multiple', notificationController.multipleNotificationValidation, notificationController.createMultiple);

module.exports = router; 