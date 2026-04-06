var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { BlockedTimeValidator, validatedResult } = require('../utils/validator');

var blockedTimeController = require('../controllers/blockedTimes');
var fieldController = require('../controllers/fields');

// GET /api/v1/blocked-times/field/:fieldId?date=YYYY-MM-DD  (public)
router.get('/field/:fieldId', async function (req, res) {
  try {
    var { date } = req.query;
    var blocked = await blockedTimeController.FindByField(req.params.fieldId, date);
    return res.json({ success: true, data: blocked });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/blocked-times  (owner)
router.post('/', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), BlockedTimeValidator, validatedResult, async function (req, res) {
  try {
    var { fieldId, date, startTime, endTime, reason } = req.body;

    var field = await fieldController.FindById(fieldId);
    if (!field) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền khóa giờ cho sân này' });
    }

    var blocked = await blockedTimeController.Create({ field: fieldId, date, startTime, endTime, reason });
    return res.status(201).json({ success: true, message: 'Khóa giờ thành công', data: blocked });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/blocked-times/:id  (owner)
router.delete('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    await blockedTimeController.Delete(req.params.id);
    return res.json({ success: true, message: 'Xóa khóa giờ thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;