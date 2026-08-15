const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authMiddleware } = require('../middleware/authMiddleware'); 



router.post('/', authMiddleware, timetableController.addTimetable);

router.put('/', authMiddleware, timetableController.updateTimetable);

router.get('/', timetableController.getTimetable);

router.get('/me', authMiddleware, timetableController.getMyTimetable);

router.get('/teacher', authMiddleware, timetableController.getTeacherTimetable);

router.put('/slot', authMiddleware, timetableController.updateSlot);
module.exports = router;