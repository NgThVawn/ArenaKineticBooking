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
   BlockedTimeValidator: [
    body('fieldId').notEmpty().withMessage('ID sân không được để trống')
      .bail().isMongoId().withMessage('ID sân không hợp lệ'),
    body('date').notEmpty().withMessage('Ngày không được để trống')
      .bail().matches(DATE_REGEX).withMessage('Ngày phải có định dạng YYYY-MM-DD'),
    body('startTime').notEmpty().withMessage('Giờ bắt đầu không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ bắt đầu phải có định dạng HH:mm'),
    body('endTime').notEmpty().withMessage('Giờ kết thúc không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ kết thúc phải có định dạng HH:mm')
  ],
  BookingValidator: [
    body('fieldId').notEmpty().withMessage('ID sân không được để trống')
      .bail().isMongoId().withMessage('ID sân không hợp lệ'),
    body('bookingDate').notEmpty().withMessage('Ngày đặt không được để trống')
      .bail().matches(DATE_REGEX).withMessage('Ngày đặt phải có định dạng YYYY-MM-DD'),
    body('startTime').notEmpty().withMessage('Giờ bắt đầu không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ bắt đầu phải có định dạng HH:mm'),
    body('endTime').notEmpty().withMessage('Giờ kết thúc không được để trống')
      .bail().matches(TIME_REGEX).withMessage('Giờ kết thúc phải có định dạng HH:mm')
      .bail().custom(function (value, { req }) {
        if (value <= req.body.startTime) throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
        return true;
      })
  ],
   ReviewValidator: [
    body('facilityId').notEmpty().withMessage('ID cơ sở không được để trống')
      .bail().isMongoId().withMessage('ID cơ sở không hợp lệ'),
    body('bookingId').notEmpty().withMessage('ID đặt sân không được để trống')
      .bail().isMongoId().withMessage('ID đặt sân không hợp lệ'),
    body('rating').notEmpty().withMessage('Đánh giá không được để trống')
      .bail().isInt({ min: 1, max: 5 }).withMessage('Đánh giá phải từ 1 đến 5'),
    body('comment').optional().isLength({ max: 1000 }).withMessage('Nhận xét không được vượt quá 1000 ký tự')
  ],
  InvoiceValidator: [
    body('actualStartTime').optional().matches(TIME_REGEX).withMessage('Giờ bắt đầu thực tế phải có định dạng HH:mm'),
    body('actualEndTime').optional().matches(TIME_REGEX).withMessage('Giờ kết thúc thực tế phải có định dạng HH:mm'),
    body('additionalItems').optional().isArray().withMessage('Danh sách phụ phí phải là mảng'),
    body('additionalItems.*.description').notEmpty().withMessage('Mô tả phụ phí không được để trống'),
    body('additionalItems.*.quantity').isInt({ min: 1 }).withMessage('Số lượng phải là số nguyên dương'),
    body('additionalItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Đơn giá phải là số dương')
  ],
  // Các validator khác sẽ được thêm ở các bước tiếp theo
};