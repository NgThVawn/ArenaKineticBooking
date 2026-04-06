var fieldModel = require('../schemas/fields');

module.exports = {
  Create: async function (data) {
    var field = new fieldModel(data);
    await field.save();
    return field;
  },

  FindById: async function (id) {
    try {
      return await fieldModel.findOne({ _id: id, isDeleted: false })
        .populate({
          path: 'facility',
          populate: { path: 'owner', select: 'fullName email' }
        });
    } catch (error) {
      return null;
    }
  },

  FindByFacility: async function (facilityId) {
    return await fieldModel.find({ facility: facilityId, isDeleted: false })
      .sort({ createdAt: 1 });
  },

  FindByFacilityAndStatus: async function (facilityId, status) {
    return await fieldModel.find({ facility: facilityId, status: status, isDeleted: false });
  },

  Update: async function (id, data) {
    return await fieldModel.findByIdAndUpdate(id, data, { new: true });
  },

  SoftDelete: async function (id) {
    return await fieldModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }
};