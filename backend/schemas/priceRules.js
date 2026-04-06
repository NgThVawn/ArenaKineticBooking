var mongoose = require('mongoose');

var priceRuleSchema = new mongoose.Schema({
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'field',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Price rule name is required']
  },
  dayType: {
    type: String,
    enum: ['ALL', 'WEEKDAY', 'WEEKEND'],
    required: [true, 'Day type is required']
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
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: 0
  },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('priceRule', priceRuleSchema);