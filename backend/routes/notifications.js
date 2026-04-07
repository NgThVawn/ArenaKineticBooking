var express = require('express');
var router = express.Router();

var { checkLogin } = require('../utils/authHandler');
var notificationController = require('../controllers/notifications');

// GET /api/v1/notifications
router.get('/', checkLogin, async function (req, res) {
  try {
    var notifications = await notificationController.FindByUser(req.user._id);
    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', checkLogin, async function (req, res) {
  try {
    var count = await notificationController.CountUnread(req.user._id);
    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', checkLogin, async function (req, res) {
  try {
    var notif = await notificationController.MarkRead(req.params.id, req.user._id);
    if (!notif) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    return res.json({ success: true, data: notif });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', checkLogin, async function (req, res) {
  try {
    await notificationController.MarkAllRead(req.user._id);
    return res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;