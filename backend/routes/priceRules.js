var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { PriceRuleValidator, validatedResult } = require('../utils/validator');

var priceRuleController = require('../controllers/priceRules');
var fieldController = require('../controllers/fields');

// GET /api/v1/price-rules/field/:fieldId  (public)
router.get('/field/:fieldId', async function (req, res) {
  try {
    var rules = await priceRuleController.FindByField(req.params.fieldId);
    return res.json({ success: true, data: rules });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/price-rules  (owner)
router.post('/', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), PriceRuleValidator, validatedResult, async function (req, res) {
  try {
    var { fieldId, name, dayType, startTime, endTime, pricePerHour, priority } = req.body;

    var field = await fieldController.FindById(fieldId);
    if (!field) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền thêm quy tắc giá cho sân này' });
    }

    var rule = await priceRuleController.Create({
      field: fieldId, name, dayType, startTime, endTime,
      pricePerHour: parseFloat(pricePerHour),
      priority: parseInt(priority) || 0
    });

    return res.status(201).json({ success: true, message: 'Tạo quy tắc giá thành công', data: rule });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/price-rules/:id  (owner)
router.put('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var priceRuleModel = require('../schemas/priceRules');
    var rule = await priceRuleModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!rule) return res.status(404).json({ success: false, message: 'Không tìm thấy quy tắc giá' });

    var { name, dayType, startTime, endTime, pricePerHour, priority, isActive } = req.body;
    var updated = await priceRuleController.Update(req.params.id, {
      name, dayType, startTime, endTime,
      pricePerHour: pricePerHour !== undefined ? parseFloat(pricePerHour) : undefined,
      priority: priority !== undefined ? parseInt(priority) : undefined,
      isActive
    });

    return res.json({ success: true, message: 'Cập nhật quy tắc giá thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/price-rules/:id  (owner)
router.delete('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    await priceRuleController.Delete(req.params.id);
    return res.json({ success: true, message: 'Xóa quy tắc giá thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;