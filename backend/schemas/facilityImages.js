var mongoose = require('mongoose');

var facilityImageSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'facility',
    required: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  isPrimary: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('facilityImage', facilityImageSchema);