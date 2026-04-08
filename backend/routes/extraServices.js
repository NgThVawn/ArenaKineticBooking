var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { ExtraServiceValidator, validatedResult } = require('../utils/validator');

var extraServiceController = require('../controllers/extraServices');
var facilityController = require('../controllers/facilities');

// GET /api/v1/extra-services/facility/:facilityId  (public)
router.get('/facility/:facilityId', async function (req, res) {
  try {
    var services = await extraServiceController.FindByFacility(req.params.facilityId);
    return res.json({ success: true, data: services });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/extra-services  (owner)
router.post('/', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), ExtraServiceValidator, validatedResult, async function (req, res) {
  try {
    var { facilityId, name, description, price, unit, appliesToSportType, quantity, isReturnable } = req.body;

    var result = await facilityController.FindById(facilityId);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && String(result.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền thêm dịch vụ cho cơ sở này' });
    }

    var service = await extraServiceController.Create({
      facility: facilityId, name, description,
      price: parseFloat(price), unit: unit || 'PER_ITEM',
      appliesToSportType: appliesToSportType || null,
      quantity: quantity !== undefined ? parseInt(quantity) : 0,
      isReturnable: isReturnable === true || isReturnable === 'true'
    });

    return res.status(201).json({ success: true, message: 'Tạo dịch vụ thành công', data: service });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/extra-services/:id  (owner)
router.put('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var service = await extraServiceController.FindById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });

    var { name, description, price, unit, appliesToSportType, quantity, isReturnable, isActive } = req.body;
    var updated = await extraServiceController.Update(req.params.id, {
      name, description,
      price: price !== undefined ? parseFloat(price) : undefined,
      unit, appliesToSportType, isActive,
      quantity: quantity !== undefined ? parseInt(quantity) : undefined,
      isReturnable: isReturnable !== undefined ? (isReturnable === true || isReturnable === 'true') : undefined
    });

    return res.json({ success: true, message: 'Cập nhật dịch vụ thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/extra-services/:id  (owner)
router.delete('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    await extraServiceController.SoftDelete(req.params.id);
    return res.json({ success: true, message: 'Xóa dịch vụ thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
// GET /api/v1/extra-services/owner/facility/:facilityId  (Dành cho Owner)
router.get('/owner/facility/:facilityId', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    // Gọi cái hàm mới tạo ở Bước 1
    var services = await extraServiceController.FindAllForOwner(req.params.facilityId);
    return res.json({ success: true, data: services });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;