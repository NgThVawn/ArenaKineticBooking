var express = require('express');
var router = express.Router();

var { checkLogin, checkRole, optionalLogin } = require('../utils/authHandler');
var { FacilityValidator, validatedResult } = require('../utils/validator');
var { uploadImage } = require('../utils/uploadHandler');

var facilityController = require('../controllers/facilities');

// GET /api/v1/facilities  (public)
router.get('/', optionalLogin, async function (req, res) {
  try {
    var { city, name, favoritesOnly, page, limit } = req.query;
    var filters = {
      city, name,
      favoritesOnly: favoritesOnly === 'true',
      userId: req.user ? req.user._id : null
    };

    var result = await facilityController.FindAll(filters, parseInt(page) || 1, parseInt(limit) || 10);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/facilities/:id  (public)
router.get('/:id', optionalLogin, async function (req, res) {
  try {
    var result = await facilityController.FindById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var { facility, images } = result;
    return res.json({ success: true, data: { facility, images } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/facilities  (owner)
router.post('/', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), FacilityValidator, validatedResult, async function (req, res) {
  try {
    var { name, description, address, city, district, latitude, longitude, phone, email, openTime, closeTime } = req.body;

    var facility = await facilityController.Create({
      owner: req.user._id,
      name, description, address, city, district,
      latitude, longitude, phone, email, openTime, closeTime,
      status: 'PENDING_APPROVAL'
    });

    return res.status(201).json({ success: true, message: 'Tạo cơ sở thành công, đang chờ duyệt', data: facility });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/facilities/:id  (owner)
router.put('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), FacilityValidator, validatedResult, async function (req, res) {
  try {
    var result = await facilityController.FindById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var { facility } = result;
    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');

    if (!isAdminOrSuper && String(facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa cơ sở này' });
    }

    var { name, description, address, city, district, latitude, longitude, phone, email, openTime, closeTime } = req.body;
    var updated = await facilityController.Update(req.params.id, {
      name, description, address, city, district,
      latitude, longitude, phone, email, openTime, closeTime
    });

    return res.json({ success: true, message: 'Cập nhật thành công', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/facilities/:id  (owner)
router.delete('/:id', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var result = await facilityController.FindById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var { facility } = result;
    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');

    if (!isAdminOrSuper && String(facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa cơ sở này' });
    }

    await facilityController.SoftDelete(req.params.id);
    return res.json({ success: true, message: 'Xóa cơ sở thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/facilities/:id/images  (owner)
router.post('/:id/images', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), uploadImage.array('images', 10), async function (req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }

    var result = await facilityController.FindById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    var images = [];
    for (var i = 0; i < req.files.length; i++) {
      var imageUrl = '/uploads/' + req.files[i].filename;
      var isPrimary = i === 0 && req.body.setPrimary === 'true';
      var image = await facilityController.AddImage(req.params.id, imageUrl, isPrimary, i);
      images.push(image);
    }

    return res.json({ success: true, message: 'Tải ảnh lên thành công', data: images });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/facilities/:id/images/:imageId  (owner)
router.delete('/:id/images/:imageId', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    await facilityController.DeleteImage(req.params.imageId);
    return res.json({ success: true, message: 'Xóa ảnh thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;