const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// POST /api/courses - Add a new course
router.post('/', courseController.addCourse);

// GET /api/courses - Get courses (filtered by branch/semester/section)
router.get('/', courseController.getCourses);
router.delete('/:id', courseController.deleteCourse);
module.exports = router;