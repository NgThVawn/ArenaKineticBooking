var express = require('express');
var router = express.Router();

var { checkLogin } = require('../utils/authHandler');
var vnpayHandler = require('../utils/vnpayHandler');
var momoHandler = require('../utils/momoHandler');

var bookingController = require('../controllers/bookings');
var paymentController = require('../controllers/payments');
var notificationController = require('../controllers/notifications');
var extraServiceController = require('../controllers/extraServices');

// POST /api/v1/payments/vnpay/create
router.post('/vnpay/create', checkLogin, async function (req, res) {
  try {
    var { bookingCode } = req.body;
    var booking = await bookingController.FindByCode(bookingCode);

    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });
    if (String(booking.user._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền thanh toán đặt sân này' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Đặt sân không ở trạng thái chờ thanh toán' });
    }

    var clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    var payUrl = vnpayHandler.createPaymentUrl(booking, clientIp);

    await paymentController.UpsertPayment(booking._id, {
      txnRef: booking.bookingCode,
      amount: booking.depositAmount,
      status: 'PENDING',
      paymentMethod: 'VNPAY',
      orderInfo: 'Dat coc san ' + booking.bookingCode
    });

    return res.json({ success: true, data: { payUrl } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/payments/vnpay-return  (VNPay redirect về)
router.get('/vnpay-return', async function (req, res) {
  try {
    var result = vnpayHandler.verifyReturnParams(req.query);

    if (!result.valid) {
      return res.json({ success: false, message: 'Chữ ký không hợp lệ' });
    }

    var payment = await paymentController.FindByTxnRef(result.txnRef);
    var booking = payment ? await bookingController.FindByCode(result.txnRef) : null;

    if (!booking) {
      return res.json({ success: false, message: 'Không tìm thấy đặt sân' });
    }

    if (payment && payment.status !== 'PENDING') {
      return res.json({ success: true, message: 'Đã xử lý', data: { bookingCode: result.txnRef } });
    }

    var io = req.app ? req.app.get('io') : null;

    if (result.success) {
      await paymentController.UpdateByTxnRef(result.txnRef, {
        status: 'SUCCESS',
        vnpTransactionNo: result.transactionNo,
        bankCode: result.bankCode,
        cardType: result.cardType,
        payDate: result.payDate,
        responseCode: result.responseCode
      });
      await bookingController.UpdateStatus(booking._id, 'CONFIRMED');

      // Chuyển reserved → soldCount cho từng dịch vụ
      if (booking.extraServices) {
        for (var extra of booking.extraServices) {
          try { await extraServiceController.ConfirmReservation(extra.extraService, extra.quantity); } catch (_) {}
        }
      }

      try {
        var userNotif = await notificationController.Create(
          booking.user._id, 'PAYMENT_SUCCESS',
          'Thanh toán thành công',
          'Thanh toán đặt cọc cho đặt sân ' + result.txnRef + ' thành công.',
          '/bookings/' + booking._id
        );
        if (io) io.sendToUser(String(booking.user._id), userNotif);

        var ownerId = booking.field && booking.field.facility && booking.field.facility.owner._id;
        if (ownerId) {
          var ownerNotif = await notificationController.Create(
            ownerId, 'PAYMENT_RECEIVED',
            'Nhận thanh toán',
            'Khách đã thanh toán đặt cọc cho đặt sân ' + result.txnRef,
            '/owner/bookings/' + booking._id
          );
          if (io) io.sendToUser(String(ownerId), ownerNotif);
        }
      } catch (_) {}

      return res.json({
        success: true, message: 'Thanh toán thành công',
        data: { bookingCode: result.txnRef, transactionNo: result.transactionNo }
      });
    } else {
      await paymentController.UpdateByTxnRef(result.txnRef, {
        status: 'FAILED',
        responseCode: result.responseCode
      });

      try {
        var failNotif = await notificationController.Create(
          booking.user._id, 'PAYMENT_FAILED',
          'Thanh toán thất bại',
          'Thanh toán cho đặt sân ' + result.txnRef + ' thất bại.',
          '/bookings/' + booking._id
        );
        if (io) io.sendToUser(String(booking.user._id), failNotif);
      } catch (_) {}

      return res.json({ success: false, message: 'Thanh toán thất bại', data: { bookingCode: result.txnRef } });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/payments/vnpay-ipn  (VNPay IPN server callback)
router.post('/vnpay-ipn', async function (req, res) {
  try {
    var result = vnpayHandler.verifyIpn(req.query);

    if (result.code !== '00' && result.code !== '01') {
      return res.json({ RspCode: result.code, Message: result.message });
    }

    var payment = await paymentController.FindByTxnRef(result.txnRef);
    if (!payment) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (result.success) {
      var booking = await bookingController.FindByCode(result.txnRef);
      await paymentController.UpdateByTxnRef(result.txnRef, {
        status: 'SUCCESS',
        vnpTransactionNo: result.transactionNo,
        bankCode: result.bankCode,
        cardType: result.cardType,
        payDate: result.payDate
      });
      if (booking) {
        await bookingController.UpdateStatus(booking._id, 'CONFIRMED');
        if (booking.extraServices) {
          for (var extra of booking.extraServices) {
            try { await extraServiceController.ConfirmReservation(extra.extraService, extra.quantity); } catch (_) {}
          }
        }
      }
    } else {
      await paymentController.UpdateByTxnRef(result.txnRef, { status: 'FAILED' });
    }

    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    return res.json({ RspCode: '99', Message: error.message });
  }
});

// POST /api/v1/payments/momo/create
router.post('/momo/create', checkLogin, async function (req, res) {
  try {
    var { bookingCode } = req.body;
    var booking = await bookingController.FindByCode(bookingCode);

    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt sân' });
    if (String(booking.user._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Không có quyền thanh toán đặt sân này' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Đặt sân không ở trạng thái chờ thanh toán' });
    }

    var momoResult = await momoHandler.createPaymentUrl(booking);

    await paymentController.UpsertPayment(booking._id, {
      txnRef: momoResult.orderId,
      amount: booking.depositAmount,
      status: 'PENDING',
      paymentMethod: 'MOMO',
      orderInfo: 'Dat coc san ' + booking.bookingCode
    });

    return res.json({ success: true, data: { payUrl: momoResult.payUrl, orderId: momoResult.orderId } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/payments/momo-return  (MoMo redirect về)
router.get('/momo-return', async function (req, res) {
  try {
    var result = momoHandler.verifyReturnParams(req.query);

    if (!result.valid) {
      return res.json({ success: false, message: 'Chữ ký không hợp lệ' });
    }

    var booking = await bookingController.FindByCode(result.bookingCode);
    var payment = await paymentController.FindByTxnRef(result.orderId);

    if (!booking) return res.json({ success: false, message: 'Không tìm thấy đặt sân' });
    if (payment && payment.status !== 'PENDING') {
      return res.json({ success: true, message: 'Đã xử lý', data: { bookingCode: result.bookingCode } });
    }

    var io = req.app ? req.app.get('io') : null;

    if (result.success) {
      await paymentController.UpdateByTxnRef(result.orderId, {
        status: 'SUCCESS',
        momoTransId: result.transId
      });
      await bookingController.UpdateStatus(booking._id, 'CONFIRMED');

      // Chuyển reserved → soldCount cho từng dịch vụ
      if (booking.extraServices) {
        for (var extra of booking.extraServices) {
          try { await extraServiceController.ConfirmReservation(extra.extraService, extra.quantity); } catch (_) {}
        }
      }

      try {
        var userNotif = await notificationController.Create(
          booking.user._id, 'PAYMENT_SUCCESS',
          'Thanh toán thành công',
          'Thanh toán đặt cọc cho đặt sân ' + result.bookingCode + ' thành công.',
          '/bookings/' + booking._id
        );
        if (io) io.sendToUser(String(booking.user._id), userNotif);
      } catch (_) {}

      return res.json({ success: true, message: 'Thanh toán thành công', data: { bookingCode: result.bookingCode } });
    } else {
      await paymentController.UpdateByTxnRef(result.orderId, { status: 'FAILED' });
      return res.json({ success: false, message: 'Thanh toán thất bại', data: { bookingCode: result.bookingCode } });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/payments/momo-ipn  (MoMo IPN webhook)
router.post('/momo-ipn', async function (req, res) {
  try {
    var result = momoHandler.verifyIpn(req.body);

    if (!result.valid) {
      return res.json({ partnerCode: req.body.partnerCode, requestId: req.body.requestId, orderId: req.body.orderId, resultCode: 1, message: 'Invalid signature' });
    }

    var payment = await paymentController.FindByTxnRef(result.orderId);
    if (!payment || payment.status !== 'PENDING') {
      return res.json({ partnerCode: req.body.partnerCode, requestId: req.body.requestId, orderId: req.body.orderId, resultCode: 0, message: 'Already processed' });
    }

    if (result.success) {
      var booking = await bookingController.FindByCode(result.bookingCode);
      await paymentController.UpdateByTxnRef(result.orderId, { status: 'SUCCESS', momoTransId: result.transId });
      if (booking) {
        await bookingController.UpdateStatus(booking._id, 'CONFIRMED');
        if (booking.extraServices) {
          for (var extra of booking.extraServices) {
            try { await extraServiceController.ConfirmReservation(extra.extraService, extra.quantity); } catch (_) {}
          }
        }
      }
    } else {
      await paymentController.UpdateByTxnRef(result.orderId, { status: 'FAILED' });
    }

    return res.json({ partnerCode: req.body.partnerCode, requestId: req.body.requestId, orderId: req.body.orderId, resultCode: 0, message: 'Success' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;