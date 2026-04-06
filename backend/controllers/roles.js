var roleModel = require('../schemas/roles');

module.exports = {
  FindAll: async function () {
    return await roleModel.find({ isDeleted: false });
  },

  FindByName: async function (name) {
    return await roleModel.findOne({ name: name, isDeleted: false });
  },

  FindById: async function (id) {
    try {
      return await roleModel.findOne({ _id: id, isDeleted: false });
    } catch (error) {
      return null;
    }
  }
};