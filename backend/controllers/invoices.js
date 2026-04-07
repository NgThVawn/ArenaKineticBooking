var invoiceModel = require('../schemas/invoices');
var bookingModel = require('../schemas/bookings');

function timeToMinutes(timeStr) {
  var parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

module.exports = {
  GetOrCreateDraft: async function (bookingId) {
    var existing = await invoiceModel.findOne({ booking: bookingId }).populate({
      path: 'booking',
      populate: [
        { path: 'user', select: 'fullName email phone' },
        { path: 'field', populate: { path: 'facility', select: 'name address' } }
      ]
    });

    if (existing) return existing;

    var booking = await bookingModel.findById(bookingId)
      .populate({ path: 'field', select: 'pricePerHour name' });

    if (!booking) throw new Error('Không tìm thấy đặt sân');

    var startMin = timeToMinutes(booking.startTime);
    var endMin = timeToMinutes(booking.endTime);
    var durationHours = (endMin - startMin) / 60;
    var fieldCharge = Math.round(booking.field.pricePerHour * durationHours);

    var extraTotal = booking.extraServices.reduce(function (sum, s) {
      return sum + (s.subtotal || 0);
    }, 0);

    var grandTotal = fieldCharge + extraTotal;
    var amountDue = grandTotal - booking.depositAmount;

    var invoice = new invoiceModel({
      booking: bookingId,
      actualStartTime: booking.startTime,
      actualEndTime: booking.endTime,
      fieldCharge, preBookedTotal: extraTotal,
      additionalTotal: 0, grandTotal,
      depositPaid: booking.depositAmount,
      amountDue, status: 'DRAFT', additionalItems: []
    });

    await invoice.save();
    return await invoiceModel.findById(invoice._id).populate({
      path: 'booking',
      populate: [
        { path: 'user', select: 'fullName email phone' },
        { path: 'field', populate: { path: 'facility', select: 'name address' } }
      ]
    });
  },

  SaveInvoice: async function (bookingId, data) {
    var invoice = await invoiceModel.findOne({ booking: bookingId });
    if (!invoice) throw new Error('Không tìm thấy hóa đơn');
    if (invoice.status === 'FINALIZED') throw new Error('Hóa đơn đã được hoàn tất, không thể sửa');

    var booking = await bookingModel.findById(bookingId)
      .populate({ path: 'field', select: 'pricePerHour' });

    var startTime = data.actualStartTime || invoice.actualStartTime;
    var endTime = data.actualEndTime || invoice.actualEndTime;
    var startMin = timeToMinutes(startTime);
    var endMin = timeToMinutes(endTime);
    var durationHours = (endMin - startMin) / 60;
    var fieldCharge = Math.round(booking.field.pricePerHour * durationHours);

    var preBookedTotal = booking.extraServices.reduce(function (sum, s) {
      return sum + (s.subtotal || 0);
    }, 0);

    var additionalItems = (data.additionalItems || []).map(function (item) {
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      };
    });

    var additionalTotal = additionalItems.reduce(function (sum, item) {
      return sum + item.subtotal;
    }, 0);

    var grandTotal = fieldCharge + preBookedTotal + additionalTotal;
    var amountDue = grandTotal - booking.depositAmount;

    return await invoiceModel.findByIdAndUpdate(invoice._id, {
      actualStartTime: startTime,
      actualEndTime: endTime,
      fieldCharge, preBookedTotal, additionalTotal,
      grandTotal, depositPaid: booking.depositAmount,
      amountDue, additionalItems,
      notes: data.notes || invoice.notes
    }, { new: true });
  },

  FinalizeInvoice: async function (bookingId) {
    var invoice = await invoiceModel.findOne({ booking: bookingId });
    if (!invoice) throw new Error('Không tìm thấy hóa đơn');
    if (invoice.status === 'FINALIZED') throw new Error('Hóa đơn đã được hoàn tất');

    return await invoiceModel.findByIdAndUpdate(invoice._id, {
      status: 'FINALIZED',
      finalizedAt: new Date()
    }, { new: true }).populate({
      path: 'booking',
      populate: [
        { path: 'user', select: 'fullName email phone' },
        { path: 'field', populate: { path: 'facility', select: 'name address' } }
      ]
    });
  },

  FindByBooking: async function (bookingId) {
    return await invoiceModel.findOne({ booking: bookingId }).populate({
      path: 'booking',
      populate: [
        { path: 'user', select: 'fullName email phone' },
        { path: 'field', populate: { path: 'facility', select: 'name address city' } }
      ]
    });
  },

  FindByOwner: async function (ownerId, page, limit) {
    var facilityModel = require('../schemas/facilities');
    var fieldModel = require('../schemas/fields');

    var facilities = await facilityModel.find({ owner: ownerId, isDeleted: false }).select('_id');
    var facilityIds = facilities.map(function (f) { return f._id; });
    var fields = await fieldModel.find({ facility: { $in: facilityIds }, isDeleted: false }).select('_id');
    var fieldIds = fields.map(function (f) { return f._id; });

    var bookings = await bookingModel.find({ field: { $in: fieldIds }, isDeleted: false }).select('_id');
    var bookingIds = bookings.map(function (b) { return b._id; });

    var skip = ((page || 1) - 1) * (limit || 20);
    var invoices = await invoiceModel.find({ booking: { $in: bookingIds } })
      .populate({
        path: 'booking',
        populate: [
          { path: 'user', select: 'fullName email' },
          { path: 'field', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit || 20);

    var total = await invoiceModel.countDocuments({ booking: { $in: bookingIds } });
    return { invoices, total };
  }
};