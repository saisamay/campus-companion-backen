const express = require('express');
const router = express.Router();
const { getClassroomStatus } = require('../controllers/classroomController');
// FIX: Import 'authMiddleware' instead of 'protect'
const { authMiddleware } = require('../middleware/authMiddleware'); 

// FIX: Use 'authMiddleware' here
router.get('/status', authMiddleware, getClassroomStatus);

module.exports = router;