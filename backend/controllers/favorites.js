var favoriteModel = require('../schemas/favorites');

module.exports = {
  Toggle: async function (userId, facilityId) {
    var existing = await favoriteModel.findOne({ user: userId, facility: facilityId });
    if (existing) {
      await favoriteModel.findByIdAndDelete(existing._id);
      return { isFavorite: false };
    } else {
      var fav = new favoriteModel({ user: userId, facility: facilityId });
      await fav.save();
      return { isFavorite: true };
    }
  },

  FindByUser: async function (userId) {
    return await favoriteModel.find({ user: userId })
      .populate({
        path: 'facility',
        populate: { path: 'owner', select: 'fullName' }
      })
      .sort({ createdAt: -1 });
  },

  IsFavorite: async function (userId, facilityId) {
    var fav = await favoriteModel.findOne({ user: userId, facility: facilityId });
    return fav !== null;
  }
};