// backend/routes/user.js
const express = require('express');
const router = express.Router();

// --- IMPORTS ---
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware'); 
const User = require('../models/User'); 
const cloudinary = require('../utils/cloudinary');

// --- MIDDLEWARE ---
const upload = require('../middleware/upload'); 

// --- ROUTES ---

// 1. Search Users (Must be before /:id to avoid conflict)
router.get('/search', authMiddleware, userController.searchUsers);

// 2. Search Teachers (Must be before /:id)
router.get('/teachers', userController.searchFaculty);

// 3. Get User By ID (NEW ROUTE)
router.get('/:id', authMiddleware, userController.getUserById);

// 4. Create User
router.post('/', upload.single('profile'), userController.createUser);

// 5. Update User
router.put('/:id', authMiddleware, upload.single('profile'), userController.updateUser);

// 6. Delete User
router.delete('/:id', authMiddleware, userController.deleteUser);

// 7. Change Password
router.post('/change-password', authMiddleware, userController.changePassword);

// 8. Upload Avatar
router.post('/upload-avatar', upload.single('profile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const email = String(req.body.email).toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.profile && user.profile.public_id) {
      await cloudinary.uploader.destroy(user.profile.public_id).catch(() => {});
    }

    user.profile = {
      url: req.file.path,
      public_id: req.file.filename
    };

    await user.save();
    return res.json({ success: true, message: 'Profile updated!', data: { profile: user.profile } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;