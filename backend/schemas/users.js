var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String },
  phone: { type: String, default: '' },
  avatarUrl: {
    type: String,
    default: 'https://i.sstatic.net/l60Hf.png'
  },
  completedBookings: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'role'
  }],
  provider: {
    type: String,
    enum: ['LOCAL', 'GOOGLE', 'FACEBOOK'],
    default: 'LOCAL'
  },
  providerId: { type: String },
  forgotPasswordToken: { type: String },
  forgotPasswordTokenExp: { type: Date },
  loginCount: { type: Number, default: 0, min: 0 },
  lockTime: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Hash password trước khi save
userSchema.pre('save', function () {
  if (this.isModified('password') && this.password) {
    var salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
});

// Hash password trước khi update
userSchema.pre('findOneAndUpdate', function () {
  if (this._update && this._update.password) {
    var salt = bcrypt.genSaltSync(10);
    this._update.password = bcrypt.hashSync(this._update.password, salt);
  }
});

module.exports = mongoose.model('user', userSchema);