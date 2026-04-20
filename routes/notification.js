const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getNotifications, markAsRead, markAllAsRead, clearNotifications } = require('../controllers/notificationController');

router.use(authMiddleware);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/', clearNotifications);

module.exports = router;
