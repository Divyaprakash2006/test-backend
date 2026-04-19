const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

// Diagnostic Ping for Mobile Debugging
router.get('/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is Reachable',
    user: { id: 'debug', name: 'Test Admin', role: 'admin' }
  });
});

module.exports = router;
