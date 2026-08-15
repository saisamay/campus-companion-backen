const Course = require('../models/Course');

// @desc    Add a new course (Admin)
// @route   POST /api/courses
const addCourse = async (req, res) => {
    try {
        const { courseName, courseCode, branch, semester, section, facultyName, color } = req.body;

        // Basic validation
        if (!courseName || !courseCode || !branch || !semester || !section || !color || !facultyName) {
            return res.status(400).json({ message: "Please fill all required fields (including Section & Faculty Name)" });
        }

        // Check if course code already exists FOR THIS SPECIFIC SECTION
        

        

        const newCourse = new Course({
            courseName,
            courseCode,
            branch,
            semester,
            section,      
            facultyName,  
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
// @route   GET /api/courses
const getCourses = async (req, res) => {
    try {
        const { branch, semester, section } = req.query;
        
        let query = {};
        if (branch) query.branch = branch;
        if (semester) query.semester = semester;
        if (section) query.section = section; 

        const courses = await Course.find(query).sort({ courseName: 1 });
        res.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ message: "Server error while fetching courses" });
    }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
    try {
        // 👇 2. USE req.params.id (NOT just 'id')
        const course = await Course.findByIdAndDelete(req.params.id); 
        
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Export all functions together
module.exports = {
    addCourse,
    getCourses,
    deleteCourse
};