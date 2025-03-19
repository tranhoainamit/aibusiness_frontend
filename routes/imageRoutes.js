const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes for viewing images
router.get('/', imageController.getAll);
router.get('/:id', imageController.getById);

// Protected routes
router.use(auth);

// Upload image - Any authenticated user
router.post('/upload', imageController.imageValidation, imageController.upload);

// Get images by user
router.get('/user/:userId?', imageController.getByUser);

// Get total storage used by user
router.get('/storage/total', imageController.getTotalStorage);

// Update and delete - Admin or image owner
router.put('/:id', imageController.imageValidation, imageController.update);
router.delete('/:id', imageController.delete);

module.exports = router; 