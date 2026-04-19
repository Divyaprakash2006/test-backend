const User = require('../models/User');
const Test = require('../models/Test');
const Result = require('../models/Result');
const ExamSession = require('../models/ExamSession');
const Activity = require('../models/Activity');

// GET /api/analytics/kpi
const getKPIs = async (req, res) => {
  try {
    const [totalStudents, totalTests, results] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Test.countDocuments(),
      Result.find(),
    ]);
    const avgScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;
    const passRate = results.length > 0
      ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
      : 0;
    res.json({ success: true, data: { totalStudents, totalTests, avgScore, passRate, totalResults: results.length } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/analytics/monthly
const getMonthly = async (req, res) => {
  try {
    const results = await Result.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          avgScore: { $avg: '$percentage' },
          count: { $sum: 1 },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data = results.map(r => ({
      month: months[r._id.month - 1],
      avgScore: Math.round(r.avgScore),
      count: r.count,
      passed: r.passed,
    }));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getRecentActivity = async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('admin', 'name email avatar');
    res.json({ success: true, data: activities });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/analytics/recent-activity
const clearActivities = async (req, res) => {
  try {
    await Activity.deleteMany({});
    res.json({ success: true, message: 'Activity log cleared' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/analytics/all-results
const clearAllResults = async (req, res) => {
  try {
    await Promise.all([
      Result.deleteMany({}),
      ExamSession.deleteMany({})
    ]);
    res.json({ success: true, message: 'All results and sessions cleared' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/analytics/results/:testId
const getTestResults = async (req, res) => {
  try {
    const results = await Result.find({ test: req.params.testId })
      .populate('student', 'name email batch')
      .populate('test', 'title subject passmark')
      .sort({ score: -1 });
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/analytics/all-results
const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate('student', 'name email batch')
      .populate('test', 'title subject passmark')
      .sort({ createdAt: -1 });
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getKPIs, getMonthly, getRecentActivity, clearActivities, clearAllResults, getTestResults, getAllResults };
