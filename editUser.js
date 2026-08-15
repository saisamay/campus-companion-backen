// editUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cloudinary = require('./utils/cloudinary');
const User = require('./models/User');

async function uploadLocalImageToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: 'profiles',
    transformation: [{ width: 400, height: 400, crop: "thumb", gravity: "face" }]
  });
  return result;
}

async function editUser(filter, updates) {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (!filter || (!filter.email && !filter.id)) {
      throw new Error('Provide filter with either email or id');
    }
    // find user
    let query = {};
    if (filter.id) query._id = filter.id;
    else if (filter.email) query.email = String(filter.email).toLowerCase();

    const user = await User.findOne(query);
    if (!user) {
      throw new Error('No user found matching filter');
    }

    // If password provided, hash it
    if (updates.password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
      const hash = await bcrypt.hash(String(updates.password), saltRounds);
      updates.password = hash;
    }

    // If profilePath provided, validate, upload, and prepare payload entry
    let profilePayload = null;
    if (updates.profilePath) {
      const resolved = path.resolve(String(updates.profilePath));
      if (!fs.existsSync(resolved)) {
        throw new Error(`profilePath file does not exist: ${resolved}`);
      }
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        throw new Error(`profilePath is not a file: ${resolved}`);
      }

      // Upload new image
      const uploadResult = await uploadLocalImageToCloudinary(resolved);
      profilePayload = {
        url: uploadResult.secure_url || null,
        public_id: uploadResult.public_id || null
      };

      // Delete old Cloudinary image if any (best-effort)
      if (user.profile && user.profile.public_id) {
        try {
          await cloudinary.uploader.destroy(user.profile.public_id);
        } catch (e) {
          console.warn('Failed to delete previous Cloudinary image:', e.message || e);
        }
      }
    }

    // sanitize allowed fields to update
    // Added 'cabinRoom' and 'availability' here
    const allowed = [
        'name', 'password', 'branch', 'semester', 'section', 
        'role', 'email', 'rollNo', 'dob', 'cabinRoom', 'availability'
    ];
    
    const payload = {};
    for (const k of Object.keys(updates)) {
      if (allowed.includes(k)) {
        // if email is updated, normalize to lowercase
        if (k === 'email') {
          payload[k] = String(updates[k]).toLowerCase();
        } 
        else if (k === 'dob') {
          payload[k] = new Date(updates[k]);
          if (isNaN(payload[k])) throw new Error('Invalid DOB format. Use YYYY-MM-DD');
        }
        else if (k === 'rollNo') {
          // FIX: Empty rollNo must be null
          payload[k] = (updates[k] === "" || updates[k] === null) ? null : updates[k];
        }
        else {
          payload[k] = updates[k];
        }
      }
    }

    // Attach profile payload if present
    if (profilePayload) {
      payload.profile = profilePayload;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('No valid fields to update');
    }

    const updated = await User.findOneAndUpdate(query, { $set: payload }, { new: true, runValidators: true }).select('-password').lean();
    console.log('User updated:', updated);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  try {
    const arg = process.argv[2];
    if (!arg) {
      console.error('Usage: node editUser.js \'{"email":"sai@example.com","updates":{"name":"New", "cabinRoom":"S101"}}\'');
      process.exit(1);
    }
    const obj = JSON.parse(arg);
    const filter = {};
    if (obj.email) filter.email = obj.email;
    if (obj.id) filter.id = obj.id;
    const updates = obj.updates || {};
    await editUser(filter, updates);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();