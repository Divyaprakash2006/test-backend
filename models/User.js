const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  rollNo: { type: String, trim: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  avatar: { type: String, default: '' },
  batch: { type: String, default: '' },
  enrolledTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
