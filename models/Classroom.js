const mongoose = require('mongoose');

// Ensure this schema matches the fields in your existing 'classrooms' collection
const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "N-305"
  capacity: { type: Number },
  type: { type: String }, // 'Class', 'Lab', etc.
  block: { type: String },
  // Note: We do NOT store 'isOccupied' here. That is calculated dynamically.
});

// 'classrooms' is the name of your existing collection
module.exports = mongoose.model('Classroom', classroomSchema, 'classrooms');