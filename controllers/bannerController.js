const Banner = require('../models/Banner');
const Image = require('../models/Image');
const { body, validationResult } = require('express-validator');

exports.create = async (req, res) => {
  try {
    // Validate input
    await body('image_id').notEmpty().isInt().withMessage('Image ID is required').run(req);
    await body('title').optional().trim().run(req);
    await body('position').notEmpty().withMessage('Position is required').run(req);
    await body('start_date').optional().isISO8601().toDate().withMessage('Invalid start date').run(req);
    await body('end_date').optional().isISO8601().toDate().withMessage('Invalid end date').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if image exists
    const imageExists = await Image.exists(req.body.image_id);
    if (!imageExists) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Validate date range
    if (req.body.start_date && req.body.end_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      if (startDate > endDate) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }
    }

    const bannerId = await Banner.create(req.body);
    const banner = await Banner.findById(bannerId);

    res.status(201).json({
      message: 'Banner created successfully',
      banner
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filters = {
      position: req.query.position,
      is_active: req.query.is_active === 'true' ? true : (req.query.is_active === 'false' ? false : undefined),
      current_date: req.query.current_only === 'true' ? new Date() : undefined,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Banner.findAll(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.json({ banner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getByPosition = async (req, res) => {
  try {
    const banners = await Banner.getActiveByPosition(req.params.position);
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Validate input
    await body('image_id').optional().isInt().withMessage('Invalid image ID').run(req);
    await body('title').optional().trim().run(req);
    await body('position').optional().run(req);
    await body('is_active').optional().isBoolean().withMessage('Invalid active status').run(req);
    await body('start_date').optional().isISO8601().toDate().withMessage('Invalid start date').run(req);
    await body('end_date').optional().isISO8601().toDate().withMessage('Invalid end date').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Check if image exists if image_id is being updated
    if (req.body.image_id) {
      const imageExists = await Image.exists(req.body.image_id);
      if (!imageExists) {
        return res.status(404).json({ message: 'Image not found' });
      }
    }

    // Validate date range if both dates are provided
    if (req.body.start_date && req.body.end_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      if (startDate > endDate) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }
    }

    await Banner.update(req.params.id, req.body);
    const updatedBanner = await Banner.findById(req.params.id);

    res.json({
      message: 'Banner updated successfully',
      banner: updatedBanner
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    await Banner.delete(req.params.id);
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 