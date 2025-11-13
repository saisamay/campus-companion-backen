// seedTimetables.js
require('dotenv').config();
const mongoose = require('mongoose');
const Timetable = require('./models/Timetable');

const sample = {
  semester: 'S5',
  branch: 'CSE',
  section: 'B',
  grid: [
    { dayName: 'Mon', slots: [
        { title: 'CHR', subtitle: 'Counsellor Hour', color: '#A30328' },
        { title: '23CSE303', subtitle: 'Theory of Computation', color: '#FFB85C' },
        { title: '23CSE311', subtitle: 'Software Engineering', color: '#00CC00' },
        { title: '23ENV300', subtitle: '', color: '#FF3300' },
        { title: 'Lunch Break', subtitle: '', color: '#FF8533' },
        { title: '23CSE301', subtitle: 'Machine Learning Lab', color: '#CCFF33' },
        { title: '23CSE301', subtitle: 'Machine Learning Lab', color: '#CCFF33' },
        { title: '', subtitle: '', color: '#FFFFFFFF' },
        { title: '', subtitle: '', color: '#FFFFFFFF' },
      ]},
    { dayName: 'Tue', slots: [
        { title: 'CIR-23LSE301', subtitle: 'Verbal Skills', color: '#FF9966' },
        { title: 'CIR-23LSE301', subtitle: 'Aptitude Skills', color: '#FF9966' },
        { title: '23CSE301', subtitle: 'Machine Learning', color: '#CCFF33' },
        { title: 'Lunch BreaK', subtitle: '', color: '#FF8533' },
        { title: '23CSE303', subtitle: 'Theory of Computation', color: '#FFB85C' },
        { title: 'PE-II', subtitle: 'Elective', color: '#FFFF4D' },
        { title: '23CSE311', subtitle: 'Software Engineering', color: '#00CC00' },
        { title: '23CSE302', subtitle: 'Computer Networks', color: '#99CCFF' },
        { title: 'Tutorial Hr', subtitle: '', color: '#FFFFFFFF' },
      ]},
    { dayName: 'Wed', slots: [
        { title: '23CSE302', subtitle: 'Computer Networks', color: '#99CCFF' },
        { title: '23CSE301', subtitle: 'Machine Learning Lab', color: '#CCFF33' },
        { title: '23CSE473', subtitle: 'Neural Networks-DL', color: '#FF66CC' },
        { title: 'Lunch BreaK', subtitle: '', color: '#FF8533' },
        { title: '23CSE303', subtitle: 'Theory of Computation', color: '#FFB85C' },
        { title: 'CIR-23LSE301', subtitle: 'Soft Skills', color: '#FF9966' },
        { title: '23CSE302', subtitle: 'Computer Networks-Lab', color: '#99CCFF' },
        { title: '23CSE302', subtitle: 'Computer Networks-Lab', color: '#99CCFF' },
        { title: '23ENV300', subtitle: '', color: '#FF3300' },
      ]},
    { dayName: 'Thu', slots: [
        { title: 'PE-II', subtitle: 'Elective', color: '#FFFF4D' },
        { title: '23CSE473', subtitle: 'Neural Networks-DL', color: '#FF66CC' },
        { title: '23CSE301', subtitle: 'Machine Learning', color: '#CCFF33' },
        { title: 'Lunch Break', subtitle: '', color: '#FF8533' },
        { title: '23CSE302', subtitle: 'Computer Networks', color: '#99CCFF' },
        { title: 'CIR-23LSE301', subtitle: 'Code HR', color: '#FF9966' },
        { title: '', subtitle: '', color: '#FFFFFFFF' },
        { title: '23CSE311', subtitle: 'Software Engineering-Lab', color: '#00CC00' },
        { title: '23CSE311', subtitle: 'Software Engineering-Lab', color: '#00CC00' },
      ]},
    { dayName: 'Fri', slots: [
        { title: '23CSE311', subtitle: 'Software Engineering', color: '#00CC00' },
        { title: '23CSE302', subtitle: 'Computer Networks', color: '#99CCFF' },
        { title: '23CSE473', subtitle: 'Neural Networks-DL', color: '#FF66CC' },
        { title: '', subtitle: '', color: '#FFFFFFFF' },
        { title: 'Lunch Break', subtitle: '', color: '#FF8533' },
        { title: 'PE-II', subtitle: 'Elective', color: '#FFFF4D' },
        { title: '23CSE303', subtitle: 'Theory of Computation', color: '#FFB85C' },
        { title: '', subtitle: '', color: '#FFFFFFFF' },
        { title: 'PE-II', subtitle: 'Elective', color: '#FFFF4D' },
      ]},
    // Tue, Wed, Thu, Fri (similar structure) ...
    // Make sure to include 5 day objects and each slots array length 9
  ]
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected', mongoose.connection.name);
    // adjust sample to include all days; here we just insert sample for demonstration
    await Timetable.findOneAndUpdate(
      { semester: sample.semester, branch: sample.branch, section: sample.section },
      { $set: sample },
      { upsert: true, new: true }
    );
    console.log('Seeded sample timetable');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e); process.exit(1);
  }
})();
