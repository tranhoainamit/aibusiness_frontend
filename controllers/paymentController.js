const { validationResult, body } = require('express-validator');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');

// Validation rules for payment creation
const createPaymentValidation = [
  body('purchase_id').notEmpty().isInt().withMessage('Purchase ID is required'),
  body('amount').notEmpty().isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('payment_method').notEmpty().isString().withMessage('Payment method is required'),
  body('transaction_id').optional().isString(),
  body('payment_details').optional().isString()
];

// Validation rules for status update
const updateStatusValidation = [
  body('status').notEmpty().isIn(['pending', 'completed', 'failed']).withMessage('Valid status is required'),
  body('transaction_id').optional().isString(),
  body('payment_details').optional().isString()
];

class PaymentController {
  // Create a new payment
  static async create(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { purchase_id, amount, payment_method, transaction_id, payment_details } = req.body;

      // Check if purchase exists
      const purchaseExists = await Purchase.exists(purchase_id);
      if (!purchaseExists) {
        return res.status(404).json({ message: 'Purchase not found' });
      }

      // Create payment
      const paymentId = await Payment.create({
        purchase_id,
        amount,
        payment_method,
        transaction_id,
        payment_details
      });

      const payment = await Payment.findById(paymentId);
      res.status(201).json({
        message: 'Payment created successfully',
        payment
      });
    } catch (error) {
      console.error('Error in create payment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get all payments with filters
  static async getAll(req, res) {
    try {
      const filters = {
        user_id: req.query.user_id,
        course_id: req.query.course_id,
        status: req.query.status,
        payment_method: req.query.payment_method,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Payment.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Error in get all payments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get payment by ID
  static async getById(req, res) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      res.json(payment);
    } catch (error) {
      console.error('Error in get payment by ID:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Update payment status
  static async updateStatus(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, transaction_id, payment_details } = req.body;

      // Check if payment exists
      const paymentExists = await Payment.exists(id);
      if (!paymentExists) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Update status
      const updated = await Payment.updateStatus(id, status, transaction_id, payment_details);
      if (!updated) {
        return res.status(400).json({ message: 'Failed to update payment status' });
      }

      const payment = await Payment.findById(id);
      res.json({
        message: 'Payment status updated successfully',
        payment
      });
    } catch (error) {
      console.error('Error in update payment status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get payment statistics
  static async getStats(req, res) {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await Payment.getStats(filters);
      res.json(stats);
    } catch (error) {
      console.error('Error in get payment statistics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get payment methods distribution
  static async getMethodsDistribution(req, res) {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const distribution = await Payment.getMethodsDistribution(filters);
      res.json(distribution);
    } catch (error) {
      console.error('Error in get payment methods distribution:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = {
  PaymentController,
  createPaymentValidation,
  updateStatusValidation
}; 