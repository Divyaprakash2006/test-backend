const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, default: '', trim: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true }, // in minutes
  passmark: { type: Number, default: 0 },  // percentage
  scheduledDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: false },
  totalMarks: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
