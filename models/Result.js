const mongoose = require("mongoose");

// Stores individual answer details for review and AI feedback
const StudentResponseSchema = new mongoose.Schema({
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }, // Link to specific question inside Exam
  questionText: { 
    type: String, 
    required: true 
  }, // Store text in case exam questions are updated later
  
  // ✅ Crucial: Store the question type ("radio", "checkbox", "open end")
  // Allows frontend to group/render without re-querying the Exam
  questionType: { 
    type: String, 
    required: true 
  },
  
  // ✅ Store original options snapshot for accuracy
  options: { 
    type: [String], 
    default: [] 
  },
  
  // Supports String (radio/open end) or Array (checkbox)
  userAnswer: { 
    type: mongoose.Schema.Types.Mixed 
  },
  
  // Stores MCQ correct key or AI-generated feedback
  correctAnswer: { 
    type: mongoose.Schema.Types.Mixed 
  },
  
  isCorrect: { 
    type: Boolean, 
    default: false 
  },
  
  obtainedMarks: { 
    type: Number, 
    default: 0 
  }
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
    }, // ✅ Reference to Class for result population
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