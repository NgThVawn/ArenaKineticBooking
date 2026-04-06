var bookingModel = require('../schemas/bookings');
var fieldModel = require('../schemas/fields');
var facilityModel = require('../schemas/facilities');
var userModel = require('../schemas/users');
var notificationController = require('./notifications');
var extraServiceController = require('./extraServices');

// Tạo booking code: BK + YYYYMMDD + 4 số ngẫu nhiên
function generateBookingCode() {
  var now = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var datePart = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  var rand = Math.floor(1000 + Math.random() * 9000);
  return 'BK' + datePart + rand;
}

module.exports = {
  CreateBooking: async function (data, session) {
    var booking = new bookingModel(data);
    if (session) {
      await booking.save({ session });
    } else {
      await booking.save();
    }
    return booking;
  },

  GenerateBookingCode: generateBookingCode,

  FindById: async function (id) {
    try {
      return await bookingModel.findOne({ _id: id, isDeleted: false })
        .populate({ path: 'user', select: 'fullName email phone avatarUrl' })
        .populate({
          path: 'field',
          populate: {
            path: 'facility',
            populate: { path: 'owner', select: 'fullName email' }
          }
        });
    } catch (error) {
      return null;
    }
  },

  FindByUser: async function (userId) {
    return await bookingModel.find({ user: userId, isDeleted: false })
      .populate({
        path: 'field',
        populate: { path: 'facility', select: 'name address city' }
      })
      .sort({ createdAt: -1 });
  },

  FindByCode: async function (bookingCode) {
    return await bookingModel.findOne({ bookingCode: bookingCode, isDeleted: false })
      .populate({ path: 'user', select: 'fullName email phone' })
      .populate({
        path: 'field',
        populate: {
          path: 'facility',
          populate: { path: 'owner', select: 'fullName email' }
        }
      });
  },

  FindByOwner: async function (ownerId, page, limit) {
    var facilities = await facilityModel.find({ owner: ownerId, isDeleted: false }).select('_id');
    var facilityIds = facilities.map(function (f) { return f._id; });

    var fields = await fieldModel.find({ facility: { $in: facilityIds }, isDeleted: false }).select('_id');
    var fieldIds = fields.map(function (f) { return f._id; });

    var skip = ((page || 1) - 1) * (limit || 20);
    var bookings = await bookingModel.find({ field: { $in: fieldIds }, isDeleted: false })
      .populate({ path: 'user', select: 'fullName email phone' })
      .populate({ path: 'field', populate: { path: 'facility', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit || 20);

    var total = await bookingModel.countDocuments({ field: { $in: fieldIds }, isDeleted: false });
    return { bookings, total };
  },

  UpdateStatus: async function (id, status, cancelReason) {
    var update = { status: status };
    if (cancelReason) update.cancelReason = cancelReason;
    return await bookingModel.findByIdAndUpdate(id, update, { new: true });
  },

  CheckConflict: async function (fieldId, bookingDate, startTime, endTime, excludeId) {
    var query = {
      field: fieldId,
      bookingDate: bookingDate,
      status: { $in: ['PENDING', 'CONFIRMED'] },
      isDeleted: false,
      $and: [
        { startTime: { $lt: endTime } },
        { endTime: { $gt: startTime } }
      ]
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    var conflict = await bookingModel.findOne(query);
    return conflict !== null;
  },

  // Scheduler: tự động hoàn thành booking đã hết giờ
  CompleteExpiredBookings: async function () {
    var now = new Date();
    var todayStr = now.toISOString().split('T')[0];
    var currentTime = now.toTimeString().substring(0, 5);

    var expired = await bookingModel.find({
      status: 'CONFIRMED',
      isDeleted: false,
      $or: [
        { bookingDate: { $lt: todayStr } },
        { bookingDate: todayStr, endTime: { $lte: currentTime } }
      ]
    }).populate('user').populate({ path: 'field', populate: { path: 'facility', select: 'owner' } });

    for (var booking of expired) {
      await bookingModel.findByIdAndUpdate(booking._id, { status: 'COMPLETED' });

      // Hoàn trả stock cho dịch vụ cho mượn (isReturnable = true)
      if (booking.extraServices && booking.extraServices.length > 0) {
        for (var extra of booking.extraServices) {
          try {
            var svc = await extraServiceController.FindById(extra.extraService);
            if (svc && svc.isReturnable) {
              await extraServiceController.ReturnStock(extra.extraService, extra.quantity);
            }
          } catch (_) {}
        }
      }

      if (booking.user) {
        await userModel.findByIdAndUpdate(booking.user._id, { $inc: { completedBookings: 1 } });
      }

      if (booking.user) {
        try {
          await notificationController.Create(
            booking.user._id,
            'BOOKING_COMPLETED',
            'Đặt sân hoàn thành',
            'Đặt sân ' + booking.bookingCode + ' đã hoàn thành. Hãy để lại đánh giá!',
            '/bookings/' + booking._id
          );
        } catch (_) {}
      }
    }

    if (expired.length > 0) {
      console.log('Auto-completed', expired.length, 'bookings');
    }
  },

  // Scheduler: tự động hủy booking PENDING quá hạn thanh toán
  CancelExpiredPending: async function (timeoutMinutes) {
    var cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    var expired = await bookingModel.find({
      status: 'PENDING',
      isDeleted: false,
      createdAt: { $lt: cutoff }
    }).populate('user').populate({ path: 'field', populate: { path: 'facility', populate: { path: 'owner' } } });

    for (var booking of expired) {
      await bookingModel.findByIdAndUpdate(booking._id, {
        status: 'CANCELLED',
        cancelReason: 'Hết thời gian thanh toán'
      });

      // Giải phóng stock đã giữ chỗ
      if (booking.extraServices && booking.extraServices.length > 0) {
        for (var extra of booking.extraServices) {
          try {
            await extraServiceController.ReleaseReservation(extra.extraService, extra.quantity);
          } catch (_) {}
        }
      }

      if (booking.user) {
        try {
          await notificationController.Create(
            booking.user._id,
            'BOOKING_AUTO_CANCELLED',
            'Đặt sân bị huỷ',
            'Đặt sân ' + booking.bookingCode + ' đã bị huỷ do hết thời gian thanh toán.',
            '/bookings/' + booking._id
          );
        } catch (_) {}
      }

      if (booking.field && booking.field.facility && booking.field.facility.owner) {
        try {
          await notificationController.Create(
            booking.field.facility.owner._id,
            'BOOKING_AUTO_CANCELLED_OWNER',
            'Đặt sân bị huỷ tự động',
            'Đặt sân ' + booking.bookingCode + ' bị huỷ do khách không thanh toán đúng hạn.',
            '/owner/bookings/' + booking._id
          );
        } catch (_) {}
      }
    }

    if (expired.length > 0) {
      console.log('Auto-cancelled', expired.length, 'pending bookings');
    }
  },

  HasUserCompletedBookingAtFacility: async function (userId, facilityId) {
    var fields = await fieldModel.find({ facility: facilityId, isDeleted: false }).select('_id');
    var fieldIds = fields.map(function (f) { return f._id; });
    var booking = await bookingModel.findOne({
      user: userId,
      field: { $in: fieldIds },
      status: 'COMPLETED',
      isDeleted: false
    });
    return booking !== null;
  }
};