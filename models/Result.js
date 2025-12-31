const mongoose = require("mongoose");

// Stores individual answer details for review and AI feedback
const StudentResponseSchema = new mongoose.Schema({
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }, // Link to specific question inside Exam
  questionText: String, // Store text in case exam questions are updated/deleted later
  userAnswer: mongoose.Schema.Types.Mixed, // Supports String, Array (checkbox), or Number
  // ✅ Added field to store the AI's suggested answer or the MCQ key
  correctAnswer: mongoose.Schema.Types.Mixed, 
  isCorrect: { 
    type: Boolean, 
    default: false 
  },
  obtainedMarks: { 
    type: Number, 
    default: 0 
  },
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
    obtainedMarks: { 
      type: Number, 
      required: true 
    },
    totalMarks: { 
      type: Number, 
      required: true 
    },
    percentage: { 
      type: Number 
    },
    status: { 
      type: String, 
      enum: ["Passed", "Failed"],
      required: true
    },
    responses: [StudentResponseSchema], // Detailed question-by-question breakdown
    submittedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate submissions for the same student and exam
ResultSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model("Result", ResultSchema);