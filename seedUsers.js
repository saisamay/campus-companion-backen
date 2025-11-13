// seedUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const usersToInsert = [
  { name: 'Sai Samay', email: 'sai@example.com', password: 'pass123', branch: 'CSE', semester: 3, section: 'A', role: 'student' },
  { name: 'Ananya Kumar', email: 'ananya@example.com', password: 'ananya123', branch: 'ECE', semester: 2, section: 'B', role: 'student' },
  { name: 'Ravi Patel', email: 'ravi@example.com', password: 'ravi123', branch: 'MECH', semester: 4, section: 'C', role: 'classrep' },
  { name: 'Priya Singh', email: 'priya@example.com', password: 'priya123', branch: 'CSE', semester: 1, section: 'A', role: 'student' }
  // add more objects as needed
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB for seeding');

    for (const u of usersToInsert) {
      // skip if email exists (idempotent)
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`Skipping existing: ${u.email}`);
        continue;
      }

      const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
      const doc = new User({
        name: u.name,
        email: u.email.toLowerCase(),
        password: hashed,
        branch: u.branch,
        semester: u.semester,
        section: u.section,
        role: u.role || 'student'
      });

      await doc.save();
      console.log(`Inserted: ${u.email}`);
    }

    console.log('Seeding complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
