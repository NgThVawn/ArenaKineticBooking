module.exports = {
  Create: async function (data) {
    var blocked = new blockedTimeModel(data);
    await blocked.save();
    return blocked;
  },

  FindById: async function (id) {
    try {
      return await blockedTimeModel.findById(id);
    } catch (error) {
      return null;
    }
  },

  FindByField: async function (fieldId, dateStr) {
    var query = { field: fieldId };
    if (dateStr) query.date = dateStr;
    return await blockedTimeModel.find(query).sort({ date: 1, startTime: 1 });
  },

  Delete: async function (id) {
    return await blockedTimeModel.findByIdAndDelete(id);
  },

  CheckConflict: async function (fieldId, dateStr, startTime, endTime) {
    var conflict = await blockedTimeModel.findOne({
      field: fieldId,
      date: dateStr,
      $and: [
        { startTime: { $lt: endTime } },
        { endTime: { $gt: startTime } }
      ]
    });
    return conflict !== null;
  }
};