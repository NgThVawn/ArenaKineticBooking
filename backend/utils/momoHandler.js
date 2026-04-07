var crypto = require('crypto');
var axios = require('axios');

function extractBookingCode(orderId) {
  var idx = orderId.lastIndexOf('-');
  if (idx === -1) return orderId;
  return orderId.substring(0, idx);
}

module.exports = {
  createPaymentUrl: async function (booking) {
    var partnerCode = process.env.MOMO_PARTNER_CODE;
    var accessKey = process.env.MOMO_ACCESS_KEY;
    var secretKey = process.env.MOMO_SECRET_KEY;
    var redirectUrl = process.env.MOMO_RETURN_URL;
    var ipnUrl = process.env.MOMO_IPN_URL;
    var requestType = 'payWithMethod';

    var orderId = booking.bookingCode + '-' + Date.now();
    var requestId = orderId;
    var amount = Math.round(booking.depositAmount);
    var orderInfo = 'Dat coc san ' + booking.bookingCode;
    var extraData = '';
    var autoCapture = true;
    var lang = 'vi';

    var rawSignature = [
      'accessKey=' + accessKey,
      'amount=' + amount,
      'extraData=' + extraData,
      'ipnUrl=' + ipnUrl,
      'orderId=' + orderId,
      'orderInfo=' + orderInfo,
      'partnerCode=' + partnerCode,
      'redirectUrl=' + redirectUrl,
      'requestId=' + requestId,
      'requestType=' + requestType
    ].join('&');

    var signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature).digest('hex');

    var body = {
      partnerCode, partnerName: 'Sport Booking', storeId: partnerCode,
      requestId, amount, orderId, orderInfo,
      redirectUrl, ipnUrl, lang, extraData,
      requestType, autoCapture, signature
    };

    var response = await axios.post(process.env.MOMO_PAYMENT_URL, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    return { payUrl: response.data.payUrl, orderId };
  },

  verifyReturnParams: function (queryParams) {
    var secretKey = process.env.MOMO_SECRET_KEY;
    var accessKey = process.env.MOMO_ACCESS_KEY;
    var { partnerCode, orderId, requestId, amount, orderInfo, orderType,
          transId, resultCode, message, payType, responseTime, extraData, signature } = queryParams;

    var rawSignature = [
      'accessKey=' + accessKey,
      'amount=' + amount,
      'extraData=' + extraData,
      'message=' + message,
      'orderId=' + orderId,
      'orderInfo=' + orderInfo,
      'orderType=' + orderType,
      'partnerCode=' + partnerCode,
      'payType=' + payType,
      'requestId=' + requestId,
      'responseTime=' + responseTime,
      'resultCode=' + resultCode,
      'transId=' + transId
    ].join('&');

    var checkSig = crypto.createHmac('sha256', secretKey)
      .update(rawSignature).digest('hex');

    var valid = checkSig === signature;

    return {
      valid,
      success: valid && parseInt(resultCode) === 0,
      orderId, bookingCode: extractBookingCode(orderId),
      transId, amount: parseInt(amount), resultCode: parseInt(resultCode)
    };
  },

  verifyIpn: function (body) {
    var secretKey = process.env.MOMO_SECRET_KEY;
    var accessKey = process.env.MOMO_ACCESS_KEY;

    var rawSignature = [
      'accessKey=' + accessKey,
      'amount=' + body.amount,
      'extraData=' + body.extraData,
      'message=' + body.message,
      'orderId=' + body.orderId,
      'orderInfo=' + body.orderInfo,
      'orderType=' + body.orderType,
      'partnerCode=' + body.partnerCode,
      'payType=' + body.payType,
      'requestId=' + body.requestId,
      'responseTime=' + body.responseTime,
      'resultCode=' + body.resultCode,
      'transId=' + body.transId
    ].join('&');

    var checkSig = crypto.createHmac('sha256', secretKey)
      .update(rawSignature).digest('hex');

    var valid = checkSig === body.signature;

    return {
      valid,
      success: valid && parseInt(body.resultCode) === 0,
      orderId: body.orderId,
      bookingCode: extractBookingCode(body.orderId),
      transId: body.transId,
      amount: parseInt(body.amount)
    };
  },

  extractBookingCode
};