var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');

var facilityController = require('../controllers/facilities');
var bookingController = require('../controllers/bookings');
var invoiceController = require('../controllers/invoices');

var facilityModel = require('../schemas/facilities');
var fieldModel = require('../schemas/fields');
var bookingModel = require('../schemas/bookings');

// GET /api/v1/owner/dashboard
router.get('/dashboard', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var facilities = await facilityModel.find({ owner: req.user._id, isDeleted: false });
    var facilityIds = facilities.map(function (f) { return f._id; });

    var fields = await fieldModel.find({ facility: { $in: facilityIds }, isDeleted: false });
    var fieldIds = fields.map(function (f) { return f._id; });

    var totalBookings = await bookingModel.countDocuments({ field: { $in: fieldIds }, isDeleted: false });
    var confirmedBookings = await bookingModel.countDocuments({ field: { $in: fieldIds }, status: 'CONFIRMED', isDeleted: false });
    var pendingBookings = await bookingModel.countDocuments({ field: { $in: fieldIds }, status: 'PENDING', isDeleted: false });
    var completedBookings = await bookingModel.countDocuments({ field: { $in: fieldIds }, status: 'COMPLETED', isDeleted: false });

    var recentBookings = await bookingModel.find({ field: { $in: fieldIds }, isDeleted: false })
      .populate({ path: 'user', select: 'fullName email' })
      .populate({ path: 'field', select: 'name sportType' })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      data: {
        totalFacilities: facilities.length,
        totalFields: fields.length,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        completedBookings,
        recentBookings
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/owner/bookings
router.get('/bookings', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var result = await bookingController.FindByOwner(req.user._id, page, limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/owner/facilities
router.get('/facilities', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var results = await facilityController.FindByOwner(req.user._id);
    return res.json({ success: true, data: results });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/owner/invoices
router.get('/invoices', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var result = await invoiceController.FindByOwner(req.user._id, page, limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;