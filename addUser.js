// addUser.js
// Usage examples:
// 1) JSON arg (non-interactive):
//    node addUser.js '{"name":"Sai","email":"sai@example.com","password":"pass123","branch":"CSE","semester":3,"section":"A","role":"student"}'
//
// 2) Interactive prompts (run without args):
//    node addUser.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('./models/User');

const VALID_ROLES = ['student', 'classrep', 'teacher', 'admin'];

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function getInputFromPrompts() {
  const name = await prompt('Full name: ');
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');
  const branch = await prompt('Branch (optional): ');
  const semesterRaw = await prompt('Semester (number, optional): ');
  const section = await prompt('Section (optional): ');
  const roleRaw = await prompt(`Role (one of ${VALID_ROLES.join(', ')}): `);

  return {
    name, email, password,
    branch: branch || undefined,
    semester: semesterRaw ? Number(semesterRaw) : undefined,
    section: section || undefined,
    role: roleRaw || undefined
  };
}

function validateData(data) {
  if (!data.name) throw new Error('name is required');
  if (!data.email) throw new Error('email is required');
  if (!data.password) throw new Error('password is required');
  if (!data.role) throw new Error('role is required');
  const role = String(data.role).toLowerCase();
  if (!VALID_ROLES.includes(role)) throw new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
  if (data.semester !== undefined && (isNaN(data.semester) || data.semester <= 0)) {
    throw new Error('semester must be a positive number if provided');
  }
  return {
    name: String(data.name).trim(),
    email: String(data.email).trim().toLowerCase(),
    password: String(data.password),
    branch: data.branch ? String(data.branch).trim() : undefined,
    semester: data.semester !== undefined ? Number(data.semester) : undefined,
    section: data.section ? String(data.section).trim() : undefined,
    role
  };
}

async function addUser(data) {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const exists = await User.findOne({ email: data.email });
    if (exists) {
      console.error('✋ User with this email already exists:', data.email);
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const payload = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      branch: data.branch || '',
      semester: data.semester,
      section: data.section || '',
      role: data.role
    };

    const created = await User.create(payload);
    console.log('✅ User created successfully:');
    console.log({
      id: created._id.toString(),
      name: created.name,
      email: created.email,
      branch: created.branch,
      semester: created.semester,
      section: created.section,
      role: created.role
    });
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
        console.error('Invalid JSON argument. Example usage:');
        console.error("node addUser.js '{\"name\":\"Sai\",\"email\":\"sai@example.com\",\"password\":\"pass123\",\"branch\":\"CSE\",\"semester\":3,\"section\":\"A\",\"role\":\"student\"}'");
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

