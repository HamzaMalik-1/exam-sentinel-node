const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ["radio", "checkbox", "open end"],
    required: true,
  },
  options: {
    type: [String], // Array of strings e.g. ["Yes", "No"]
    default: [],
  },
  // Stores the correct answer key for grading
  correctAnswer: { 
    type: mongoose.Schema.Types.Mixed, // Can be String (radio) or Array (checkbox)
    required: true 
  }, 
  marks: { type: Number, default: 1 } // Points for this question
});

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    timeLimit: { type: Number, required: true }, // in minutes
    
    // CORRECTION: Changed type to Number to match Subject.js
    subjectId: { 
      type: Number, 
      required: true, 
      ref: "Subject" 
    }, 
    
    questions: [QuestionSchema], // Embedded Questions
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", ExamSchema);