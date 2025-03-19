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
      return cb(new Error('Chỉ cho phép tải lên file hình ảnh'));
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
    .withMessage('Văn bản thay thế không được vượt quá 255 ký tự')
];

// Upload new image
const uploadImage = async (req, res) => {
  try {
    // Handle file upload
    upload.single('image')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: 'Lỗi khi tải file lên: ' + err.message });
        }
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Không có file hình ảnh được cung cấp' });
      }

      // Validate other fields
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array() 
        });
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
          message: 'Tải ảnh lên thành công',
          data: image
        });
      } catch (error) {
        // Delete uploaded file if database operation fails
        fs.unlinkSync(req.file.path);
        throw error;
      }
    });
  } catch (error) {
    console.error('Lỗi tải ảnh lên:', error);
    res.status(500).json({ message: 'Lỗi khi tải ảnh lên' });
  }
};

// Get all images with filters
const getAll = async (req, res) => {
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
    res.json({
      message: 'Lấy danh sách hình ảnh thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách hình ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách hình ảnh' });
  }
};

// Get image by ID
const getById = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    res.json({
      message: 'Lấy thông tin hình ảnh thành công',
      data: image
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin hình ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin hình ảnh' });
  }
};

// Update image details
const update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }

    // Check if user has permission to update
    if (image.uploaded_by !== req.user.id && req.user.role_id !== 3) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }

    const updated = await Image.update(req.params.id, {
      alt_text: req.body.alt_text
    });

    if (updated) {
      const updatedImage = await Image.findById(req.params.id);
      res.json({
        message: 'Cập nhật hình ảnh thành công',
        data: updatedImage
      });
    } else {
      res.status(400).json({ message: 'Cập nhật hình ảnh thất bại' });
    }
  } catch (error) {
    console.error('Lỗi cập nhật hình ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật hình ảnh' });
  }
};

// Delete image
const deleteImage = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }

    // Check if user has permission to delete
    if (image.uploaded_by !== req.user.id && req.user.role_id !== 3) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }

    try {
      const deleted = await Image.delete(req.params.id);
      if (deleted) {
        // Delete file from storage only after successful DB deletion
        const filePath = path.join(__dirname, '..', image.url);
        try {
          await fs.access(filePath); // Check if file exists
          await fs.unlink(filePath); // Delete file
        } catch (fileError) {
          console.error('Lỗi xóa tệp hình ảnh:', fileError);
          // Continue even if file deletion fails as the database record is already removed
        }
        res.json({ message: 'Xóa hình ảnh thành công' });
      } else {
        res.status(400).json({ message: 'Xóa hình ảnh thất bại' });
      }
    } catch (deleteError) {
      // Handle specific errors from model
      if (deleteError.message.includes('được sử dụng trong banner')) {
        return res.status(400).json({ message: deleteError.message });
      }
      throw deleteError;
    }
  } catch (error) {
    console.error('Lỗi xóa hình ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi xóa hình ảnh: ' + error.message });
  }
};

// Get images by user
const getByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Check if user has permission to view other user's images
    if (userId !== req.user.id && req.user.role_id !== 3) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }

    const result = await Image.getByUser(userId, page, limit);
    res.json({
      message: 'Lấy danh sách hình ảnh của người dùng thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách hình ảnh của người dùng:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách hình ảnh của người dùng' });
  }
};

// Get total storage used by user
const getTotalStorage = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if user has permission to view other user's storage
    if (userId != req.user.id && req.user.role_id !== 3) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }
    
    const totalBytes = await Image.getTotalStorageByUser(userId);
    
    // Convert to human-readable format
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    
    res.json({
      message: 'Lấy thông tin dung lượng thành công',
      data: {
        userId,
        totalBytes,
        totalMB: `${totalMB} MB`
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin dung lượng:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin dung lượng: ' + error.message });
  }
};

module.exports = {
  upload: uploadImage,
  getAll,
  getById,
  update,
  delete: deleteImage,
  getByUser,
  getTotalStorage,
  imageValidation
}; 