// comparePassword.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB:', mongoose.connection.name);

    const email = 'sai@example.com';
    const plain = 'pass123';

    const u = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!u) {
      console.log('User not found for', email);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('User found. stored password prefix:', u.password ? u.password.slice(0, 20) + '...' : '(no password)');
    const ok = await bcrypt.compare(plain, u.password);
    console.log('bcrypt.compare result for plain "', plain, '":', ok);

    await mongoose.disconnect();
    process.exit(ok ? 0 : 2);
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  }
})();
