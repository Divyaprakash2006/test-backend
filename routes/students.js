const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent,
  enrollStudent, clearEnrollments, bulkImport, resetTestAttempt
} = require('../controllers/studentController');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'];
    cb(null, true); // accept all, backend will validate
  }
});

router.use(authMiddleware);
router.use(roleGuard('admin'));
router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.post('/:id/enroll', enrollStudent);
router.delete('/:id/enroll', clearEnrollments);
router.delete('/:id/tests/:testId/reset', resetTestAttempt);
router.post('/bulk-import', upload.single('file'), bulkImport);

module.exports = router;
