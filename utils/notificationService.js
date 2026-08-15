// Simple mock notification service to prevent crashes
const sendNotification = async (branch, semester, section, title, body) => {
  console.log(`\n[🔔 NOTIFICATION SENT]`);
  console.log(`To: ${branch} - S${semester} - Sec ${section}`);
  console.log(`Title: ${title}`);
  console.log(`Body: ${body}\n`);
  return true; 
};

module.exports = { sendNotification };