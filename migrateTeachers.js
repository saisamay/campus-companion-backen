// backend/migrateTeachers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to DB');

    // Find all teachers who DON'T have a cabinRoom field yet
    const result = await User.updateMany(
      { role: 'teacher', cabinRoom: { $exists: false } },
      { 
        $set: { 
          cabinRoom: '',       // Default empty string
          availability: true   // Default to Available
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} teachers with default cabin/availability.`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();