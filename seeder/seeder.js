const Subject = require("../models/Subject");

// Common Degree Subjects in Pakistani Universities
const subjects = [
  { id: 1, name: "Computer Science (CS)" },
  { id: 2, name: "Software Engineering (SE)" },
  { id: 3, name: "Information Technology (IT)" },
  { id: 4, name: "Business Administration (BBA)" },
  { id: 5, name: "Electrical Engineering" },
  { id: 6, name: "Mechanical Engineering" },
  { id: 7, name: "Civil Engineering" },
  { id: 8, name: "Accounting & Finance" },
  { id: 9, name: "Psychology" },
  { id: 10, name: "English Literature" },
  { id: 11, name: "Mathematics" },
  { id: 12, name: "Physics" },
  { id: 13, name: "Chemistry" },
  { id: 14, name: "Economics" },
  { id: 15, name: "Mass Communication" },
  { id: 16, name: "International Relations (IR)" },
  { id: 17, name: "Law (LLB)" },
  { id: 18, name: "Data Science" },
  { id: 19, name: "Artificial Intelligence (AI)" },
  { id: 20, name: "Medical (MBBS/BDS)" }
];

const seedSubjects = async () => {
  try {
    // 1. Check if any subjects already exist
    const count = await Subject.countDocuments();

    if (count === 0) {
      // 2. Insert data if collection is empty
      await Subject.insertMany(subjects);
      console.log("✅ Degree Subjects seeded successfully!");
    } else {
      console.log("ℹ️ Subjects already exist, skipping seed.");
    }
  } catch (error) {
    console.error("❌ Error seeding subjects:", error.message);
  }
};

module.exports = seedSubjects;