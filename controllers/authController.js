const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwtHelper');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, rollNo } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, rollNo, passwordHash, role: role || 'student' });
    const token = signToken({ id: user._id, role: user.role, name: user.name, rollNo: user.rollNo });

    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, rollNo: user.rollNo, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
// Students may login with rollNo + password; Admins use email + password
const login = async (req, res) => {
  try {
    const { email, rollNo, password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (!email && !rollNo) {
      return res.status(400).json({ success: false, message: 'Email or Roll Number is required' });
    }

    // Find by rollNo first (student flow), then fall back to email
    const query = rollNo ? { rollNo: rollNo.trim() } : { email: email.toLowerCase().trim() };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken({ id: user._id, role: user.role, name: user.name, rollNo: user.rollNo });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, rollNo: user.rollNo, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe };
