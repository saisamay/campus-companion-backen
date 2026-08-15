// backend/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const cloudinary = require('../utils/cloudinary');

// Helper to sanitize empty strings to null for sparse indexes
// This prevents E11000 duplicate key errors for unique fields like rollNo
const sanitizePayload = (data) => {
  if (data.rollNo === "") data.rollNo = null;
  if (data.branch === "") data.branch = null;
  if (data.semester === "") data.semester = null;
  if (data.section === "") data.section = null;
  if (data.cabinRoom === "") data.cabinRoom = null;
  return data;
};

// 1. Create User
exports.createUser = async (req, res) => {
  try {
    console.log("📝 Create User Request Received");
    
    let payload = { ...req.body };

    // Normalize email
    if (payload.email) payload.email = payload.email.toLowerCase().trim();

    // Sanitize fields
    payload = sanitizePayload(payload);

    // Hash password
    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(payload.password, salt);
    }

    // Map Cloudinary Result (from middleware) to Database Profile
    if (req.file) {
      console.log("✅ File uploaded to Cloudinary:", req.file.path);
      payload.profile = {
        url: req.file.path,       
        public_id: req.file.filename 
      };
    } else {
      console.log("⚠️ No file attached");
    }

    const user = new User(payload);
    await user.save();

    console.log("✅ User Saved Successfully");
    return res.status(201).json({ success: true, user });

  } catch (err) {
    console.error('❌ createUser error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ success: false, message: `Duplicate value for field: ${field}` });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 2. Search Faculty (Used for Autocomplete)
exports.searchFaculty = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) return res.json([]);

    // Regex search for "related names" (autocomplete behavior)
    const teachers = await User.find({
      role: 'teacher',
      name: { $regex: search, $options: 'i' } 
    }).select('name email branch profile cabinRoom availability _id').limit(20);

    const result = teachers.map(t => ({
      id: t._id,
      name: t.name,
      dept: t.branch || 'General',
      image: (t.profile && t.profile.url) ? t.profile.url : null,
      cabinRoom: t.cabinRoom || 'Not Assigned',
      availability: t.availability === true // Ensure boolean
    }));

    res.json(result);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Search Users (General Admin Search)
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        }).select('-password').limit(10);

        res.json(users);
    } catch (error) {
        console.error("User Search Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Change Password
exports.changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// 5. Update User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📝 Update User Request for ID: ${id}`);
        
        let updates = { ...req.body };
        
        // Sanitize payload
        updates = sanitizePayload(updates);

        // Handle Password Update
        if (updates.password && updates.password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        } else {
            delete updates.password; 
        }

        // Handle Profile Image Update
        if (req.file) {
            const oldUser = await User.findById(id);
            if (oldUser && oldUser.profile && oldUser.profile.public_id) {
                await cloudinary.uploader.destroy(oldUser.profile.public_id).catch(e => console.log(e));
            }
            updates.profile = {
                url: req.file.path,
                public_id: req.file.filename
            };
        }

        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        console.log("✅ User Updated:", updatedUser.name);
        res.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("❌ Update User Error:", error);
        if (error.code === 11000) {
             const field = Object.keys(error.keyPattern)[0];
             return res.status(400).json({ message: `Duplicate value for field: ${field}` });
        }
        res.status(500).json({ message: "Update failed: " + error.message });
    }
};

// 6. Delete User
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id); 
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.profile && user.profile.public_id) {
         await cloudinary.uploader.destroy(user.profile.public_id).catch(e => console.log(e));
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Get User By ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({success: false, message: "User not found"});
        res.json({ success: true, user });
    } catch(err) {
        res.status(500).json({success:false, error: err.message});
    }
};

// 8. Get All Users
exports.getAllUsers = async (req, res) => {
    const users = await User.find();
    res.json({ success: true, users });
};