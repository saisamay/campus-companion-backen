// showLocation.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    console.log('Using MONGO_URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB name (mongoose):', mongoose.connection.name);

    // model-backed collection name
    console.log('Mongoose model User collection name:', User.collection.name);

    // list all collections in the current DB
    const cols = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in this DB:', cols.map(c => c.name));

    // show up to 5 docs from the User collection (if any)
    const docs = await mongoose.connection.db.collection(User.collection.name).find({}).limit(5).toArray();
    console.log(`Documents found in '${User.collection.name}':`, docs.length);
    if (docs.length) console.log(docs);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
