var express = require('express');
var router = express.Router();

var { checkLogin, checkRole } = require('../utils/authHandler');
var { InvoiceValidator, validatedResult } = require('../utils/validator');

var invoiceController = require('../controllers/invoices');
var bookingController = require('../controllers/bookings');

// GET /api/v1/invoices/booking/:bookingId  (owner — lấy hoặc tạo draft)
router.get('/booking/:bookingId', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && booking.field && booking.field.facility &&
        String(booking.field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem hóa đơn này' });
    }

    var invoice = await invoiceController.GetOrCreateDraft(req.params.bookingId);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/invoices/booking/:bookingId/save  (owner — lưu draft)
router.post('/booking/:bookingId/save', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), InvoiceValidator, validatedResult, async function (req, res) {
  try {
    var invoice = await invoiceController.SaveInvoice(req.params.bookingId, req.body);
    return res.json({ success: true, message: 'Lưu hóa đơn thành công', data: invoice });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/invoices/booking/:bookingId/finalize  (owner — hoàn tất)
router.post('/booking/:bookingId/finalize', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var invoice = await invoiceController.FinalizeInvoice(req.params.bookingId);
    return res.json({ success: true, message: 'Hoàn tất hóa đơn thành công', data: invoice });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/invoices/booking/:bookingId/print  (owner — in hóa đơn)
router.get('/booking/:bookingId/print', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var invoice = await invoiceController.FindByBooking(req.params.bookingId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    return res.json({ success: true, data: invoice });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;