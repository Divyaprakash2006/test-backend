const mongoose = require('mongoose');

const questionAnalysisSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  studentAnswer: { type: mongoose.Schema.Types.Mixed },
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
  isCorrect: { type: Boolean },
  marksAwarded: { type: Number },
  maxMarks: { type: Number },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSession', required: true },
  score: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String },
  passed: { type: Boolean, required: true },
  timeTaken: { type: Number }, // seconds
  questionAnalysis: [questionAnalysisSchema],
  submittedAt: { type: Date, default: Date.now },
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
