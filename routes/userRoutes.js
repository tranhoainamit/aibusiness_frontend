const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (require authentication)
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/change-password', auth, userController.changePassword);
router.delete('/account', auth, userController.deleteAccount);

// Admin routes
router.get('/users', auth, checkRole([2]), userController.getAllUsers);
router.get('/users/:id', auth, checkRole([2]), userController.getUserById);
router.put('/users/:id', auth, checkRole([2]), userController.updateUser);
router.delete('/users/:id', auth, checkRole([2]), userController.deleteUser);

module.exports = router; 