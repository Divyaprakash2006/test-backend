const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['mcq-single', 'mcq-multi', 'true-false', 'short-answer', 'fill-blank', 'coding'], 
    required: true 
  },
  text: { type: String, required: true },
  options: [{ type: String }],          // for mcq/true-false
  correctAnswer: { type: mongoose.Schema.Types.Mixed }, // string or array of strings
  explanation: { type: String, default: '' },
  tags: [{ type: String }],
  marks: { type: Number, default: 1 },
  // Coding specific
  testCases: [{
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    marks: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false }
  }],
  allowedLanguages: [{ type: String, default: 'javascript' }],
  shuffleOptions: { type: Boolean, default: false },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
