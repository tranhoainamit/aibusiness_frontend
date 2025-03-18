const Image = require('../models/Image');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Helper function to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Helper function to check if file is an image
const isImageFile = (file) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const extension = getFileExtension(file.originalname);
  return allowedExtensions.includes(extension);
};

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Validation rules
const imageValidation = [
  body('alt_text')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Alt text must not exceed 255 characters')
];

class ImageController {
  // Upload new image
  static async upload(req, res) {
    try {
      // Handle file upload
      upload.single('image')(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: 'File upload error: ' + err.message });
          }
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ message: 'No image file provided' });
        }

        // Validate other fields
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          // Delete uploaded file if validation fails
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ errors: errors.array() });
        }

        try {
          // Create image record in database
          const imageData = {
            url: `/uploads/images/${req.file.filename}`,
            alt_text: req.body.alt_text || null,
            uploaded_by: req.user.id,
            file_size: req.file.size
          };

          const imageId = await Image.create(imageData);
          const image = await Image.findById(imageId);

          res.status(201).json({
            message: 'Image uploaded successfully',
            image
          });
        } catch (error) {
          // Delete uploaded file if database operation fails
          fs.unlinkSync(req.file.path);
          throw error;
        }
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Error uploading image' });
    }
  }

  // Get all images with filters
  static async getAll(req, res) {
    try {
      const filters = {
        uploaded_by: req.query.uploaded_by,
        search: req.query.search,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await Image.findAll(filters);
      res.json(result);
    } catch (error) {
      console.error('Get images error:', error);
      res.status(500).json({ message: 'Error retrieving images' });
    }
  }

  // Get image by ID
  static async getById(req, res) {
    try {
      const image = await Image.findById(req.params.id);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      res.json(image);
    } catch (error) {
      console.error('Get image error:', error);
      res.status(500).json({ message: 'Error retrieving image' });
    }
  }

  // Update image details
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const image = await Image.findById(req.params.id);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Check if user has permission to update
      if (image.uploaded_by !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Permission denied' });
      }

      const updated = await Image.update(req.params.id, {
        alt_text: req.body.alt_text
      });

      if (updated) {
        const updatedImage = await Image.findById(req.params.id);
        res.json({
          message: 'Image updated successfully',
          image: updatedImage
        });
      } else {
        res.status(400).json({ message: 'Failed to update image' });
      }
    } catch (error) {
      console.error('Update image error:', error);
      res.status(500).json({ message: 'Error updating image' });
    }
  }

  // Delete image
  static async delete(req, res) {
    try {
      const image = await Image.findById(req.params.id);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Check if user has permission to delete
      if (image.uploaded_by !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Permission denied' });
      }

      // Delete file from storage
      const filePath = path.join(__dirname, '..', image.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const deleted = await Image.delete(req.params.id);
      if (deleted) {
        res.json({ message: 'Image deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete image' });
      }
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ message: 'Error deleting image' });
    }
  }

  // Get images by user
  static async getByUser(req, res) {
    try {
      const userId = req.params.userId || req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Check if user has permission to view other user's images
      if (userId !== req.user.id && req.user.role_id !== 3) {
        return res.status(403).json({ message: 'Permission denied' });
      }

      const result = await Image.getByUser(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get user images error:', error);
      res.status(500).json({ message: 'Error retrieving user images' });
    }
  }
}

module.exports = {
  ImageController,
  imageValidation
}; 