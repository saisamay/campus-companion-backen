// middleware/multer.js
const multer = require('multer');

// memory storage — we will convert buffer -> base64 and send to Cloudinary
const storage = multer.memoryStorage();

function fileFilter (req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed!'), false);
  } else {
    cb(null, true);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

module.exports = upload;
