const express = require('express');
const router = express.Router();
const { PaymentController, createPaymentValidation, updateStatusValidation } = require('../controllers/paymentController');
const { auth, checkRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create a new payment
router.post('/', createPaymentValidation, PaymentController.create);

// Get all payments (admin only)
router.get('/', checkRole([3]), PaymentController.getAll);

// Get payment by ID
router.get('/:id', PaymentController.getById);

// Update payment status (admin only)
router.put('/:id/status', checkRole([3]), updateStatusValidation, PaymentController.updateStatus);

// Get payment statistics (admin only)
router.get('/stats/overview', checkRole([3]), PaymentController.getStats);

// Get payment methods distribution (admin only)
router.get('/stats/methods', checkRole([3]), PaymentController.getMethodsDistribution);

module.exports = router; 