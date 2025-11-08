// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// routes
app.use('/api/auth', authRoutes);

// basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// health route — add this to app.js
app.get('/', (req, res) => {
  res.send('🚀 College Companion Backend Running...');
});

// small JSON health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'dev', time: new Date().toISOString() });
});

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`Server listening on port ${port}`));
