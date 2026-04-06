var { body, query, validationResult } = require('express-validator');

var STRONG_PASSWORD_OPTIONS = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
};

var TIME_REGEX = /^\d{2}:\d{2}$/;
var DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

module.exports = {
  validatedResult: function (req, res, next) {
    var result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json(
        result.array().map(function (e) {
          return { [e.path]: e.msg };
        })
      );
    }
    next();
  },

  RegisterValidator: [
    body('fullName').notEmpty().withMessage('Họ tên không được để trống'),
    body('email').notEmpty().withMessage('Email không được để trống')
      .bail().isEmail().withMessage('Email không đúng định dạng'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống')
      .bail().isStrongPassword(STRONG_PASSWORD_OPTIONS)
      .withMessage('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'),
    body('confirmPassword').notEmpty().withMessage('Xác nhận mật khẩu không được để trống')
      .bail().custom(function (value, { req }) {
        if (value !== req.body.password) throw new Error('Mật khẩu xác nhận không khớp');
        return true;
      })
  ],

  LoginValidator: [
    body('email').notEmpty().withMessage('Email không được để trống')
      .bail().isEmail().withMessage('Email không đúng định dạng'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống')
  ],

  ChangePasswordValidator: [
    body('oldPassword').notEmpty().withMessage('Mật khẩu cũ không được để trống'),
    body('newPassword').notEmpty().withMessage('Mật khẩu mới không được để trống')
      .bail().isStrongPassword(STRONG_PASSWORD_OPTIONS)
      .withMessage('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'),
    body('confirmPassword').notEmpty().withMessage('Xác nhận mật khẩu không được để trống')
      .bail().custom(function (value, { req }) {
        if (value !== req.body.newPassword) throw new Error('Mật khẩu xác nhận không khớp');
        return true;
      })
  ],
  UpdateProfileValidator: [
    body('fullName').optional().notEmpty().withMessage('Họ tên không được để trống'),
    body('phone').optional()
  ],
  FacilityValidator: [
    body('name').notEmpty().withMessage('Tên cơ sở không được để trống'),
    body('address').notEmpty().withMessage('Địa chỉ không được để trống'),
    body('city').notEmpty().withMessage('Thành phố không được để trống'),
    body('openTime').optional().matches(TIME_REGEX).withMessage('Giờ mở cửa phải có định dạng HH:mm'),
    body('closeTime').optional().matches(TIME_REGEX).withMessage('Giờ đóng cửa phải có định dạng HH:mm')
  ],
  AvailabilityValidator: [
    query('date').notEmpty().withMessage('Ngày không được để trống')
      .bail().matches(DATE_REGEX).withMessage('Ngày phải có định dạng YYYY-MM-DD')
  ],
  // Các validator khác sẽ được thêm ở các bước tiếp theo
};