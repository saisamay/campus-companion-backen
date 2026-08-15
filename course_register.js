const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- Database Connection ---
// Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/university_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected to "university_db"'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Mongoose Schemas & Models ---

// 1. Course Schema (The Admin Inputs)
const courseSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    courseCode: { type: String, required: true, unique: true },
    branch: { type: String, required: true }, // e.g., 'CSE', 'ECE'
    semester: { type: Number, required: true }, // e.g., 3, 5
    facultyName: { type: String },
    color: { type: String, required: true } // Hex code e.g., '#FF5733'
});

const Course = mongoose.model('Course', courseSchema);

// 2. Timetable Schema (For storing the final schedule)
const timetableSchema = new mongoose.Schema({
    branch: { type: String, required: true },
    semester: { type: Number, required: true },
    section: { type: String, default: 'A' },
    // Schedule is a matrix or object. 
    // Example structure: { "Monday": { "09:00": "CourseID", "10:00": "CourseID" } }
    schedule: { type: Object, required: true } 
});

// Compound index to ensure one timetable per branch/sem/section
timetableSchema.index({ branch: 1, semester: 1, section: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', timetableSchema);

// --- API Routes ---

/**
 * @route   POST /api/courses
 * @desc    Admin adds a new course with a color code
 */
app.post('/api/courses', async (req, res) => {
    try {
        const { courseName, courseCode, branch, semester, facultyName, color } = req.body;

        // basic validation
        if (!courseName || !branch || !semester || !color) {
            return res.status(400).json({ message: "Please fill all required fields" });
        }

        const newCourse = new Course({
            courseName,
            courseCode,
            branch,
            semester,
            facultyName,
            color
        });

        await newCourse.save();
        res.status(201).json({ message: "Course added successfully", course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error adding course" });
    }
});

/**
 * @route   GET /api/courses
 * @desc    Fetch courses. 
 * Usage: /api/courses?branch=CSE&semester=3
 * This is CRITICAL for your UI. When you click a slot, you call this 
 * to get only the relevant courses to populate the dropdown.
 */
app.get('/api/courses', async (req, res) => {
    try {
        const { branch, semester } = req.query;
        
        let query = {};
        if (branch) query.branch = branch;
        if (semester) query.semester = semester;

        const courses = await Course.find(query);
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching courses" });
    }
});

/**
 * @route   POST /api/timetable
 * @desc    Save or Update a Timetable
 */
app.post('/api/timetable', async (req, res) => {
    try {
        const { branch, semester, section, schedule } = req.body;

        // Upsert: Update if exists, Insert if new
        const updatedTimetable = await Timetable.findOneAndUpdate(
            { branch, semester, section },
            { schedule },
            { new: true, upsert: true } // upsert creates it if it doesn't exist
        );

        res.json({ message: "Timetable saved successfully", timetable: updatedTimetable });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving timetable" });
    }
});

/**
 * @route   GET /api/timetable
 * @desc    Get existing timetable for editing
 */
app.get('/api/timetable', async (req, res) => {
    try {
        const { branch, semester, section } = req.query;
        const timetable = await Timetable.findOne({ branch, semester, section });
        
        if (!timetable) {
            return res.status(404).json({ message: "No timetable found" });
        }
        res.json(timetable);
    } catch (error) {
        res.status(500).json({ message: "Error fetching timetable" });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});