// checkUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    console.log('MONGO_URI used:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected. mongoose.db =', mongoose.connection.name);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in DB:', collections.map(c => c.name));

    const users = await User.find().limit(20).lean();
    console.log('Users found by Mongoose model (count):', users.length);
    console.log(users);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
