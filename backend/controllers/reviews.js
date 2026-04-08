var reviewModel = require("../schemas/reviews");
var bookingModel = require("../schemas/bookings");

module.exports = {
  CreateReview: async function (data, session) {
    var review = new reviewModel(data);
    if (session) {
      await review.save({ session });
    } else {
      await review.save();
    }
    // Đánh dấu booking đã được review
    if (session) {
      await bookingModel.findByIdAndUpdate(
        data.booking,
        { isReviewed: true },
        { session: session },
      );
    } else {
      await bookingModel.findByIdAndUpdate(data.booking, { isReviewed: true });
    }
    return review;
  },

  FindByFacility: async function (facilityId, page, limit) {
    var skip = ((page || 1) - 1) * (limit || 10);
    var reviews = await reviewModel
      .find({ facility: facilityId, isDeleted: false })
      .populate("user", "fullName avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit || 10);
    var total = await reviewModel.countDocuments({
      facility: facilityId,
      isDeleted: false,
    });
    return { reviews, total };
  },

  FindByUser: async function (userId) {
    return await reviewModel
      .find({ user: userId, isDeleted: false })
      .populate("facility", "name address")
      .sort({ createdAt: -1 });
  },

  HasUserReviewed: async function (userId, facilityId) {
    var review = await reviewModel.findOne({
      user: userId,
      facility: facilityId,
      isDeleted: false,
    });
    return review !== null;
  },

  SoftDelete: async function (id) {
    return await reviewModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  },
};
