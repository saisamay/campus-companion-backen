// printUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = 'am.sc.u4cse23153@am.students.amrita.edu';
    const u = await User.findOne({ email: email.toLowerCase() }).lean();
    console.log('Queried by lowercase email:', email.toLowerCase(), 'found:', !!u);
    if (u) {
      console.log('User doc (partial):', {
        _id: u._id,
        email: u.email,
        roll: u.rollNo,
        name: u.name,
        role: u.role,
        password_preview: u.password ? u.password.slice(0, 60) : '(no password)'
      });
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
