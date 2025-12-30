require('dotenv').config();

module.exports = {
  development: {
    PORT: process.env.PORT || 5000, // Common default for Node/Express
    
    // --- MongoDB Configuration ---
    username: process.env.DB_USER || '', // Local MongoDB often doesn't need a user
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exam_portal_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 27017, // Default MongoDB port
    dialect: 'mongodb',

    // --- Third Party Services ---
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    sendGridUsername: process.env.SENDGRID_USERNAME || 'apikey',
    email: process.env.SENDER_EMAIL || 'your_verified_sender@example.com',
    
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  production: {
    // In production, you might just use a single MONGO_URI string
    PORT: process.env.PORT || 5000,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mongodb',
    // ... other keys
  }
};