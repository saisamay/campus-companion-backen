const mongoose = require('mongoose');

// The Slot Schema (Nested inside Timetable)
const slotSchema = new mongoose.Schema({
  // Core Course Info (Populated from the Course selected by Admin)
  courseCode: { type: String, default: '' },      // e.g. "MAT101" - Displayed in the grid
  courseName: { type: String, default: '' },      // e.g. "Mathematics" - For details
  facultyName: { type: String, default: '' },     // e.g. "Dr. Smith" - For pop-up details
  facultyImage: { type: String, default: '' }, // <--- Added
  facultyDept: { type: String, default: '' },
  color: { type: String, default: '#FFFFFFFF' },  // Course color
  
  // Slot Specifics
  type: { type: String, enum: ['Theory', 'Lab', ''], default: '' }, // <--- NEW: Admin selects this
  room: { type: String, default: '' },            // Default room number
  
  // Time/Position
  startSlot: { type: Number, default: null },     // e.g. 1 (9:00 AM)
  endSlot: { type: Number, default: null },       // e.g. 1 (9:50 AM)

  // Status Flags (For ClassRep/Teacher actions)
  isCancelled: { type: Boolean, default: false }, // <--- NEW: If true, show "Class Cancelled"
  newRoom: { type: String, default: null },       // <--- NEW: If set, show "Room Changed to X"
  
}, { _id: false });

// Each day contains an array of slots (0-8 for 9am-5pm)
const daySchema = new mongoose.Schema({
  dayName: { type: String, enum: ['Mon','Tue','Wed','Thu','Fri'], required: true },
  slots: { type: [slotSchema], default: [] } 
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  semester: { type: String, required: true }, // e.g. "5"
  branch: { type: String, required: true },   // e.g. "CSE"
  section: { type: String, required: true },  // e.g. "A"
  
  // The 5x9 Grid
  grid: { type: [daySchema], default: [] },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one timetable per class section
timetableSchema.index({ semester: 1, branch: 1, section: 1 }, { unique: true });

timetableSchema.pre('save', function(next){
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Timetable', timetableSchema);