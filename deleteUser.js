// deleteUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const cloudinary = require('./utils/cloudinary'); // Import Cloudinary utils
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
    console.log('Found user:', { id: user._id.toString(), email: user.email, name: user.name, role: user.role });

    if (!force) {
      const ok = await confirmPrompt('Are you sure you want to PERMANENTLY delete this user? Type yes to confirm: ');
      if (!ok) {
        console.log('Aborted by user.');
        return;
      }
    }

    // NEW: Cleanup Cloudinary Image
    if (user.profile && user.profile.public_id) {
      console.log(`Deleting Cloudinary image: ${user.profile.public_id}`);
      try {
        await cloudinary.uploader.destroy(user.profile.public_id);
        console.log('Image deleted.');
      } catch (e) {
        console.error('Failed to delete image from Cloudinary:', e.message);
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
    const force = !!obj.force; 
    await deleteUser(filter, force);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();