var jwt = require('jsonwebtoken');
var userModel = require('../schemas/users');

module.exports = {
  checkLogin: async function (req, res, next) {
    try {
      var token;

      if (req.cookies && req.cookies.TOKEN_LOGIN) {
        token = req.cookies.TOKEN_LOGIN;
      } else if (req.headers.authorization) {
        var authHeader = req.headers.authorization;
        if (!authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        }
        token = authHeader.split(' ')[1];
      } else {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      var decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      if (decoded.exp * 1000 <= Date.now()) {
        return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
      }

      var user = await userModel.findOne({
        _id: decoded.id,
        isDeleted: false
      }).populate('roles');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
      }

      if (user.isBanned) {
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa: ' + user.banReason });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
  },

  checkRole: function (...requiredRoles) {
    return function (req, res, next) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }
      var userRoles = req.user.roles.map(function (r) { return r.name; });
      var hasRole = requiredRoles.some(function (r) { return userRoles.includes(r); });
      if (hasRole) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    };
  },

  optionalLogin: async function (req, res, next) {
    try {
      var token;
      if (req.cookies && req.cookies.TOKEN_LOGIN) {
        token = req.cookies.TOKEN_LOGIN;
      } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (token) {
        var decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded.exp * 1000 > Date.now()) {
          var user = await userModel.findOne({ _id: decoded.id, isDeleted: false })
            .populate('roles');
          if (user && !user.isBanned) {
            req.user = user;
          }
        }
      }
    } catch (_) {
      // ignore — optional auth
    }
    next();
  }
};