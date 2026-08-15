// backend/models/User.js
const mongoose = require('mongoose');

// Define the structure of your User document
const ProfileImageSchema = new mongoose.Schema({
  url: { type: String, default: null },
  public_id: { type: String, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    unique: true,
    uppercase: true,
    sparse: true // Allows multiple users to have null/missing rollNo
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  branch: {
    type: String
  },
  semester: {
    type: String
  },
  section: {
    type: String
  },
  role: {
    type: String,
    enum: ['student', 'classrep', 'teacher', 'admin', 'staff'],
    default: 'student'
  },
  
  // --- NEW FIELDS FOR TEACHER ---
  cabinRoom: {
    type: String,
    default: '' 
  },
  availability: {
    type: Boolean,
    default: true
  },
  // ------------------------------

  dob: {
    type: Date,
    required: true
  },

  profile: {
    type: ProfileImageSchema,
    default: () => ({ url: null, public_id: null })
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;