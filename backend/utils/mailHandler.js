var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || ''
  }
});

module.exports = {
  sendMail: async function (to, subject, html) {
    try {
      var info = await transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@sportbooking.vn',
        to: to,
        subject: subject,
        html: html
      });
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email error:', error.message);
      throw error;
    }
  },

  sendPasswordResetMail: async function (email, resetUrl) {
    var html = '<p>Nhấn vào link bên dưới để đặt lại mật khẩu (hết hạn sau 10 phút):</p>' +
      '<p><a href="' + resetUrl + '">' + resetUrl + '</a></p>' +
      '<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>';
    return this.sendMail(email, 'Đặt lại mật khẩu - Sport Booking', html);
  },

  sendBookingConfirmationMail: async function (email, bookingCode, fieldName, bookingDate, startTime, endTime) {
    var html = '<h2>Đặt sân thành công!</h2>' +
      '<p>Mã đặt sân: <strong>' + bookingCode + '</strong></p>' +
      '<p>Sân: ' + fieldName + '</p>' +
      '<p>Ngày: ' + bookingDate + '</p>' +
      '<p>Giờ: ' + startTime + ' - ' + endTime + '</p>' +
      '<p>Vui lòng thanh toán đặt cọc để xác nhận đặt sân.</p>';
    return this.sendMail(email, 'Xác nhận đặt sân - ' + bookingCode, html);
  },

  sendPaymentSuccessMail: async function (email, bookingCode, amount) {
    var html = '<h2>Thanh toán thành công!</h2>' +
      '<p>Mã đặt sân: <strong>' + bookingCode + '</strong></p>' +
      '<p>Số tiền đặt cọc: <strong>' + amount.toLocaleString('vi-VN') + ' VNĐ</strong></p>' +
      '<p>Đặt sân của bạn đã được xác nhận.</p>';
    return this.sendMail(email, 'Thanh toán thành công - ' + bookingCode, html);
  }
};