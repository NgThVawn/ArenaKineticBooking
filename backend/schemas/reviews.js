var mongoose = require('mongoose');

var reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'facility',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'booking',
    required: true,
    unique: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5']
  },
  comment: {
    type: String,
    default: '',
    maxlength: [1000, 'Comment must not exceed 1000 characters']
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

reviewSchema.index({ user: 1, facility: 1, booking: 1 }, { unique: true });

module.exports = mongoose.model('review', reviewSchema);