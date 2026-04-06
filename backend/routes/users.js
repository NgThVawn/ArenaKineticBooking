var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { UpdateProfileValidator, validatedResult } = require('../utils/validator');
var { uploadImage } = require('../utils/uploadHandler');

var userController = require('../controllers/users');

// GET /api/v1/users  (admin only)
router.get('/', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var result = await userController.FindAll(page, limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
// GET /api/v1/users/:id
router.get('/:id', checkLogin, async function (req, res) {
  try {
    var user = await userController.FindById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/users/profile
router.put('/profile', checkLogin, UpdateProfileValidator, validatedResult, async function (req, res) {
  try {
    var { fullName, phone } = req.body;
    var update = {};
    if (fullName) update.fullName = fullName;
    if (phone !== undefined) update.phone = phone;

    var updated = await userController.UpdateUser(req.user._id, update);
    return res.json({ success: true, message: 'Cập nhật thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/users/avatar
router.post('/avatar', checkLogin, uploadImage.single('avatar'), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }
    var avatarUrl = '/uploads/' + req.file.filename;
    await userController.UpdateUser(req.user._id, { avatarUrl });
    return res.json({ success: true, message: 'Cập nhật ảnh thành công', data: { avatarUrl } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;