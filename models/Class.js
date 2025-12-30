const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
  {
    className: { type: String, required: true }, // e.g., "Grade 10"
    section: { type: String, required: true },   // e.g., "A"
    
    // CORRECTION: Changed from String to Number to reference your Subject model
    subjectId: { 
      type: Number, 
      required: true,
      ref: "Subject" 
    },   
    
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Can be unassigned initially
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", ClassSchema);