const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "dropped", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Prevent duplicate active enrollments for the same class
EnrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", EnrollmentSchema);