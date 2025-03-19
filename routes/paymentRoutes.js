const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth, checkRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create a new payment
router.post('/', paymentController.createPaymentValidation, paymentController.create);

// Get all payments (admin only)
router.get('/', checkRole([3]), paymentController.getAll);

// Get payment by ID
router.get('/:id', paymentController.getById);

// Update payment status (admin only)
router.put('/:id/status', checkRole([3]), paymentController.updateStatusValidation, paymentController.updateStatus);

// Get payment statistics (admin only)
router.get('/stats/overview', checkRole([3]), paymentController.getStats);

// Get payment methods distribution (admin only)
router.get('/stats/methods', checkRole([3]), paymentController.getMethodsDistribution);

module.exports = router; 