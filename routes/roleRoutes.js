const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { auth, checkRole } = require('../middleware/auth');

// All routes require admin authentication
router.use(auth, checkRole([3])); // Role 3 is admin

// Get all roles and role by ID
router.get('/', roleController.getAll);
router.get('/:id', roleController.getById);

// Create, update and delete roles
router.post('/', roleController.create);
router.put('/:id', roleController.update);
router.delete('/:id', roleController.delete);

// Manage permissions
router.get('/:id/permissions', roleController.getPermissions);
router.put('/:id/permissions', roleController.updatePermissions);

module.exports = router; 