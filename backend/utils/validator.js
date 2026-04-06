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
   FieldValidator: [
    body('name').notEmpty().withMessage('Tên sân không được để trống'),
    body('sportType').notEmpty().withMessage('Loại thể thao không được để trống')
      .bail().isIn(['FOOTBALL', 'TENNIS', 'BADMINTON', 'BASKETBALL', 'VOLLEYBALL', 'PICKLEBALL'])
      .withMessage('Loại thể thao không hợp lệ'),
    body('pricePerHour').notEmpty().withMessage('Giá thuê không được để trống')
      .bail().isFloat({ min: 0 }).withMessage('Giá thuê phải là số dương')
  ],
  PriceRuleValidator: [
    body('name').notEmpty().withMessage('Tên quy tắc giá không được để trống'),
    body('dayType').notEmpty().withMessage('Loại ngày không được để trống')
      .bail().isIn(['ALL', 'WEEKDAY', 'WEEKEND']).withMessage('Loại ngày không hợp lệ'),
    body('startTime').notEmpty().withMessage('Giờ bắt đầu không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ bắt đầu phải có định dạng HH:mm'),
    body('endTime').notEmpty().withMessage('Giờ kết thúc không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ kết thúc phải có định dạng HH:mm'),
    body('pricePerHour').notEmpty().withMessage('Giá mỗi giờ không được để trống')
      .bail().isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
    body('fieldId').notEmpty().withMessage('ID sân không được để trống')
      .bail().isMongoId().withMessage('ID sân không hợp lệ')
  ],

  PriceQueryValidator: [
    query('date').notEmpty().withMessage('Ngày không được để trống')
      .bail().matches(DATE_REGEX).withMessage('Ngày phải có định dạng YYYY-MM-DD'),
    query('start').notEmpty().withMessage('Giờ bắt đầu không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ bắt đầu phải có định dạng HH:mm'),
    query('end').notEmpty().withMessage('Giờ kết thúc không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ kết thúc phải có định dạng HH:mm')
  ],
  ExtraServiceValidator: [
    body('name').notEmpty().withMessage('Tên dịch vụ không được để trống'),
    body('price').notEmpty().withMessage('Giá dịch vụ không được để trống')
      .bail().isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
    body('facilityId').notEmpty().withMessage('ID cơ sở không được để trống')
      .bail().isMongoId().withMessage('ID cơ sở không hợp lệ')
  ],
  // Các validator khác sẽ được thêm ở các bước tiếp theo
};