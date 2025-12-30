require('dotenv').config(); // Load env vars at the very top
const { development } = require('./config/config');
const app = require('./app');
const { connectDB } = require('./config/db');
const seedSubjects = require('./seeder/seeder'); // Import the seeder

// In Mongoose, we don't strictly need to import models here to sync them.
// They are registered automatically when used in routes/controllers.
// const { User, Category, Product } = require('./models'); 

const PORT = development.PORT || 5000;

// Database and server initialization
(async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    await seedSubjects();
    // 2. Start server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Optional: Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1); // Exit with error code
  }
})();