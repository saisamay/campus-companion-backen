const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    courseCode: { type: String, required: true },
    branch: { type: String, required: true },
    semester: { type: String, required: true }, 
    section: { type: String, required: true },
    
    // Faculty Details
    facultyName: { type: String, required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to User
    facultyImage: { type: String, default: '' }, // Snapshot of profile URL
    facultyDept: { type: String, default: '' },  // e.g. "CSE"

    color: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

courseSchema.index({ courseCode: 1, branch: 1, semester: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);