var mongoose = require('mongoose');

var extraServiceSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'facility',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },
  description: { type: String, default: '' },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  unit: { type: String, default: 'PER_ITEM' },
  appliesToSportType: {
    type: String,
    enum: ['FOOTBALL', 'TENNIS', 'BADMINTON', 'BASKETBALL', 'VOLLEYBALL', 'PICKLEBALL', null],
    default: null
  },
  quantity:     { type: Number, default: 0, min: 0 },
  reserved:     { type: Number, default: 0, min: 0 },
  soldCount:    { type: Number, default: 0, min: 0 },
  isReturnable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('extraService', extraServiceSchema);