const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ["radio", "checkbox", "open end"],
    required: true,
  },
  options: {
    type: [String], 
    default: [],
  },
  correctAnswer: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }, 
  marks: { type: Number, default: 1 } 
});

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    timeLimit: { type: Number, required: true }, 

    // FIX: Reverted to ObjectId. 
    // "69545e2192477f1f02ee534b" is a String/ObjectId, NOT a Number.
    subjectId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      ref: "Subject" 
    }, 
    
    questions: [QuestionSchema], 
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