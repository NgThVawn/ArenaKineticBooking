var facilityModel = require('../schemas/facilities');
var facilityImageModel = require('../schemas/facilityImages');
var reviewModel = require('../schemas/reviews');


module.exports = {
  Create: async function (data) {
    var facility = new facilityModel(data);
    await facility.save();
    return facility;
  },

  FindById: async function (id) {
    try {
      var facility = await facilityModel.findOne({ _id: id, isDeleted: false })
        .populate('owner', 'fullName email phone avatarUrl');
      if (!facility) return null;

      var images = await facilityImageModel.find({ facility: id }).sort({ displayOrder: 1, isPrimary: -1 });
      return { facility, images };
    } catch (error) {
      return null;
    }
  },

  FindAll: async function (filters, page, limit) {
    var query = { isDeleted: false };

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'OPEN';
    }

    if (filters.city) {
      query.city = new RegExp(filters.city, 'i');
    }

    if (filters.name) {
      query.name = new RegExp(filters.name, 'i');
    }

    var skip = ((page || 1) - 1) * (limit || 10);

    if (filters.favoritesOnly && filters.userId) {
      var favorites = await favoriteModel.find({ user: filters.userId });
      var favFacilityIds = favorites.map(function (f) { return f.facility; });
      query._id = { $in: favFacilityIds };
    }

    var facilities = await facilityModel.find(query)
      .populate('owner', 'fullName email')
      .sort({ avgRating: -1, createdAt: -1 })
      .skip(skip).limit(limit || 10);

    var total = await facilityModel.countDocuments(query);

    var facilitiesWithImages = await Promise.all(facilities.map(async function (facility) {
      var image = await facilityImageModel.findOne({ facility: facility._id, isPrimary: true });
      if (!image) {
        image = await facilityImageModel.findOne({ facility: facility._id }).sort({ displayOrder: 1 });
      }
      return { facility, primaryImage: image };
    }));

    return { facilities: facilitiesWithImages, total, page: page || 1, limit: limit || 10 };
  },

  FindByOwner: async function (ownerId) {
    var facilities = await facilityModel.find({ owner: ownerId, isDeleted: false })
      .sort({ createdAt: -1 });

    return await Promise.all(facilities.map(async function (facility) {
      var images = await facilityImageModel.find({ facility: facility._id }).sort({ displayOrder: 1 });
      return { facility, images };
    }));
  },

  Update: async function (id, data) {
    return await facilityModel.findByIdAndUpdate(id, data, { new: true });
  },

  ChangeStatus: async function (id, status) {
    return await facilityModel.findByIdAndUpdate(id, { status: status }, { new: true });
  },

  SoftDelete: async function (id) {
    return await facilityModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  },

  UpdateRatingStats: async function (facilityId) {
    var reviews = await reviewModel.find({ facility: facilityId, isDeleted: false });
    if (reviews.length === 0) {
      await facilityModel.findByIdAndUpdate(facilityId, { avgRating: 0, reviewCount: 0 });
      return;
    }
    var total = reviews.reduce(function (sum, r) { return sum + r.rating; }, 0);
    var avg = Math.round((total / reviews.length) * 10) / 10;
    await facilityModel.findByIdAndUpdate(facilityId, {
      avgRating: avg,
      reviewCount: reviews.length
    });
  },

  AddImage: async function (facilityId, imageUrl, isPrimary, displayOrder) {
    var image = new facilityImageModel({
      facility: facilityId,
      imageUrl: imageUrl,
      isPrimary: isPrimary || false,
      displayOrder: displayOrder || 0
    });
    await image.save();
    return image;
  },

  DeleteImage: async function (imageId) {
    return await facilityImageModel.findByIdAndDelete(imageId);
  },

  FindAllForAdmin: async function (filters, page, limit) {
    var query = { isDeleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.name) query.name = new RegExp(filters.name, 'i');

    var skip = ((page || 1) - 1) * (limit || 20);
    var facilities = await facilityModel.find(query)
      .populate('owner', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit || 20);

    var total = await facilityModel.countDocuments(query);
    return { facilities, total };
  }
};