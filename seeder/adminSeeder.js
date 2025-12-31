const User = require("../models/User");

const adminUser = {
  firstName: "Super",
  lastName: "Admin",
  email: "admin@examsentinel.com",
  password: "admin123", // Will be hashed automatically by your User model
  role: "admin",
};

const seedAdmin = async () => {
  try {
    // 1. Check if an admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });

    if (!existingAdmin) {
      // 2. Create Admin (Triggers the pre-save hook for hashing)
      await User.create(adminUser);
      console.log("✅ Admin account created successfully!");
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: ${adminUser.password}`);
    } else {
      console.log("ℹ️ Admin account already exists, skipping seed.");
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
  }
};

module.exports = seedAdmin;