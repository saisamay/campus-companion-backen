// addUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const cloudinary = require('./utils/cloudinary'); 
const User = require('./models/User');

const VALID_ROLES = ['student', 'classrep', 'teacher', 'admin', 'staff'];

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function getInputFromPrompts() {
  const name = await prompt('Full name: ');
  const email = await prompt('Email: ');
  
  const Rollno = await prompt('Rollno (leave empty if none): ');
  
  const password = await prompt('Password: ');
  const branch = await prompt('Branch (optional): ');
  const semesterRaw = await prompt('Semester (number, optional): ');
  const section = await prompt('Section (optional): ');
  const dob = await prompt('Date of Birth (YYYY-MM-DD or ISO): ');
  
  const roleRaw = await prompt(`Role (one of ${VALID_ROLES.join(', ')}): `);
  
  // --- NEW: Teacher specific prompts ---
  let cabinRoom = undefined;
  // Availability prompt REMOVED
  
  if (roleRaw.toLowerCase() === 'teacher') {
    cabinRoom = await prompt('Cabin Room Number: ');
  }
  // -------------------------------------

  const profilePath = await prompt('Local image path for profile (required): ');

  return {
    name, email, password, dob, profilePath,
    Rollno: Rollno || undefined,
    branch: branch || undefined,
    semester: semesterRaw ? Number(semesterRaw) : undefined,
    section: section || undefined,
    role: roleRaw || undefined,
    cabinRoom
  };
}

function validateData(data) {
  if (!data.name) throw new Error('name is required');
  if (!data.email) throw new Error('email is required');
  if (!data.password) throw new Error('password is required');
  if (!data.role) throw new Error('role is required');
  if (!data.dob) throw new Error('DOB is required');
  if (!data.profilePath) throw new Error('profilePath (local image file path) is required');

  const role = String(data.role).toLowerCase();
  if (!VALID_ROLES.includes(role)) throw new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);

  if (data.semester !== undefined && (isNaN(data.semester) || data.semester <= 0)) {
    throw new Error('semester must be a positive number if provided');
  }

  const dobObj = new Date(String(data.dob).trim());
  if (Number.isNaN(dobObj.getTime())) {
    throw new Error('dob is invalid. Use YYYY-MM-DD or an ISO date string');
  }

  const resolved = path.resolve(String(data.profilePath));
  if (!fs.existsSync(resolved)) {
    throw new Error(`profilePath file does not exist: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`profilePath is not a file: ${resolved}`);
  }

  return {
    name: String(data.name).trim(),
    email: String(data.email).trim().toLowerCase(),
    password: String(data.password),
    dob: dobObj,
    Rollno: data.Rollno ? String(data.Rollno).trim() : null, 
    branch: data.branch ? String(data.branch).trim() : null,
    semester: data.semester !== undefined ? Number(data.semester) : null,
    section: data.section ? String(data.section).trim() : null,
    role,
    profilePath: resolved,
    // Teacher fields
    cabinRoom: data.cabinRoom ? String(data.cabinRoom).trim() : ''
    // availability is not passed here
  };
}

async function uploadLocalImageToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: 'profiles',
    transformation: [{ width: 400, height: 400, crop: "thumb", gravity: "face" }]
  });
  return result;
}

async function addUser(data) {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in .env');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const exists = await User.findOne({ email: data.email });
    if (exists) {
      console.error('✋ User with this email already exists:', data.email);
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    console.log('Uploading image...');
    const uploadResult = await uploadLocalImageToCloudinary(data.profilePath);

    const payload = {
      name: data.name,
      email: data.email,
      rollNo: data.Rollno, 
      password: hashedPassword,
      branch: data.branch,
      semester: data.semester,
      section: data.section,
      role: data.role,
      dob: data.dob,
      // Teacher specific
      cabinRoom: data.role === 'teacher' ? data.cabinRoom : '',
      // No availability here, backend defaults to true
      
      profile: {
        url: uploadResult.secure_url || null,
        public_id: uploadResult.public_id || null
      }
    };

    const created = await User.create(payload);
    console.log('✅ User created successfully:');
    console.log({
      id: created._id.toString(),
      name: created.name,
      email: created.email,
      role: created.role,
      cabinRoom: created.cabinRoom, // Verify it was set
      availability: created.availability // Verify default
    });
  } catch (e) {
    console.error("Failed to create user:", e.message);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  try {
    let data;
    const arg = process.argv[2];
    if (arg) {
      try {
        data = JSON.parse(arg);
      } catch (e) {
        console.error('Invalid JSON argument.');
        process.exit(1);
      }
    } else {
      console.log('No JSON argument detected — entering interactive mode.');
      data = await getInputFromPrompts();
    }

    const clean = validateData(data);
    await addUser(clean);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();