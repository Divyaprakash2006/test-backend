const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const {
  getTests, getTest, createTest, updateTest, deleteTest,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions, bulkAddQuestions, deleteAllQuestions
} = require('../controllers/testController');

router.use(authMiddleware);
router.get('/', getTests);
router.get('/:id', getTest);
router.post('/', roleGuard('admin'), createTest);
router.put('/:id', roleGuard('admin'), updateTest);
router.delete('/:id', roleGuard('admin'), deleteTest);
router.post('/:id/questions', roleGuard('admin'), addQuestion);
router.post('/:id/questions/bulk', roleGuard('admin'), bulkAddQuestions);
router.put('/:id/questions/reorder', roleGuard('admin'), reorderQuestions);
router.delete('/:id/questions/all', roleGuard('admin'), deleteAllQuestions);
router.put('/:id/questions/:qid', roleGuard('admin'), updateQuestion);
router.delete('/:id/questions/:qid', roleGuard('admin'), deleteQuestion);

module.exports = router;
