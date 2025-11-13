// deleteUser.js
// Usage examples:
// node deleteUser.js '{"email":"sai@example.com"}'
// node deleteUser.js '{"id":"690cf5bd5cfbff1886f6733f"}'

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('./models/User');

async function confirmPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
    });
  });
}

async function deleteUser(filter, force = false) {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (!filter || (!filter.email && !filter.id)) throw new Error('Provide filter with either email or id');
    const query = filter.id ? { _id: filter.id } : { email: String(filter.email).toLowerCase() };

    const user = await User.findOne(query).lean();
    if (!user) {
      console.log('No user found for filter:', query);
      return;
    }
    console.log('Found user:', { id: user._id.toString(), email: user.email, name: user.name });

    if (!force) {
      const ok = await confirmPrompt('Are you sure you want to PERMANENTLY delete this user? Type yes to confirm: ');
      if (!ok) {
        console.log('Aborted by user.');
        return;
      }
    }

    const res = await User.deleteOne(query);
    console.log('Delete result:', res);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  try {
    const arg = process.argv[2];
    if (!arg) {
      console.error('Usage: node deleteUser.js \'{"email":"sai@example.com"}\'');
      process.exit(1);
    }
    const obj = JSON.parse(arg);
    const filter = {};
    if (obj.email) filter.email = obj.email;
    if (obj.id) filter.id = obj.id;
    const force = !!obj.force; // if you pass {"email":"...","force":true} it will skip prompt
    await deleteUser(filter, force);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
