const Event = require('../models/Event');

// @desc    Fetch all events
// @route   GET /api/events
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json({ events });
  } catch (error) {
    console.error("GET Events Error:", error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// @desc    Add a new event
// @route   POST /api/events
const createEvent = async (req, res) => {
  try {
    const { title, description, date, imageUrl, regulations, registrationLink } = req.body;
    
    const event = new Event({
      title,
      description,
      date: new Date(date),
      imageUrl,
      regulations,
      registrationLink
    });

    await event.save();
    res.status(201).json({ event, message: 'Event created' });
  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// @desc    Edit an existing event
// @route   PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const { title, description, date, imageUrl, regulations, registrationLink } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        date: new Date(date),
        imageUrl,
        regulations,
        registrationLink
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event, message: 'Event updated successfully' });
  } catch (error) {
    console.error("Update Event Error:", error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// @desc    Remove an event
// @route   DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error("Delete Event Error:", error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

module.exports = {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent
};