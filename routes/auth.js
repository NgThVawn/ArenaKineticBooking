var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');

var { checkLogin } = require('../utils/authHandler');
var { RegisterValidator, LoginValidator, validatedResult } = require('../utils/validator');

var userController = require('../controllers/users');
var roleController = require('../controllers/roles');

// POST /api/v1/auth/register
router.post('/register', RegisterValidator, validatedResult, async function (req, res) {
  var session = await mongoose.startSession();
  session.startTransaction();
  try {
    var { fullName, email, password, phone, registerAsOwner } = req.body;

    var existing = await userController.FindByEmail(email);
    if (existing) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    var userRole = await roleController.FindByName('USER');
    if (!userRole) {
      await session.abortTransaction();
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống: không tìm thấy role' });
    }

    var roles = [userRole._id];
    if (registerAsOwner) {
      var ownerRole = await roleController.FindByName('OWNER');
      if (ownerRole) roles.push(ownerRole._id);
    }

    var newUser = await userController.CreateUser({
      fullName, email, password, phone: phone || '',
      roles, provider: 'LOCAL'
    }, session);

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { id: newUser._id, email: newUser.email, fullName: newUser.fullName }
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// POST /api/v1/auth/login
router.post('/login', LoginValidator, validatedResult, async function (req, res) {
  try {
    var { email, password } = req.body;

    var user = await userController.FindByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa: ' + user.banReason });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Tài khoản này sử dụng đăng nhập mạng xã hội' });
    }

    // Kiểm tra khóa đăng nhập (3 lần sai → khóa 15 phút)
    if (user.lockTime && user.lockTime > new Date()) {
      return res.status(403).json({ success: false, message: 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần' });
    }

    var isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      var newCount = (user.loginCount || 0) + 1;
      var update = { loginCount: newCount };
      if (newCount >= 3) {
        update.lockTime = new Date(Date.now() + 15 * 60 * 1000);
        update.loginCount = 0;
      }
      await userController.UpdateUser(user._id, update);
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    // Reset login count khi đăng nhập thành công
    await userController.UpdateUser(user._id, { loginCount: 0, lockTime: null });

    var token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('TOKEN_LOGIN', token, {
      maxAge: 7 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          roles: user.roles.map(function (r) { return r.name; })
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', checkLogin, function (req, res) {
  res.cookie('TOKEN_LOGIN', null, { maxAge: 0, httpOnly: true });
  return res.json({ success: true, message: 'Đăng xuất thành công' });
});

// GET /api/v1/auth/me
router.get('/me', checkLogin, function (req, res) {
  var user = req.user;
  return res.json({
    success: true,
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map(function (r) { return r.name; }),
      completedBookings: user.completedBookings,
      emailVerified: user.emailVerified
    }
  });
});

module.exports = router;