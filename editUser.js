// editUser.js
// Usage examples:
// node editUser.js '{"email":"sai@example.com","updates":{"name":"Sai Updated","semester":4}}'
// node editUser.js '{"id":"690cf5bd5cfbff1886f6733f","updates":{"password":"newpass","role":"classrep"}}'

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function editUser(filter, updates) {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (!filter || (!filter.email && !filter.id)) {
      throw new Error('Provide filter with either email or id');
    }
    // find user
    let query = {};
    if (filter.id) query._id = filter.id;
    else if (filter.email) query.email = String(filter.email).toLowerCase();

    const user = await User.findOne(query);
    if (!user) {
      throw new Error('No user found matching filter');
    }

    // If password provided, hash it
    if (updates.password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
      const hash = await bcrypt.hash(String(updates.password), saltRounds);
      updates.password = hash;
    }

    // sanitize allowed fields to update
    const allowed = ['name','password','branch','semester','section','role','email'];
    const payload = {};
    for (const k of Object.keys(updates)) {
      if (allowed.includes(k)) {
        // if email is updated, normalize to lowercase
        payload[k] = k === 'email' ? String(updates[k]).toLowerCase() : updates[k];
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('No valid fields to update');
    }

    const updated = await User.findOneAndUpdate(query, { $set: payload }, { new: true }).select('-password').lean();
    console.log('User updated:', updated);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  try {
    const arg = process.argv[2];
    if (!arg) {
      console.error('Usage: node editUser.js \'{"email":"sai@example.com","updates":{"name":"New"}}\'');
      process.exit(1);
    }
    const obj = JSON.parse(arg);
    const filter = {};
    if (obj.email) filter.email = obj.email;
    if (obj.id) filter.id = obj.id;
    const updates = obj.updates || {};
    await editUser(filter, updates);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
