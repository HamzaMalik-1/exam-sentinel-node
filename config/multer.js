const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Your configured cloudinary instance

// Setup Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecommerce_items', // Folder name on Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // ✅ Allowed types
    transformation: [{ width: 800, height: 800, crop: 'limit' }], // ✅ Optional resize
    public_id: (req, file) => {
      // Optional: customize filename
      return Date.now() + '-' + file.originalname.split('.')[0];
    }
  },
});

// Multer middleware with Cloudinary storage
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ✅ 5MB limit
  },
});

module.exports = upload;
