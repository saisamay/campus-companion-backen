// upload.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Configure Cloudinary with your keys (from cloudinary.com dashboard)
cloudinary.config({
  cloud_name: 'drlve3044',  // Replace with your actual cloud name
  api_key: '672112736192274',        // Replace with your actual API key
  api_secret: 'gAH7GKlxGTc506YQkHCUyMtnbuc'   // Replace with your actual API secret
});

// 2. Configure the Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'app-user-avatars', // The folder name in your Cloudinary account
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // optional: transform image to 500x500 automatically
    transformation: [{ width: 500, height: 500, crop: 'limit' }] 
  },
});

// 3. Initialize Multer
const upload = multer({ storage: storage });

module.exports = upload;