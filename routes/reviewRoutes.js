const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Review management
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.delete);

// Review retrieval
router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getById);

// Course review statistics
router.get('/course/:courseId/stats', reviewController.getCourseStats);

module.exports = router; 