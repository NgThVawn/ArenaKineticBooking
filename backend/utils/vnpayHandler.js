var crypto = require('crypto');

function sortObject(obj) {
    return Object.keys(obj).sort().reduce(function (sorted, key) {
        sorted[key] = obj[key];
        return sorted;
    }, {});
}

function formatDate(date) {
    var d = date || new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

module.exports = {
    createPaymentUrl: function (booking, clientIp) {
        var tmnCode = process.env.VNPAY_TMN_CODE;
        var secretKey = process.env.VNPAY_HASH_SECRET;
        var vnpUrl = process.env.VNPAY_PAYMENT_URL;
        var returnUrl = process.env.VNPAY_RETURN_URL;
        var timeoutMinutes = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES) || 10;

        var now = new Date();
        var expireDate = addMinutes(now, timeoutMinutes);

        var params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: booking.bookingCode,
            vnp_OrderInfo: 'Dat coc san ' + booking.bookingCode,
            vnp_OrderType: 'other',
            vnp_Amount: Math.round(booking.depositAmount) * 100,
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: clientIp || '127.0.0.1',
            vnp_CreateDate: formatDate(now),
            vnp_ExpireDate: formatDate(expireDate)
        };

        var sortedParams = sortObject(params);
        
        // Đã sửa ở đây: Encode chuẩn URL cho giá trị
        var signData = Object.keys(sortedParams)
            .map(function (key) { return key + '=' + encodeURIComponent(String(sortedParams[key])).replace(/%20/g, '+'); })
            .join('&');

        var hmac = crypto.createHmac('sha512', secretKey);
        var secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // signData đã được encode, nối thẳng vào URL luôn
        return vnpUrl + '?' + signData + '&vnp_SecureHash=' + secureHash;
    },

    verifyReturnParams: function (queryParams) {
        var params = Object.assign({}, queryParams);
        var secureHash = params['vnp_SecureHash'];
        delete params['vnp_SecureHash'];
        delete params['vnp_SecureHashType'];

        var sortedParams = sortObject(params);
        
        // Đã sửa ở đây
        var signData = Object.keys(sortedParams)
            .map(function (key) { return key + '=' + encodeURIComponent(String(sortedParams[key])).replace(/%20/g, '+'); })
            .join('&');

        var hmac = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET);
        var checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        var valid = secureHash === checkHash;
        var success = valid && params['vnp_ResponseCode'] === '00' && params['vnp_TransactionStatus'] === '00';

        return {
            valid, success,
            txnRef: params['vnp_TxnRef'],
            responseCode: params['vnp_ResponseCode'],
            transactionNo: params['vnp_TransactionNo'],
            bankCode: params['vnp_BankCode'],
            cardType: params['vnp_CardType'],
            amount: parseInt(params['vnp_Amount']) / 100,
            payDate: params['vnp_PayDate'],
            orderInfo: params['vnp_OrderInfo']
        };
    },

    verifyIpn: function (queryParams) {
        var params = Object.assign({}, queryParams);
        var secureHash = params['vnp_SecureHash'];
        delete params['vnp_SecureHash'];
        delete params['vnp_SecureHashType'];

        var sortedParams = sortObject(params);
        
        // Đã sửa ở đây
        var signData = Object.keys(sortedParams)
            .map(function (key) { return key + '=' + encodeURIComponent(String(sortedParams[key])).replace(/%20/g, '+'); })
            .join('&');

        var hmac = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET);
        var checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        if (secureHash !== checkHash) {
            return { code: '97', message: 'Invalid Checksum' };
        }

        if (params['vnp_ResponseCode'] !== '00' || params['vnp_TransactionStatus'] !== '00') {
            return { code: '01', message: 'Transaction failed', success: false, txnRef: params['vnp_TxnRef'] };
        }

        return {
            code: '00', message: 'Confirm Success', success: true,
            txnRef: params['vnp_TxnRef'],
            transactionNo: params['vnp_TransactionNo'],
            amount: parseInt(params['vnp_Amount']) / 100,
            bankCode: params['vnp_BankCode'],
            cardType: params['vnp_CardType'],
            payDate: params['vnp_PayDate']
        };
    }
};