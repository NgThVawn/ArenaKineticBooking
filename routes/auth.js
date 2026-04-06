var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');

var { checkLogin } = require('../utils/authHandler');
var { ChangePasswordValidator } = require('../utils/validator');
var mailHandler = require('../utils/mailHandler');
var { RegisterValidator, LoginValidator, ChangePasswordValidator, validatedResult } = require('../utils/validator');

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

// POST /api/v1/auth/change-password
router.post('/change-password', checkLogin, ChangePasswordValidator, validatedResult, async function (req, res) {
  try {
    var { oldPassword, newPassword } = req.body;
    var user = req.user;

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Tài khoản này không có mật khẩu' });
    }

    var isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    }

    await userController.UpdateUser(user._id, { password: newPassword });
    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async function (req, res) {
  try {
    var { email } = req.body;
    var user = await userController.FindByEmail(email);

    if (user) {
      var token = await userController.GenerateForgotPasswordToken(user._id);
      var resetUrl = (process.env.CLIENT_URL || 'http://localhost:5173') + '/reset-password/' + token;
      try {
        await mailHandler.sendPasswordResetMail(user.email, resetUrl);
      } catch (mailErr) {
        console.error('Failed to send reset email:', mailErr.message);
      }
    }

    // Luôn trả về success để tránh lộ email
    return res.json({ success: true, message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/reset-password/:token
router.post('/reset-password/:token', async function (req, res) {
  try {
    var { token } = req.params;
    var { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    var user = await userController.FindByToken(token);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    await userController.UpdateUser(user._id, { password });
    await userController.ClearForgotPasswordToken(user._id);

    return res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;