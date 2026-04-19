const Test = require('../models/Test');
const Question = require('../models/Question');
const logActivity = require('../utils/activityLogger');

// GET /api/tests
const getTests = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { enrolledStudents: req.user.id, isPublished: true };
    const tests = await Test.find(filter).populate('createdBy', 'name').populate('questions').sort({ createdAt: -1 });
    res.json({ success: true, tests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/tests/:id
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions').populate('createdBy', 'name');
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    res.json({ success: true, test });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/tests
const createTest = async (req, res) => {
  try {
    const { title, subject, description, duration, passmark, scheduledDate } = req.body;
    const test = await Test.create({ title, subject, description, duration, passmark, scheduledDate, createdBy: req.user.id });
    
    await logActivity({
      adminId: req.user.id,
      action: 'created',
      targetType: 'test',
      targetName: test.title
    });

    res.status(201).json({ success: true, test });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/tests/:id
const updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    
    await logActivity({
      adminId: req.user.id,
      action: 'updated',
      targetType: 'test',
      targetName: test.title
    });

    res.json({ success: true, test });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/tests/:id
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (test) {
      await logActivity({
        adminId: req.user.id,
        action: 'deleted',
        targetType: 'test',
        targetName: test.title
      });
      await Question.deleteMany({ test: req.params.id });
    }
    res.json({ success: true, message: 'Test deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/tests/:id/questions
const addQuestion = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    const question = await Question.create({ ...req.body, test: test._id, order: test.questions.length });
    test.questions.push(question._id);
    test.totalMarks += question.marks || 1;
    await test.save();
    res.status(201).json({ success: true, question });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/tests/:id/questions/:qid
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.qid, req.body, { new: true });
    res.json({ success: true, question });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/tests/:id/questions/:qid
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.qid);
    await Test.findByIdAndUpdate(req.params.id, { 
      $pull: { questions: req.params.qid },
      $inc: { totalMarks: -(question?.marks || 1) }
    });
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/tests/:id/questions/reorder
const reorderQuestions = async (req, res) => {
  try {
    const { questions } = req.body; // array of question IDs in new order
    await Test.findByIdAndUpdate(req.params.id, { questions });
    for (let i = 0; i < questions.length; i++) {
      await Question.findByIdAndUpdate(questions[i], { order: i });
    }
    res.json({ success: true, message: 'Reordered' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/tests/:id/questions/bulk
const bulkAddQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    const questionDocs = questions.map((q, i) => ({
      ...q,
      test: test._id,
      order: test.questions.length + i,
      _id: undefined // Ensure new IDs are generated if they were temp IDs from frontend
    }));

    const createdQuestions = await Question.insertMany(questionDocs);
    const questionIds = createdQuestions.map(q => q._id);

    test.questions.push(...questionIds);
    test.totalMarks += createdQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    await test.save();

    res.status(201).json({ success: true, questions: createdQuestions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getTests, getTest, createTest, updateTest, deleteTest, addQuestion, updateQuestion, deleteQuestion, reorderQuestions, bulkAddQuestions };
