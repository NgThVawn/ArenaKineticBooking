var userModel = require('../schemas/users');
var crypto = require('crypto');

module.exports = {
  CreateUser: async function (data, session) {
    var newUser = new userModel(data);
    if (session) {
      await newUser.save({ session });
    } else {
      await newUser.save();
    }
    return newUser;
  },

  FindByEmail: async function (email) {
    return await userModel.findOne({ email: email.toLowerCase(), isDeleted: false })
      .populate('roles');
  },

  FindById: async function (id) {
    try {
      return await userModel.findOne({ _id: id, isDeleted: false })
        .populate('roles');
    } catch (error) {
      return null;
    }
  },

  FindByProviderAndProviderId: async function (provider, providerId) {
    return await userModel.findOne({ provider: provider, providerId: providerId, isDeleted: false })
      .populate('roles');
  },

  FindByToken: async function (token) {
    return await userModel.findOne({
      forgotPasswordToken: token,
      forgotPasswordTokenExp: { $gt: new Date() },
      isDeleted: false
    }).populate('roles');
  },

  FindAll: async function (page, limit) {
    var skip = ((page || 1) - 1) * (limit || 20);
    var users = await userModel.find({ isDeleted: false })
      .populate('roles')
      .skip(skip).limit(limit || 20)
      .sort({ createdAt: -1 });
    var total = await userModel.countDocuments({ isDeleted: false });
    return { users, total };
  },

  UpdateUser: async function (id, updateData) {
    return await userModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('roles');
  },

  BanUser: async function (id, reason) {
    return await userModel.findByIdAndUpdate(
      id,
      { isBanned: true, banReason: reason || '' },
      { new: true }
    );
  },

  UnbanUser: async function (id) {
    return await userModel.findByIdAndUpdate(
      id,
      { isBanned: false, banReason: '' },
      { new: true }
    );
  },

  IncrementCompletedBookings: async function (userId) {
    return await userModel.findByIdAndUpdate(
      userId,
      { $inc: { completedBookings: 1 } },
      { new: true }
    );
  },

  GenerateForgotPasswordToken: async function (userId) {
    var token = crypto.randomBytes(32).toString('hex');
    var expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    await userModel.findByIdAndUpdate(userId, {
      forgotPasswordToken: token,
      forgotPasswordTokenExp: expiry
    });
    return token;
  },

  ClearForgotPasswordToken: async function (userId) {
    await userModel.findByIdAndUpdate(userId, {
      forgotPasswordToken: null,
      forgotPasswordTokenExp: null
    });
  }
};