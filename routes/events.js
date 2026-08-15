const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware } = require('../middleware/authMiddleware'); // Using your existing auth

// GET: Fetch all events (Public)
router.get('/', eventController.getAllEvents);

// POST: Add a new event (Protected)
router.post('/', authMiddleware, eventController.createEvent);

// PUT: Edit an existing event (Protected)
router.put('/:id', authMiddleware, eventController.updateEvent);

// DELETE: Remove an event (Protected)
router.delete('/:id', authMiddleware, eventController.deleteEvent);

module.exports = router;