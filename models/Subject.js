const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
});

module.exports = mongoose.model("Subject", subjectSchema);
