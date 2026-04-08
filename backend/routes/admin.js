var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var facilityController = require('../controllers/facilities');
var userController = require('../controllers/users');
var notificationController = require('../controllers/notifications');
var facilityModel = require('../schemas/facilities');
var bookingModel = require('../schemas/bookings');
var userModel = require('../schemas/users');

// GET /api/v1/admin/dashboard
router.get('/dashboard', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var totalFacilities = await facilityModel.countDocuments({ isDeleted: false });
    var pendingFacilities = await facilityModel.countDocuments({ status: 'PENDING_APPROVAL', isDeleted: false });
    var totalUsers = await userModel.countDocuments({ isDeleted: false });
    var totalBookings = await bookingModel.countDocuments({ isDeleted: false });
    var confirmedBookings = await bookingModel.countDocuments({ status: 'CONFIRMED', isDeleted: false });

    return res.json({
      success: true,
      data: { totalFacilities, pendingFacilities, totalUsers, totalBookings, confirmedBookings }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/admin/facilities
router.get('/facilities', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var { status, name, page, limit } = req.query;
    var result = await facilityController.FindAllForAdmin(
      { status, name },
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/facilities/:id/status
router.put('/facilities/:id/status', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var { status } = req.body;
    var validStatuses = ['PENDING_APPROVAL', 'OPEN', 'CLOSED', 'MAINTENANCE', 'BLOCKED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    var result = await facilityController.FindById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });

    await facilityController.ChangeStatus(req.params.id, status);
    var io = req.app.get('io');

    try {
      var type = status === 'OPEN' ? 'FACILITY_APPROVED' : 'FACILITY_REJECTED';
      var title = status === 'OPEN' ? 'Cơ sở đã được duyệt' : 'Cơ sở bị từ chối';
      var message = status === 'OPEN'
        ? 'Cơ sở "' + result.facility.name + '" đã được duyệt và có thể hoạt động.'
        : 'Cơ sở "' + result.facility.name + '" không được duyệt. Trạng thái: ' + status;

      var notif = await notificationController.Create(
        result.facility.owner._id, type, title, message,
        '/owner/facilities/list.html'
      );
      if (io) io.sendToUser(String(result.facility.owner._id), notif);
    } catch (_) {}

    return res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/admin/users
router.get('/users', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var result = await userController.FindAll(page, limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/users/:id/ban
router.put('/users/:id/ban', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể tự khóa tài khoản của mình' });
    }
    var { reason } = req.body;
    var user = await userController.BanUser(req.params.id, reason);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return res.json({ success: true, message: 'Khóa tài khoản thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/users/:id/unban
router.put('/users/:id/unban', checkLogin, checkRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var user = await userController.UnbanUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return res.json({ success: true, message: 'Mở khóa tài khoản thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/users/:id/promote  (SUPER_ADMIN only)
router.put('/users/:id/promote', checkLogin, checkRole('SUPER_ADMIN'), async function (req, res) {
  try {
    var roleController = require('../controllers/roles');
    var adminRole = await roleController.FindByName('ADMIN');
    if (!adminRole) return res.status(500).json({ success: false, message: 'Không tìm thấy role ADMIN' });

    var user = await userController.FindById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    var existingRoleIds = user.roles.map(function (r) { return String(r._id); });
    if (!existingRoleIds.includes(String(adminRole._id))) {
      existingRoleIds.push(String(adminRole._id));
      await userController.UpdateUser(req.params.id, { roles: existingRoleIds });
    }

    return res.json({ success: true, message: 'Nâng quyền thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/users/:id/demote  (SUPER_ADMIN only)
router.put('/users/:id/demote', checkLogin, checkRole('SUPER_ADMIN'), async function (req, res) {
  try {
    var roleController = require('../controllers/roles');
    var adminRole = await roleController.FindByName('ADMIN');
    if (!adminRole) return res.status(500).json({ success: false, message: 'Không tìm thấy role ADMIN' });

    var user = await userController.FindById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    var targetRoles = user.roles.map(function (r) { return r.name; });
    if (targetRoles.includes('SUPER_ADMIN')) {
      return res.status(400).json({ success: false, message: 'Không thể hạ quyền SUPER_ADMIN' });
    }

    var newRoles = user.roles
      .filter(function (r) { return r.name !== 'ADMIN'; })
      .map(function (r) { return r._id; });
    await userController.UpdateUser(req.params.id, { roles: newRoles });

    return res.json({ success: true, message: 'Hạ quyền thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;