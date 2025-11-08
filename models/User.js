// models/User.js
const mongoose = require('mongoose');

// Define the structure of your User document
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,        // ensures no duplicate emails
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true       // will store the hashed password
  },
  branch: {
    type: String
  },
  semester: {
    type: Number
  },
  section: {
    type: String
  },
  role: {
    type: String,
    enum: ['student', 'classrep', 'teacher', 'admin'],
    default: 'student'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const User = mongoose.model('User', userSchema);

// Export the model so other files can use it
module.exports = mongoose.model('User', userSchema);
