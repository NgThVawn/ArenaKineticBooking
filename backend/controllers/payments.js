var paymentModel = require('../schemas/payments');

module.exports = {
  FindByBooking: async function (bookingId) {
    return await paymentModel.findOne({ booking: bookingId });
  },

  FindByTxnRef: async function (txnRef) {
    return await paymentModel.findOne({ txnRef: txnRef });
  },

  UpsertPayment: async function (bookingId, paymentData) {
    return await paymentModel.findOneAndUpdate(
      { booking: bookingId },
      { ...paymentData, booking: bookingId },
      { upsert: true, new: true }
    );
  },

  UpdateByTxnRef: async function (txnRef, updateData) {
    return await paymentModel.findOneAndUpdate(
      { txnRef: txnRef },
      updateData,
      { new: true }
    );
  }
};