const { validationResult, body } = require('express-validator');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');

// Validation rules for payment creation
const createPaymentValidation = [
  body('purchase_id').notEmpty().isInt().withMessage('ID giao dịch là bắt buộc'),
  body('amount').notEmpty().isFloat({ min: 0 }).withMessage('Số tiền hợp lệ là bắt buộc'),
  body('payment_method').notEmpty().isString().withMessage('Phương thức thanh toán là bắt buộc'),
  body('transaction_id').optional().isString(),
  body('payment_details').optional().isString()
];

// Validation rules for status update
const updateStatusValidation = [
  body('status').notEmpty().isIn(['pending', 'completed', 'failed']).withMessage('Trạng thái hợp lệ là bắt buộc'),
  body('transaction_id').optional().isString(),
  body('payment_details').optional().isString()
];

// Create a new payment
const create = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { purchase_id, amount, payment_method, transaction_id, payment_details } = req.body;

    // Check if purchase exists
    const purchaseExists = await Purchase.exists(purchase_id);
    if (!purchaseExists) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
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
      message: 'Tạo thanh toán thành công',
      data: payment
    });
  } catch (error) {
    console.error('Lỗi khi tạo thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Get all payments with filters
const getAll = async (req, res) => {
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
    res.json({
      message: 'Lấy danh sách thanh toán thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Get payment by ID
const getById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
    }
    res.json({
      message: 'Lấy thông tin thanh toán thành công',
      data: payment
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Update payment status
const updateStatus = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, transaction_id, payment_details } = req.body;

    // Check if payment exists
    const paymentExists = await Payment.exists(id);
    if (!paymentExists) {
      return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
    }

    // Update status
    const updated = await Payment.updateStatus(id, status, transaction_id, payment_details);
    if (!updated) {
      return res.status(400).json({ message: 'Cập nhật trạng thái thanh toán thất bại' });
    }

    const payment = await Payment.findById(id);
    res.json({
      message: 'Cập nhật trạng thái thanh toán thành công',
      data: payment
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Get payment statistics
const getStats = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const stats = await Payment.getStats(filters);
    res.json({
      message: 'Lấy thống kê thanh toán thành công',
      data: stats
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// Get payment methods distribution
const getMethodsDistribution = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const distribution = await Payment.getMethodsDistribution(filters);
    res.json({
      message: 'Lấy phân bố phương thức thanh toán thành công',
      data: distribution
    });
  } catch (error) {
    console.error('Lỗi khi lấy phân bố phương thức thanh toán:', error);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  updateStatus,
  getStats,
  getMethodsDistribution,
  createPaymentValidation,
  updateStatusValidation
}; 