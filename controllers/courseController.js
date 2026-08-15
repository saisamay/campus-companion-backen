const Course = require('../models/Course');

// @desc    Add a new course (Admin)
// @route   POST /api/courses
const addCourse = async (req, res) => {
    try {
        // Added 'section' and 'facultyName' to the destructured variables
        const { courseName, courseCode, branch, semester, section, facultyName, color } = req.body;

        // Basic validation
        if (!courseName || !courseCode || !branch || !semester || !section || !color || !facultyName) {
            return res.status(400).json({ message: "Please fill all required fields (including Section & Faculty Name)" });
        }

        // Check if course code already exists FOR THIS SPECIFIC SECTION
        const existingCourse = await Course.findOne({ 
            courseCode, 
            branch, 
            semester, 
            section 
        });

        if (existingCourse) {
            return res.status(400).json({ message: `Course ${courseCode} already exists for ${branch} Sem-${semester} Sec-${section}` });
        }

        const newCourse = new Course({
            courseName,
            courseCode,
            branch,
            semester,
            section,      // <--- Saved
            facultyName,  // <--- Saved
            color
        });

        await newCourse.save();
        res.status(201).json({ message: "Course added successfully", course: newCourse });
    } catch (error) {
        console.error("Error adding course:", error);
        res.status(500).json({ message: "Server error while adding course" });
    }
};

// @desc    Get courses by Branch, Semester AND Section
// @route   GET /api/courses?branch=CSE&semester=5&section=A
const getCourses = async (req, res) => {
    try {
        const { branch, semester, section } = req.query;
        
        let query = {};
        if (branch) query.branch = branch;
        if (semester) query.semester = semester;
        if (section) query.section = section; // <--- Filter by section

        const courses = await Course.find(query).sort({ courseName: 1 });
        res.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ message: "Server error while fetching courses" });
    }
};

module.exports = {
    addCourse,
    getCourses
};