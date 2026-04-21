const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { startSession, saveAnswer, submitSession, getSession, getMyResult, getMyAllResults, runCodeTest, clearMyHistory } = require('../controllers/examController');

router.use(authMiddleware);
router.post('/start/:testId', roleGuard('student'), startSession);
router.post('/session/:sessionId/answer', roleGuard('student'), saveAnswer);
router.post('/session/:sessionId/submit', roleGuard('student'), submitSession);
router.post('/session/:sessionId/run', roleGuard('student'), runCodeTest);
router.get('/session/:sessionId', roleGuard('student'), getSession);
router.get('/result/all', roleGuard('student'), getMyAllResults);
router.get('/result/:testId', roleGuard('student'), getMyResult);
router.delete('/result/all', roleGuard('student'), clearMyHistory);

module.exports = router;
