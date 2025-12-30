const mongoose = require("mongoose");

// Stores individual answer details for review
const StudentResponseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId }, // Link to specific question inside Exam
  questionText: String, // Optional: Store text in case exam changes later
  userAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: Boolean,
  obtainedMarks: Number,
});

const ResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    obtainedMarks: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number },
    status: { 
      type: String, 
      enum: ["Passed", "Failed"], 
      default: "Passed" 
    },
    responses: [StudentResponseSchema], // Detailed breakdown
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", ResultSchema);