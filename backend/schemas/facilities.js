var mongoose = require('mongoose');

var facilitySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    trim: true
  },
  description: { type: String, default: '' },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  district: { type: String, default: '' },
  latitude: { type: Number },
  longitude: { type: Number },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  openTime: { type: String, default: '06:00' },
  closeTime: { type: String, default: '22:00' },
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'OPEN', 'CLOSED', 'MAINTENANCE', 'BLOCKED'],
    default: 'PENDING_APPROVAL'
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('facility', facilitySchema);