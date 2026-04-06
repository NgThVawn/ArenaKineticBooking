var mongoose = require('mongoose');

var fieldSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'facility',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Field name is required'],
    trim: true
  },
  sportType: {
    type: String,
    enum: ['FOOTBALL', 'TENNIS', 'BADMINTON', 'BASKETBALL', 'VOLLEYBALL', 'PICKLEBALL'],
    required: [true, 'Sport type is required']
  },
  description: { type: String, default: '' },
  surfaceType: { type: String, default: '' },
  capacity: { type: Number, min: 1 },
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: 0
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'MAINTENANCE'],
    default: 'OPEN'
  },
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('field', fieldSchema);