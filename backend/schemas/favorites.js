var mongoose = require('mongoose');

var favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'facility',
    required: true
  }
}, { timestamps: true });

favoriteSchema.index({ user: 1, facility: 1 }, { unique: true });

module.exports = mongoose.model('favorite', favoriteSchema);