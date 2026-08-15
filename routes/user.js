// routes/user.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');       // multer memory storage
const cloudinary = require('../utils/cloudinary');    // configured cloudinary v2
const User = require('../models/User');               // corrected path
const userController = require('../controllers/userController');

// keep your existing change-password route intact

router.get('/teachers', userController.searchFaculty);


router.post(
  '/change-password',
  (req, res, next) => {
    console.log('ROUTE HIT: /api/user/change-password');
    next();
  },
  userController.changePassword
);

/**
 * Upload avatar/profile image
 * Expects multipart/form-data with field name: "profile"
 * Expects a body field `userId` containing the user's _id
 */
router.post('/upload-avatar', upload.single('profile'), async (req, res) => {
  try {
    // 1) Validate file
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded (field name must be "profile")' });
    }

    // 2) Validate user
    const emailRaw = req.body.email;
    if (!emailRaw) {
      return res.status(400).json({ success: false, error: 'email is required in the request body' });
    }
    const email = String(emailRaw).toLowerCase().trim();


    // 3) Find user
    const user = await User.findOne({ email: email });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // 4) If an existing Cloudinary image exists, try to delete it (best-effort)
    if (user.profile && user.profile.public_id) {
      try {
        await cloudinary.uploader.destroy(user.profile.public_id);
      } catch (delErr) {
        console.warn('Failed to delete previous Cloudinary image:', delErr.message || delErr);
        // continue even if deletion fails
      }
    }

    // 5) Upload new file to Cloudinary from buffer
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64, {
      folder: 'profiles',
      transformation: [{ width: 400, height: 400, crop: 'thumb', gravity: 'face' }]
    });

    // 6) Update user.profile (use existing schema field 'profile')
    user.profile = {
      url: result.secure_url || null,
      public_id: result.public_id || null
    };

    await user.save();

    // 7) Return consistent response
    return res.json({
      success: true,
      message: 'Profile picture updated!',
      data: {
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (err) {
    console.error('upload-avatar error:', err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err.message });
  }
});

module.exports = router;
