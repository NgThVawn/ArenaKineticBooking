var mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  type: {
    type: String,
    enum: [
      'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
      'BOOKING_COMPLETED', 'BOOKING_AUTO_CANCELLED',
      'PAYMENT_SUCCESS', 'PAYMENT_FAILED',
      'NEW_BOOKING', 'BOOKING_CANCEL_REQUEST', 'BOOKING_CUSTOMER_CANCELLED',
      'PAYMENT_RECEIVED', 'BOOKING_AUTO_CANCELLED_OWNER',
      'CANCEL_APPROVED', 'CANCEL_REJECTED',
      'FACILITY_PENDING', 'FACILITY_APPROVED', 'FACILITY_REJECTED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('notification', notificationSchema);