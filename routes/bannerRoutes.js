const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', bannerController.getAll);
router.get('/position/:position', bannerController.getByPosition);
router.get('/:id', bannerController.getById);

// Protected routes - Admin only
router.use(auth, checkRole([3]));

router.post('/', bannerController.create);
router.put('/:id', bannerController.update);
router.delete('/:id', bannerController.delete);

module.exports = router; 