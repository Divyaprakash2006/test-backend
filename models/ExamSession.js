const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  answer: { type: mongoose.Schema.Types.Mixed }, // string or array
  flagged: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 }, // seconds
}, { _id: false });

const examSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  answers: [answerSchema],
  status: { type: String, enum: ['active', 'submitted', 'auto-submitted', 'expired'], default: 'active' },
  shuffledQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: { type: String, default: '' },
  passed: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 }, // total seconds
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('ExamSession', examSessionSchema);
