var mongoose = require('mongoose');

var invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

var invoiceSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'booking',
    required: true,
    unique: true
  },
  actualStartTime: { type: String },
  actualEndTime: { type: String },
  fieldCharge: { type: Number, default: 0, min: 0 },
  preBookedTotal: { type: Number, default: 0, min: 0 },
  additionalTotal: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  depositPaid: { type: Number, default: 0, min: 0 },
  amountDue: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'FINALIZED'],
    default: 'DRAFT'
  },
  notes: { type: String, default: '' },
  finalizedAt: { type: Date },
  additionalItems: {
    type: [invoiceItemSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('invoice', invoiceSchema);