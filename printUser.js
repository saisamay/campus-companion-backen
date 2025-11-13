// printUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = 'sai@example.com';
    const u = await User.findOne({ email: email.toLowerCase() }).lean();
    console.log('Queried by lowercase email:', email.toLowerCase(), 'found:', !!u);
    if (u) {
      console.log('User doc (partial):', {
        _id: u._id,
        email: u.email,
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
