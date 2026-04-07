var mongoose = require('mongoose');

var paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'booking',
    required: true,
    unique: true
  },
  txnRef: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['VNPAY', 'MOMO'],
    default: 'VNPAY'
  },
  vnpTransactionNo: { type: String },
  bankCode: { type: String },
  cardType: { type: String },
  payDate: { type: String },
  responseCode: { type: String },
  transactionStatus: { type: String },
  orderInfo: { type: String },
  momoTransId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('payment', paymentSchema);