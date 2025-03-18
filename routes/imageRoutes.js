const express = require('express');
const router = express.Router();
const { ImageController, imageValidation } = require('../controllers/imageController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes for viewing images
router.get('/', ImageController.getAll);
router.get('/:id', ImageController.getById);

// Protected routes
router.use(auth);

// Upload image - Any authenticated user
router.post('/upload', imageValidation, ImageController.upload);

// Get images by user
router.get('/user/:userId?', ImageController.getByUser);

// Update and delete - Admin or image owner
router.put('/:id', imageValidation, ImageController.update);
router.delete('/:id', ImageController.delete);

module.exports = router; 