var mongoose = require('mongoose');

var roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],
    required: [true, 'Role name is required'],
    unique: true
  },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('role', roleSchema);