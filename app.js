// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express(); // <-- app created immediately

// basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// connect to mongo
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Mongo connected:', mongoose.connection.name))
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });

// require routes AFTER app is created
const authRoutes = require('./routes/auth');           // these modules MUST NOT require('../app')
let timetableRoutes;
try {
  timetableRoutes = require('./routes/timetable');
} catch (e) {
  console.log('No timetable route loaded or it has error:', e.message);
}

// register routes
app.use('/api/auth', authRoutes);
if (timetableRoutes) app.use('/api/timetable', timetableRoutes);

// health-check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on http://0.0.0.0:${PORT}`));

