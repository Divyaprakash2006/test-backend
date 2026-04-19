const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { getKPIs, getMonthly, getRecentActivity, clearActivities, clearAllResults, getTestResults, getAllResults } = require('../controllers/analyticsController');

router.use(authMiddleware);
router.use(roleGuard('admin'));
router.get('/kpi', getKPIs);
router.get('/monthly', getMonthly);
router.get('/recent-activity', getRecentActivity);
router.delete('/recent-activity', clearActivities);
router.delete('/all-results', clearAllResults);
router.get('/results/:testId', getTestResults);
router.get('/all-results', getAllResults);

module.exports = router;
