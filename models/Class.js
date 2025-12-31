const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDelete.plugin");

const ClassSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    subjectId: { type: Number, required: true, ref: "Subject" },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },
  },
  { timestamps: true }
);

// Apply Plugin
ClassSchema.plugin(softDeletePlugin);

// Unique Index (with Partial Filter for soft delete support)
ClassSchema.index(
  { className: 1, section: 1, subjectId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: false } 
  }
);

module.exports = mongoose.model("Class", ClassSchema);