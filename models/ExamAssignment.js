const mongoose = require("mongoose");

const ExamAssignmentSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamAssignment", ExamAssignmentSchema);