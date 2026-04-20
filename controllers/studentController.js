const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Test = require('../models/Test');
const Result = require('../models/Result');
const ExamSession = require('../models/ExamSession');
const csv = require('csv-parser');
const { Readable } = require('stream');
const XLSX = require('xlsx');
const logActivity = require('../utils/activityLogger');
const { createNotification } = require('./notificationController');
const { sendEnrollmentEmail } = require('../utils/emailService');

// GET /api/students
const getStudents = async (req, res) => {
  try {
    const { search, batch } = req.query;
    const filter = { role: 'student' };
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (batch) filter.batch = batch;
    const students = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/students/:id
const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-passwordHash').populate('enrolledTests');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const results = await Result.find({ student: req.params.id }).populate('test', 'title subject');
    res.json({ success: true, student, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/students
const createStudent = async (req, res) => {
  try {
    const { name, email, password, batch, rollNo } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    if (rollNo) {
      const rollExists = await User.findOne({ rollNo });
      if (rollExists) return res.status(400).json({ success: false, message: 'Roll number already in use' });
    }
    const passwordHash = await bcrypt.hash(password || 'Student@123', 12);
    const student = await User.create({ name, email, passwordHash, batch, rollNo, role: 'student' });
    
    await logActivity({
      adminId: req.user.id,
      action: 'created',
      targetType: 'student',
      targetName: student.name
    });

    res.status(201).json({ success: true, student: { id: student._id, name: student.name, email: student.email, batch: student.batch, rollNo: student.rollNo } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/students/:id
const updateStudent = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }
    const student = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
    
    if (student) {
      await logActivity({
        adminId: req.user.id,
        action: 'updated',
        targetType: 'student',
        targetName: student.name
      });
    }

    res.json({ success: true, student });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/students/:id
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findByIdAndDelete(req.params.id);
    if (student) {
      await logActivity({
        adminId: req.user.id,
        action: 'deleted',
        targetType: 'student',
        targetName: student.name
      });
    }
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/students/:id/enroll
const enrollStudent = async (req, res) => {
  try {
    const { testIds } = req.body;
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    for (const testId of testIds) {
      if (!student.enrolledTests.includes(testId)) {
        const t = await Test.findById(testId);
        if (t) {
          student.enrolledTests.push(testId);
          await Test.findByIdAndUpdate(testId, { $addToSet: { enrolledStudents: student._id } });
          
          await createNotification({
            recipient: student._id,
            sender: req.user.id,
            title: 'New Test Enrollment',
            message: `You have been enrolled in the test: ${t.title}`,
            type: 'enrolled',
          });

          // Send enrollment email
          try {
            await sendEnrollmentEmail(student, t);
          } catch (emailErr) {
            console.error(`Failed to send enrollment email to ${student.email}:`, emailErr);
          }
        }
      }
    }
    await student.save();

    await logActivity({
      adminId: req.user.id,
      action: 'enrolled',
      targetType: 'student',
      targetName: student.name,
      details: `Enrolled in ${testIds.length} tests`
    });

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/students/:id/enroll
const clearEnrollments = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Remove student from all tests they were enrolled in
    await Test.updateMany(
      { _id: { $in: student.enrolledTests } },
      { $pull: { enrolledStudents: student._id } }
    );

    // Clear student's enrolled tests
    student.enrolledTests = [];
    await student.save();

    await logActivity({
      adminId: req.user.id,
      action: 'cleared enrollments',
      targetType: 'student',
      targetName: student.name
    });

    res.json({ success: true, message: 'All enrollments cleared' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/students/bulk-import  (supports .csv and .xlsx)
const bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File required (.xlsx or .csv)' });

    let rows = [];
    const mimetype = req.file.mimetype;
    const originalname = req.file.originalname || '';
    const isExcel = mimetype.includes('spreadsheet') || mimetype.includes('excel') ||
                    originalname.endsWith('.xlsx') || originalname.endsWith('.xls');

    if (isExcel) {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      // Parse CSV
      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer.toString());
        stream.pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }

    const created = [];
    const updated = [];
    const skipped = [];

    for (const row of rows) {
      // Support both camelCase and lowercase header variations
      const name    = (row.name || row.Name || '').toString().trim();
      const email   = (row.email || row.Email || '').toString().trim().toLowerCase();
      const password = (row.password || row.Password || '').toString().trim();
      const batch   = (row.batch || row.Batch || '').toString().trim();
      const rollNo  = (row.rollNo || row.roll_no || row['Roll No'] || row.RollNo || row.rollno || '').toString().trim();

      if (!email) continue;

      const existing = await User.findOne({ email });
      
      // Roll No collision check: if rollNo is provided, make sure it's not used by someone else
      if (rollNo) {
        const rollConflict = await User.findOne({ rollNo, email: { $ne: email } });
        if (rollConflict) { 
          skipped.push({ email, reason: `Roll number ${rollNo} already used by ${rollConflict.email}` }); 
          continue; 
        }
      }

      const updateData = { name, batch, rollNo, role: 'student' };
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 12);
      }

      if (existing) {
        // Update existing
        const student = await User.findByIdAndUpdate(existing._id, updateData, { new: true });
        updated.push({ _id: student._id, name: student.name, email: student.email, batch: student.batch, rollNo: student.rollNo });
      } else {
        // Create new
        const passwordHash = await bcrypt.hash(password || 'Student@123', 12);
        const student = await User.create({ ...updateData, email, passwordHash });
        created.push({ _id: student._id, name: student.name, email: student.email, batch: student.batch, rollNo: student.rollNo });
      }
    }

    if (created.length > 0 || updated.length > 0) {
      await logActivity({
        adminId: req.user.id,
        action: 'imported',
        targetType: 'student',
        targetName: `${created.length + updated.length} students`,
        details: `Bulk import (${created.length} new, ${updated.length} updated) from ${isExcel ? 'Excel' : 'CSV'}`
      });
    }
    res.json({ success: true, message: 'Import completed', created, updated, skipped });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/students/:id/tests/:testId/reset
const resetTestAttempt = async (req, res) => {
  try {
    const { id: studentId, testId } = req.params;
    
    // Find student to log activity
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Delete session and results
    await ExamSession.deleteMany({ student: studentId, test: testId });
    await Result.deleteMany({ student: studentId, test: testId });

    await logActivity({
      adminId: req.user.id,
      action: 'reset attempt',
      targetType: 'test',
      targetName: `Attempt for student ${student.name}`,
      details: `Test ID: ${testId}`
    });

    res.json({ success: true, message: 'Test attempt reset successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent, enrollStudent, clearEnrollments, bulkImport, resetTestAttempt };
