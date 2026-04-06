var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { FieldValidator, validatedResult } = require('../utils/validator');
var { FieldValidator, PriceQueryValidator, validatedResult } = require('../utils/validator');

var fieldController = require('../controllers/fields');
var facilityController = require('../controllers/facilities');

// GET /api/v1/fields/facility/:facilityId  (public)
router.get('/facility/:facilityId', async function (req, res) {
  try {
    var fields = await fieldController.FindByFacility(req.params.facilityId);
    return res.json({ success: true, data: fields });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/fields/:id  (public)
router.get('/:id', async function (req, res) {
  try {
    var field = await fieldController.FindById(req.params.id);
    if (!field) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    return res.json({ success: true, data: field });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/fields  (owner)
router.post('/', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), FieldValidator, validatedResult, async function (req, res) {
  try {
    var { facilityId, name, sportType, description, surfaceType, capacity, pricePerHour } = req.body;

    var result = await facilityController.FindById(facilityId);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(result.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền thêm sân vào cơ sở này' });
    }

    var field = await fieldController.Create({
      facility: facilityId, name, sportType, description,
      surfaceType, capacity, pricePerHour
    });

    return res.status(201).json({ success: true, message: 'Tạo sân thành công', data: field });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/fields/:id  (owner)
router.put('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), FieldValidator, validatedResult, async function (req, res) {
  try {
    var field = await fieldController.FindById(req.params.id);
    if (!field) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa sân này' });
    }

    var { name, sportType, description, surfaceType, capacity, pricePerHour, status } = req.body;
    var updated = await fieldController.Update(req.params.id, {
      name, sportType, description, surfaceType, capacity, pricePerHour, status
    });

    return res.json({ success: true, message: 'Cập nhật sân thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/fields/:id  (owner)
router.delete('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var field = await fieldController.FindById(req.params.id);
    if (!field) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa sân này' });
    }

    await fieldController.SoftDelete(req.params.id);
    return res.json({ success: true, message: 'Xóa sân thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
// GET /api/v1/fields/:fieldId/price?date=...&start=...&end=...  (public)
router.get('/:fieldId/price', PriceQueryValidator, validatedResult, async function (req, res) {
  try {
    var { date, start, end } = req.query;
    var priceRuleController = require('../controllers/priceRules');
    var result = await priceRuleController.CalculatePrice(req.params.fieldId, date, start, end);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;