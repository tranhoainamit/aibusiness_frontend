const express = require('express');
const router = express.Router();
const {
  NotificationController,
  notificationValidation,
  multipleNotificationValidation
} = require('../controllers/notificationController');
const { auth, checkRole } = require('../middleware/auth');

// Tất cả các routes yêu cầu xác thực
router.use(auth);

// Routes cho người dùng
router.get('/', NotificationController.getByUser);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/mark-read', NotificationController.markAsRead);
router.patch('/mark-all-read', NotificationController.markAllAsRead);
router.delete('/:id', NotificationController.delete);
router.delete('/read/all', NotificationController.deleteAllRead);

// Routes cho admin
router.use(checkRole([3]));
router.post('/', notificationValidation, NotificationController.create);
router.post('/multiple', multipleNotificationValidation, NotificationController.createMultiple);

module.exports = router; 