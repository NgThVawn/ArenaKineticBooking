var mongoose = require('mongoose');

var bookingExtraServiceSchema = new mongoose.Schema({
  extraService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'extraService'
  },
  serviceName: { type: String, required: true },
  unit: { type: String, default: 'PER_ITEM' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

var bookingSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'field',
    required: true
  },
  bookingDate: {
    type: String,
    required: [true, 'Booking date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^\d{2}:\d{2}$/, 'Time must be in HH:mm format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^\d{2}:\d{2}$/, 'Time must be in HH:mm format']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  depositAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  extraServices: {
    type: [bookingExtraServiceSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'CANCEL_PENDING', 'COMPLETED'],
    default: 'PENDING'
  },
  isReviewed: { type: Boolean, default: false },
  note: { type: String, default: '' },
  cancelReason: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('booking', bookingSchema);