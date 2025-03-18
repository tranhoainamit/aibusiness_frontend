const { body, validationResult } = require('express-validator');
const Widget = require('../models/Widget');

// Validation rules
const widgetValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Widget name is required')
    .isLength({ max: 100 })
    .withMessage('Widget name must not exceed 100 characters'),
  
  body('content')
    .optional()
    .trim(),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Position must not exceed 50 characters'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),
  
  body('order_number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order number must be a non-negative integer')
];

class WidgetController {
  // Create new widget
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const widgetId = await Widget.create(req.body);
      const widget = await Widget.findById(widgetId);

      res.status(201).json({
        message: 'Widget created successfully',
        widget
      });
    } catch (error) {
      console.error('Create widget error:', error);
      res.status(500).json({ message: 'Error creating widget' });
    }
  }

  // Get all widgets with filters
  static async getAll(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true : 
                   req.query.is_active === 'false' ? false : undefined,
        position: req.query.position,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Widget.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Get widgets error:', error);
      res.status(500).json({ message: 'Error retrieving widgets' });
    }
  }

  // Get widget by ID
  static async getById(req, res) {
    try {
      const widget = await Widget.findById(req.params.id);
      if (!widget) {
        return res.status(404).json({ message: 'Widget not found' });
      }
      res.json(widget);
    } catch (error) {
      console.error('Get widget error:', error);
      res.status(500).json({ message: 'Error retrieving widget' });
    }
  }

  // Update widget
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const widget = await Widget.findById(req.params.id);
      if (!widget) {
        return res.status(404).json({ message: 'Widget not found' });
      }

      const updated = await Widget.update(req.params.id, req.body);
      if (updated) {
        const updatedWidget = await Widget.findById(req.params.id);
        res.json({
          message: 'Widget updated successfully',
          widget: updatedWidget
        });
      } else {
        res.status(400).json({ message: 'Failed to update widget' });
      }
    } catch (error) {
      console.error('Update widget error:', error);
      res.status(500).json({ message: 'Error updating widget' });
    }
  }

  // Delete widget
  static async delete(req, res) {
    try {
      const widget = await Widget.findById(req.params.id);
      if (!widget) {
        return res.status(404).json({ message: 'Widget not found' });
      }

      const deleted = await Widget.delete(req.params.id);
      if (deleted) {
        res.json({ message: 'Widget deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete widget' });
      }
    } catch (error) {
      console.error('Delete widget error:', error);
      res.status(500).json({ message: 'Error deleting widget' });
    }
  }

  // Toggle widget active status
  static async toggleActive(req, res) {
    try {
      const widget = await Widget.findById(req.params.id);
      if (!widget) {
        return res.status(404).json({ message: 'Widget not found' });
      }

      const toggled = await Widget.toggleActive(req.params.id);
      if (toggled) {
        const updatedWidget = await Widget.findById(req.params.id);
        res.json({
          message: 'Widget status toggled successfully',
          widget: updatedWidget
        });
      } else {
        res.status(400).json({ message: 'Failed to toggle widget status' });
      }
    } catch (error) {
      console.error('Toggle widget status error:', error);
      res.status(500).json({ message: 'Error toggling widget status' });
    }
  }

  // Get widgets by position
  static async getByPosition(req, res) {
    try {
      const widgets = await Widget.getByPosition(req.params.position);
      res.json(widgets);
    } catch (error) {
      console.error('Get widgets by position error:', error);
      res.status(500).json({ message: 'Error retrieving widgets by position' });
    }
  }

  // Update widget order
  static async updateOrder(req, res) {
    try {
      const { order_number } = req.body;
      
      if (typeof order_number !== 'number' || order_number < 0) {
        return res.status(400).json({ message: 'Invalid order number' });
      }

      const widget = await Widget.findById(req.params.id);
      if (!widget) {
        return res.status(404).json({ message: 'Widget not found' });
      }

      const updated = await Widget.updateOrder(req.params.id, order_number);
      if (updated) {
        const updatedWidget = await Widget.findById(req.params.id);
        res.json({
          message: 'Widget order updated successfully',
          widget: updatedWidget
        });
      } else {
        res.status(400).json({ message: 'Failed to update widget order' });
      }
    } catch (error) {
      console.error('Update widget order error:', error);
      res.status(500).json({ message: 'Error updating widget order' });
    }
  }
}

module.exports = {
  WidgetController,
  widgetValidation
}; 