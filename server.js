require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/students', require('./routes/students'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check & Base API
app.get('/api', (req, res) => res.json({ success: true, message: 'TestZen API is online' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const DB_URI = process.env.MONGO_URI;

if (!DB_URI) {
  console.error('❌ Missing MONGO_URI in environment. Please set your MongoDB Atlas connection string.');
  process.exit(1);
}

mongoose.connect(DB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
