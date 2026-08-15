// backend/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const cloudinary = require('../utils/cloudinary');

/**
 * Helper: upload buffer (from multer memoryStorage) to Cloudinary
 * Returns cloudinary result (secure_url, public_id, etc.)
 */
async function uploadBufferToCloudinary(fileBuffer, mimetype, folder = 'profiles') {
  if (!fileBuffer) throw new Error('No file buffer provided');
  const base64 = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    transformation: [{ width: 400, height: 400, crop: "thumb", gravity: "face" }]
  });
  return result;
}

/**
 * Create a new user
 * Expects multipart/form-data if uploading profile image (field name: profile)
 * Other fields in req.body (e.g., name, email, role, password, etc.)
 */
exports.createUser = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Normalize email if present
    if (payload.email) payload.email = payload.email.toLowerCase();

    // Hash password if provided
    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(payload.password, salt);
    }

    // If an image file is provided via multer memory storage
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      // Use 'profile' field to match models/User.js
      payload.profile = {
        url: result.secure_url,
        public_id: result.public_id
      };
    }

    // Create and save user
    const user = new User(payload);
    await user.save();

    return res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('createUser error', err);
    // handle duplicate email error more gracefully
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Update an existing user (partial updates allowed)
 * Route: PUT /users/:id (example)
 * Expects multipart/form-data for profile if updating image
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = { ...req.body };

    // Prevent accidental lowering of password without hashing
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Normalize email if present
    if (updates.email) updates.email = updates.email.toLowerCase();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If a new image is uploaded, remove old one (if any) and upload new
    if (req.file) {
      // Delete old image from cloudinary if exists (checking 'profile' field)
      if (user.profile && user.profile.public_id) {
        try {
          await cloudinary.uploader.destroy(user.profile.public_id);
        } catch (e) {
          console.warn('Failed to delete previous Cloudinary image:', e.message || e);
          // don't fail the whole request if deletion fails; proceed
        }
      }

      // Upload new image
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      updates.profile = {
        url: result.secure_url,
        public_id: result.public_id
      };
    }

    // Apply updates and save
    Object.assign(user, updates);
    await user.save();

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('updateUser error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Delete a user and their Cloudinary image (if present)
 * Route: DELETE /users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Remove Cloudinary asset if exists (using 'profile' field)
    if (user.profile && user.profile.public_id) {
      try {
        await cloudinary.uploader.destroy(user.profile.public_id);
      } catch (e) {
        console.warn('Failed to delete Cloudinary image for user:', e.message || e);
        // proceed with deletion even if Cloudinary removal fails
      }
    }

    await User.deleteOne({ _id: userId });
    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Get a single user by id
 * Route: GET /users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password'); // don't send password
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('getUserById error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Get list of users (with optional query filters)
 * Route: GET /users
 */
exports.getAllUsers = async (req, res) => {
  try {
    // You can add paging, filtering in req.query as needed
    const users = await User.find().select('-password');
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('getAllUsers error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Change password (your existing logic preserved, with minor improvements)
 * Expects: { email, currentPassword, newPassword } in req.body
 */
exports.changePassword = async (req, res) => {
  console.log('CONTROLLER HIT. Body:', req.body); // See what Flutter is sending

  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check Current Password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log('Password Mismatch');
      // CHANGED FROM 401 TO 400 to avoid "Unauthorized" confusion
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash New Password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    console.log('Password updated successfully');
    return res.status(200).json({ message: 'Password updated successfully' });

  } catch (err) {
    console.error(' Server Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
