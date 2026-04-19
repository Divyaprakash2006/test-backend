const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // 'created', 'updated', 'deleted', 'enrolled', 'imported'
  targetType: { type: String, required: true }, // 'student', 'test'
  targetName: { type: String, required: true }, // Name of student or title of test
  details: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
