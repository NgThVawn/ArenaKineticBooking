var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var { checkLogin, checkRole } = require('../utils/authHandler');
var { BookingValidator, validatedResult } = require('../utils/validator');

var bookingController = require('../controllers/bookings');
var fieldController = require('../controllers/fields');
var priceRuleController = require('../controllers/priceRules');
var extraServiceController = require('../controllers/extraServices');
var blockedTimeController = require('../controllers/blockedTimes');
var notificationController = require('../controllers/notifications');

// GET /api/v1/bookings  (booking của user hiện tại)
router.get('/', checkLogin, async function (req, res) {
  try {
    var bookings = await bookingController.FindByUser(req.user._id);
    return res.json({ success: true, data: bookings });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/bookings/owner/all  (owner xem booking của sân mình)
router.get('/owner/all', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var result = await bookingController.FindByOwner(req.user._id, page, limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/bookings/:id
router.get('/:id', checkLogin, async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    var isOwner = booking.field && booking.field.facility &&
      String(booking.field.facility.owner._id) === String(req.user._id);
    var isUser = String(booking.user._id) === String(req.user._id);

    if (!isAdmin && !isOwner && !isUser) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem đặt sân này' });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/bookings/code/:code  (lấy booking theo code, dùng cho trang xem chi tiết sau khi đặt thành công) 
router.get('/code/:bookingCode', checkLogin, async function (req, res) {
  try {
    var booking = await bookingController.FindByCode(req.params.bookingCode);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    var isOwner = booking.field && booking.field.facility &&
      String(booking.field.facility.owner._id) === String(req.user._id);
    var isUser = String(booking.user._id) === String(req.user._id);

    if (!isAdmin && !isOwner && !isUser) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem đặt sân này' });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/bookings/preview-price  (tính giá trước khi đặt)
router.post('/preview-price', checkLogin, async function (req, res) {
  try {
    var { fieldId, bookingDate, startTime, endTime, extraItems } = req.body;

    var priceResult = await priceRuleController.CalculatePrice(fieldId, bookingDate, startTime, endTime);
    var fieldPrice = priceResult.totalPrice;

    var extraTotal = 0;
    if (extraItems && extraItems.length > 0) {
      var serviceIds = extraItems.map(function (e) { return e.serviceId; });
      var services = await extraServiceController.FindByIds(serviceIds);
      for (var item of extraItems) {
        var service = services.find(function (s) { return String(s._id) === item.serviceId; });
        if (service) {
          extraTotal += service.price * item.quantity;
        }
      }
    }

    var totalPrice = fieldPrice + extraTotal;
    var depositAmount = Math.round(totalPrice * 0.5);

    return res.json({
      success: true,
      data: {
        fieldPrice,
        extraTotal,
        totalPrice,
        depositAmount,
        breakdown: priceResult.breakdown
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/bookings  (tạo đặt sân)
router.post('/', checkLogin, BookingValidator, validatedResult, async function (req, res) {
  var session = await mongoose.startSession();
  session.startTransaction();
  try {
    var { fieldId, bookingDate, startTime, endTime, note, extraItems } = req.body;

    // Kiểm tra sân tồn tại và đang OPEN
    var field = await fieldController.FindById(fieldId);
    if (!field) throw new Error('Không tìm thấy sân');
    if (field.status !== 'OPEN') throw new Error('Sân hiện không hoạt động');
    if (field.facility.status !== 'OPEN') throw new Error('Cơ sở hiện không hoạt động');

    // Kiểm tra ngày không trong quá khứ
    var today = new Date().toISOString().split('T')[0];
    if (bookingDate < today) throw new Error('Ngày đặt sân không được trong quá khứ');

    // Kiểm tra giờ nằm trong khung hoạt động
    var openTime = field.facility.openTime;
    var closeTime = field.facility.closeTime;
    if (startTime < openTime || endTime > closeTime) {
      throw new Error('Giờ đặt sân phải trong khung giờ hoạt động (' + openTime + ' - ' + closeTime + ')');
    }

    // Kiểm tra xung đột đặt sân
    var hasConflict = await bookingController.CheckConflict(fieldId, bookingDate, startTime, endTime, null);
    if (hasConflict) throw new Error('Khung giờ này đã được đặt, vui lòng chọn giờ khác');

    // Kiểm tra giờ bị khóa
    var isBlocked = await blockedTimeController.CheckConflict(fieldId, bookingDate, startTime, endTime);
    if (isBlocked) throw new Error('Khung giờ này đang bị khóa, vui lòng chọn giờ khác');

    // Tính giá
    var priceResult = await priceRuleController.CalculatePrice(fieldId, bookingDate, startTime, endTime);
    var fieldPrice = priceResult.totalPrice;

    // Xây dựng danh sách dịch vụ thêm
    var bookingExtras = [];
    var extraTotal = 0;
    if (extraItems && extraItems.length > 0) {
      var serviceIds = extraItems.map(function (e) { return e.serviceId; });
      var services = await extraServiceController.FindByIds(serviceIds);
      for (var item of extraItems) {
        var service = services.find(function (s) { return String(s._id) === item.serviceId; });
        if (service) {
          // Kiểm tra và giữ chỗ số lượng (throw nếu không đủ)
          await extraServiceController.ReserveStock(service._id, item.quantity, session);

          var subtotal = service.price * item.quantity;
          extraTotal += subtotal;
          bookingExtras.push({
            extraService: service._id,
            serviceName: service.name,
            unit: service.unit,
            quantity: item.quantity,
            unitPrice: service.price,
            subtotal: subtotal
          });
        }
      }
    }

    var totalPrice = fieldPrice + extraTotal;
    var depositAmount = Math.round(totalPrice * 0.5);

    var bookingCode = bookingController.GenerateBookingCode();

    var booking = await bookingController.CreateBooking({
      bookingCode,
      user: req.user._id,
      field: fieldId,
      bookingDate,
      startTime,
      endTime,
      totalPrice,
      depositAmount,
      extraServices: bookingExtras,
      note: note || '',
      status: 'PENDING'
    }, session);

    await session.commitTransaction();

    var populatedBooking = await bookingController.FindById(booking._id);

    // Gửi thông báo
    var io = req.app.get('io');
    try {
      var notif = await notificationController.Create(
        req.user._id, 'BOOKING_CREATED',
        'Đặt sân thành công',
        'Đặt sân ' + bookingCode + ' đã được tạo. Vui lòng thanh toán để xác nhận.',
        '/bookings/history.html'
      );
      if (io) io.sendToUser(String(req.user._id), notif);

      if (populatedBooking.field && populatedBooking.field.facility) {
        var ownerId = populatedBooking.field.facility.owner._id;
        var ownerNotif = await notificationController.Create(
          ownerId, 'NEW_BOOKING',
          'Có đặt sân mới',
          'Khách ' + req.user.fullName + ' đã đặt sân ' + bookingCode,
          '/owner/bookings/list.html'
        );
        if (io) io.sendToUser(String(ownerId), ownerNotif);
      }
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: 'Đặt sân thành công',
      data: { booking: populatedBooking, bookingCode }
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// POST /api/v1/bookings/:id/cancel  (user hủy)
router.post('/:id/cancel', checkLogin, async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });

    if (String(booking.user._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền huỷ đặt sân này' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Không thể huỷ đặt sân ở trạng thái hiện tại' });
    }

    var { cancelReason } = req.body;
    var io = req.app.get('io');

    if (booking.status === 'PENDING') {
      await bookingController.UpdateStatus(booking._id, 'CANCELLED', cancelReason);

      // Giải phóng stock đã giữ chỗ
      for (var extra of booking.extraServices) {
        try { await extraServiceController.ReleaseReservation(extra.extraService, extra.quantity); } catch (_) {}
      }

      var notif = await notificationController.Create(
        req.user._id, 'BOOKING_CANCELLED',
        'Đặt sân đã huỷ',
        'Đặt sân ' + booking.bookingCode + ' đã được huỷ.',
        '/bookings/history.html'
      );
      if (io) io.sendToUser(String(req.user._id), notif);

      return res.json({ success: true, message: 'Huỷ đặt sân thành công' });
    }

    // CONFIRMED booking — kiểm tra thời gian còn lại
    var bookingDateTime = new Date(booking.bookingDate + 'T' + booking.startTime + ':00');
    var hoursUntilBooking = (bookingDateTime - new Date()) / 3600000;

    if (hoursUntilBooking < 24) {
      // Cần chủ cơ sở duyệt
      await bookingController.UpdateStatus(booking._id, 'CANCEL_PENDING', cancelReason);

      if (booking.field && booking.field.facility) {
        var ownerNotif = await notificationController.Create(
          booking.field.facility.owner._id, 'BOOKING_CANCEL_REQUEST',
          'Yêu cầu huỷ đặt sân',
          'Khách ' + req.user.fullName + ' yêu cầu huỷ đặt sân ' + booking.bookingCode,
          '/owner/bookings/list.html'
        );
        if (io) io.sendToUser(String(booking.field.facility.owner._id), ownerNotif);
      }

      return res.json({ success: true, message: 'Yêu cầu huỷ đã được gửi, đang chờ chủ cơ sở xét duyệt' });
    } else {
      // Hủy thẳng
      await bookingController.UpdateStatus(booking._id, 'CANCELLED', cancelReason);

      // Hoàn trả soldCount (booking đã thanh toán nhưng bị hủy)
      for (var extra of booking.extraServices) {
        try { await extraServiceController.ReturnStock(extra.extraService, extra.quantity); } catch (_) {}
      }

      if (booking.field && booking.field.facility) {
        var ownerCancelNotif = await notificationController.Create(
          booking.field.facility.owner._id, 'BOOKING_CUSTOMER_CANCELLED',
          'Khách huỷ đặt sân',
          'Khách ' + req.user.fullName + ' đã huỷ đặt sân ' + booking.bookingCode,
          '/owner/bookings/list.html'
        );
        if (io) io.sendToUser(String(booking.field.facility.owner._id), ownerCancelNotif);
      }

      return res.json({ success: true, message: 'Huỷ đặt sân thành công' });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/bookings/owner/:id/confirm-cancel  (owner duyệt/từ chối hủy)
router.put('/owner/:id/confirm-cancel', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });

    if (booking.status !== 'CANCEL_PENDING') {
      return res.status(400).json({ success: false, message: 'Đặt sân không ở trạng thái chờ huỷ' });
    }

    var userRoles = req.user.roles.map(function (r) { return r.name; });
    var isAdminOrSuper = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    if (!isAdminOrSuper && booking.field && booking.field.facility &&
        String(booking.field.facility.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xử lý đặt sân này' });
    }

    var { approve } = req.body;
    var io = req.app.get('io');

    if (approve) {
      await bookingController.UpdateStatus(booking._id, 'CANCELLED');

      // Hoàn trả soldCount (booking CONFIRMED bị owner chấp thuận hủy)
      for (var extra of booking.extraServices) {
        try { await extraServiceController.ReturnStock(extra.extraService, extra.quantity); } catch (_) {}
      }

      var notif = await notificationController.Create(
        booking.user._id, 'CANCEL_APPROVED',
        'Yêu cầu huỷ được chấp thuận',
        'Yêu cầu huỷ đặt sân ' + booking.bookingCode + ' đã được chấp thuận.',
        '/bookings/history.html'
      );
      if (io) io.sendToUser(String(booking.user._id), notif);
      return res.json({ success: true, message: 'Đã chấp thuận huỷ đặt sân' });
    } else {
      await bookingController.UpdateStatus(booking._id, 'CONFIRMED');
      var rejectNotif = await notificationController.Create(
        booking.user._id, 'CANCEL_REJECTED',
        'Yêu cầu huỷ bị từ chối',
        'Yêu cầu huỷ đặt sân ' + booking.bookingCode + ' đã bị từ chối.',
        '/bookings/history.html'
      );
      if (io) io.sendToUser(String(booking.user._id), rejectNotif);
      return res.json({ success: true, message: 'Đã từ chối huỷ đặt sân' });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
// PUT /api/v1/bookings/owner/:id/confirm  (Owner thủ công duyệt đơn PENDING)
router.put('/owner/:id/confirm', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });
    if (booking.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Đơn không ở trạng thái chờ duyệt' });
    
    // Đổi sang CONFIRMED
    await bookingController.UpdateStatus(booking._id, 'CONFIRMED');
    return res.json({ success: true, message: 'Đã duyệt đơn đặt sân thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/bookings/owner/:id/cancel  (Owner thủ công hủy/từ chối đơn)
router.put('/owner/:id/cancel', checkLogin, checkRole('OWNER', 'ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var booking = await bookingController.FindById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });
    
    var { cancelReason } = req.body;
    await bookingController.UpdateStatus(booking._id, 'CANCELLED', cancelReason || 'Chủ sân hủy');
    
    // Giải phóng dịch vụ (Trả lại kho)
    var extraServiceController = require('../controllers/extraServices');
    if (booking.extraServices && booking.extraServices.length > 0) {
        for (var extra of booking.extraServices) {
            try { 
                if (booking.status === 'PENDING') {
                    await extraServiceController.ReleaseReservation(extra.extraService, extra.quantity); 
                } else {
                    await extraServiceController.ReturnStock(extra.extraService, extra.quantity);
                }
            } catch (_) {}
        }
    }

    return res.json({ success: true, message: 'Đã hủy đơn đặt sân thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
module.exports = router;