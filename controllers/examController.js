const Test = require('../models/Test');
const Question = require('../models/Question');
const ExamSession = require('../models/ExamSession');
const Result = require('../models/Result');
const { calculateScore } = require('../utils/scoreCalculator');
const { runCode } = require('../utils/codeRunner');

// POST /api/exam/start/:testId
const startSession = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate('questions');
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    // Check if already active session
    const existing = await ExamSession.findOne({ student: req.user.id, test: test._id, status: 'active' });
    if (existing) return res.json({ success: true, session: existing });

    // Check archive/limit? User wants unlimited so we just count for attemptNumber
    const previousResultsCount = await Result.countDocuments({ student: req.user.id, test: test._id });

    // Enforce attempt limits if not unlimited
    if (!test.unlimitedAttempts && previousResultsCount >= (test.maxAttempts || 1)) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum attempts (${test.maxAttempts || 1}) reached for this test.` 
      });
    }

    // Check scheduling and expiry
    const now = new Date();
    if (test.scheduledDate) {
      const sched = new Date(test.scheduledDate);
      if (now < sched) {
        return res.status(400).json({ success: false, message: `Test scheduled to start at ${sched.toLocaleString()}` });
      }
    }

    if (test.expiryDate) {
      const expiry = new Date(test.expiryDate);
      if (now >= expiry) {
        return res.status(400).json({ success: false, message: 'Test has expired and is no longer available.' });
      }
    } else if (test.scheduledDate) {
      // Fallback to duration if no explicit expiryDate is set
      const deadline = new Date(new Date(test.scheduledDate).getTime() + (test.duration || 60) * 60 * 1000);
      if (now >= deadline) {
        return res.status(400).json({ success: false, message: 'Test window has already closed' });
      }
    }

    const shuffled = [...test.questions].sort((a, b) => (a.order || 0) - (b.order || 0));

    const session = await ExamSession.create({
      student: req.user.id,
      test: test._id,
      startTime: new Date(),
      shuffledQuestions: shuffled.map(q => q._id),
      status: 'active',
      attemptNumber: previousResultsCount + 1
    });

    res.status(201).json({ success: true, session, questions: shuffled });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/exam/session/:sessionId/answer
const saveAnswer = async (req, res) => {
  try {
    const { questionId, answer, flagged } = req.body;
    const session = await ExamSession.findById(req.params.sessionId);
    if (!session || session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Session not active' });
    }

    // Hard deadline check for saving answer
    const test = await Test.findById(session.test);
    const now = new Date();
    if (test.expiryDate) {
      if (now >= new Date(new Date(test.expiryDate).getTime() + 5000)) { // 5s grace
        return res.status(400).json({ success: false, message: 'Test window expired' });
      }
    } else if (test.scheduledDate) {
      const deadline = new Date(new Date(test.scheduledDate).getTime() + (test.duration || 60) * 60 * 1000 + 5000); // 5s grace
      if (now >= deadline) {
        return res.status(400).json({ success: false, message: 'Test window expired' });
      }
    }

    const idx = session.answers.findIndex(a => a.question.toString() === questionId);
    if (idx >= 0) {
      session.answers[idx] = { question: questionId, answer, flagged: flagged || false };
    } else {
      session.answers.push({ question: questionId, answer, flagged: flagged || false });
    }
    await session.save();
    res.json({ success: true, message: 'Answer saved' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/exam/session/:sessionId/submit
const submitSession = async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'active') {
      const result = await Result.findOne({ session: session._id }).populate('test', 'title subject');
      return res.json({ success: true, result });
    }

    const test = await Test.findById(session.test).populate('questions');

    // Hard deadline check
    const now = new Date();
    if (test.expiryDate) {
      if (now >= new Date(new Date(test.expiryDate).getTime() + 10000)) { // 10s grace
        session.status = 'expired';
        await session.save();
        return res.status(400).json({ success: false, message: 'Test window has expired' });
      }
    } else if (test.scheduledDate) {
      const deadline = new Date(new Date(test.scheduledDate).getTime() + (test.duration || 60) * 60 * 1000 + 10000); // 10s grace
      if (now >= deadline) {
        session.status = 'expired';
        await session.save();
        return res.status(400).json({ success: false, message: 'Test window has expired' });
      }
    }

    const scoreData = await calculateScore(test, session.answers);

    const endTime = new Date();
    const timeTaken = Math.round((endTime - session.startTime) / 1000);

    session.status = req.body.auto ? 'auto-submitted' : 'submitted';
    session.endTime = endTime;
    session.score = scoreData.score;
    session.percentage = scoreData.percentage;
    session.grade = scoreData.grade;
    session.passed = scoreData.passed;
    session.timeTaken = timeTaken;
    await session.save();

    const result = await Result.create({
      student: session.student,
      test: session.test,
      session: session._id,
      score: scoreData.score,
      totalMarks: scoreData.totalMarks,
      percentage: scoreData.percentage,
      grade: scoreData.grade,
      passed: scoreData.passed,
      timeTaken,
      questionAnalysis: scoreData.questionAnalysis,
      attemptNumber: session.attemptNumber || 1
    });

    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/exam/session/:sessionId
const getSession = async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId).populate('shuffledQuestions').populate('student', 'name rollNo');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/exam/result/:testId
const getMyResult = async (req, res) => {
  try {
    const results = await Result.find({ student: req.user.id, test: req.params.testId })
      .populate({ path: 'questionAnalysis.question', model: 'Question' })
      .populate('test', 'title subject passmark unlimitedAttempts maxAttempts scheduledDate expiryDate duration')
      .sort({ attemptNumber: -1 }); // Latest first

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: 'No results found' });
    }

    res.json({ success: true, results, result: results[0] }); // For backward compatibility, also return 'result' as the latest one
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/exam/result/all
const getMyAllResults = async (req, res) => {
  try {
    const results = await Result.find({ student: req.user.id })
      .populate('test', 'title subject duration scheduledDate')
      .sort({ createdAt: -1 });
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/exam/session/:sessionId/run
const runCodeTest = async (req, res) => {
  try {
    const { questionId, code, language, customInput } = req.body;
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    // If customInput is provided, do a manual run
    if (customInput !== undefined && customInput !== null) {
      const runResult = await runCode(code, language, customInput);
      return res.json({
        success: true,
        results: [{
          input: customInput || '(empty)',
          expected: '(manual)',
          actual: runResult.output,
          error: runResult.error,
          isCorrect: !runResult.error,
          isManual: true
        }]
      });
    }

    // Run against public test cases
    const publicTestCases = (question.testCases || []).filter(tc => tc.isPublic);
    const results = [];

    // If no public test cases, run once with empty input to show output/errors
    if (publicTestCases.length === 0) {
      const runResult = await runCode(code, language, '');
      results.push({
        input: '(none)',
        expected: '(none)',
        actual: runResult.output,
        error: runResult.error,
        isCorrect: !runResult.error,
        isDryRun: true
      });
    } else {
      for (const tc of publicTestCases) {
        const runResult = await runCode(code, language, tc.input);
        const isCorrect = runResult.output.trim() === (tc.output || '').trim();
        results.push({
          input: tc.input,
          expected: tc.output,
          actual: runResult.output,
          error: runResult.error,
          isCorrect
        });
      }
    }

    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/exam/result/all
const clearMyHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    await Promise.all([
      Result.deleteMany({ student: studentId }),
      ExamSession.deleteMany({ student: studentId })
    ]);
    res.json({ success: true, message: 'All exam history and sessions cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { startSession, saveAnswer, submitSession, getSession, getMyResult, getMyAllResults, runCodeTest, clearMyHistory };
