const { body, validationResult } = require('express-validator');
const Partner = require('../models/Partner');

// Validation rules
const partnerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Partner name is required')
    .isLength({ max: 100 })
    .withMessage('Partner name must not exceed 100 characters'),
  
  body('logo_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  
  body('website_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website URL must be a valid URL'),
  
  body('description')
    .optional()
    .trim(),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value')
];

class PartnerController {
  // Create new partner
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const partnerId = await Partner.create(req.body);
      const partner = await Partner.findById(partnerId);

      res.status(201).json({
        message: 'Partner created successfully',
        partner
      });
    } catch (error) {
      console.error('Create partner error:', error);
      res.status(500).json({ message: 'Error creating partner' });
    }
  }

  // Get all partners with filters
  static async getAll(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true : 
                   req.query.is_active === 'false' ? false : undefined,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Partner.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Get partners error:', error);
      res.status(500).json({ message: 'Error retrieving partners' });
    }
  }

  // Get partner by ID
  static async getById(req, res) {
    try {
      const partner = await Partner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Get partner error:', error);
      res.status(500).json({ message: 'Error retrieving partner' });
    }
  }

  // Update partner
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const partner = await Partner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      const updated = await Partner.update(req.params.id, req.body);
      if (updated) {
        const updatedPartner = await Partner.findById(req.params.id);
        res.json({
          message: 'Partner updated successfully',
          partner: updatedPartner
        });
      } else {
        res.status(400).json({ message: 'Failed to update partner' });
      }
    } catch (error) {
      console.error('Update partner error:', error);
      res.status(500).json({ message: 'Error updating partner' });
    }
  }

  // Delete partner
  static async delete(req, res) {
    try {
      const partner = await Partner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      const deleted = await Partner.delete(req.params.id);
      if (deleted) {
        res.json({ message: 'Partner deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete partner' });
      }
    } catch (error) {
      console.error('Delete partner error:', error);
      res.status(500).json({ message: 'Error deleting partner' });
    }
  }

  // Toggle partner active status
  static async toggleActive(req, res) {
    try {
      const partner = await Partner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      const toggled = await Partner.toggleActive(req.params.id);
      if (toggled) {
        const updatedPartner = await Partner.findById(req.params.id);
        res.json({
          message: 'Partner status toggled successfully',
          partner: updatedPartner
        });
      } else {
        res.status(400).json({ message: 'Failed to toggle partner status' });
      }
    } catch (error) {
      console.error('Toggle partner status error:', error);
      res.status(500).json({ message: 'Error toggling partner status' });
    }
  }

  // Get active partners
  static async getActive(req, res) {
    try {
      const partners = await Partner.getActive();
      res.json(partners);
    } catch (error) {
      console.error('Get active partners error:', error);
      res.status(500).json({ message: 'Error retrieving active partners' });
    }
  }
}

module.exports = {
  PartnerController,
  partnerValidation
}; 