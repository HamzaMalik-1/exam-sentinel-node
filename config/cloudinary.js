const cloudinary = require('cloudinary').v2;
const {development}=require('./config')
const {cloudinaryCloudName,cloudinaryApiKey,cloudinaryApiSecret}=development

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key:    cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
});

module.exports = cloudinary;
