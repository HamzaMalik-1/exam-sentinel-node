const mongoose = require('mongoose');
const config = require('./config');

// Extract config vars
const { database, username, password, host, port } = config.development;

// Construct MongoDB Connection URI
// If you are using local without auth, it handles that. 
// If using Atlas/Remote with auth, it handles that too.
const buildMongoURI = () => {
  if (username && password) {
    return `mongodb://${username}:${password}@${host}:${port || 27017}/${database}?authSource=admin`;
  }
  return `mongodb://${host}:${port || 27017}/${database}`;
};

const connectDB = async () => {
  try {
    const uri = buildMongoURI();
    
    // Mongoose 6+ always behaves as if useNewUrlParser, useUnifiedTopology are true
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Unable to connect to MongoDB:', error.message);
    process.exit(1); // Exit process with failure
  }
};

// Unlike MySQL, MongoDB does not require a "createDatabase" step.
// The database is created automatically when you insert the first record.

module.exports = { connectDB, mongoose };