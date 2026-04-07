var notificationModel = require('../schemas/notifications');

module.exports = {
  Create: async function (recipientId, type, title, message, link) {
    var notification = new notificationModel({
      recipient: recipientId,
      type: type,
      title: title,
      message: message,
      link: link || ''
    });
    await notification.save();
    return notification;
  },

  FindByUser: async function (userId) {
    return await notificationModel.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);
  },

  CountUnread: async function (userId) {
    return await notificationModel.countDocuments({ recipient: userId, isRead: false });
  },

  MarkRead: async function (notifId, userId) {
    return await notificationModel.findOneAndUpdate(
      { _id: notifId, recipient: userId },
      { isRead: true },
      { new: true }
    );
  },

  MarkAllRead: async function (userId) {
    return await notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
  }
};