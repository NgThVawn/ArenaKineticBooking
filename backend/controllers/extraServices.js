var extraServiceModel = require('../schemas/extraServices');

module.exports = {
  Create: async function (data) {
    var service = new extraServiceModel(data);
    await service.save();
    return service;
  },

  FindById: async function (id) {
    try {
      return await extraServiceModel.findOne({ _id: id, isDeleted: false });
    } catch (error) {
      return null;
    }
  },

  FindByIds: async function (ids) {
    return await extraServiceModel.find({ _id: { $in: ids }, isDeleted: false, isActive: true });
  },

  FindByFacility: async function (facilityId) {
    return await extraServiceModel.find({ facility: facilityId, isDeleted: false, isActive: true })
      .sort({ name: 1 });
  },
  FindAllForOwner: async function (facilityId) {
    return await extraServiceModel.find({ facility: facilityId, isDeleted: false })
      .sort({ name: 1 });
  },

  FindByFieldSportType: async function (facilityId, sportType) {
    return await extraServiceModel.find({
      facility: facilityId,
      isDeleted: false,
      isActive: true,
      $or: [
        { appliesToSportType: null },
        { appliesToSportType: sportType }
      ]
    }).sort({ name: 1 });
  },

  Update: async function (id, data) {
    return await extraServiceModel.findByIdAndUpdate(id, data, { new: true });
  },

  SoftDelete: async function (id) {
    return await extraServiceModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  },

  // Giữ chỗ khi booking PENDING được tạo
  ReserveStock: async function (serviceId, qty, session) {
    var opts = session ? { session } : {};
    var service = await extraServiceModel.findById(serviceId);
    if (!service) return;
    var available = service.quantity - service.reserved - service.soldCount;
    if (available < qty) {
      throw new Error('Dịch vụ "' + service.name + '" không đủ số lượng (còn ' + available + ')');
    }
    await extraServiceModel.findByIdAndUpdate(serviceId, { $inc: { reserved: qty } }, opts);
  },

  // Xác nhận khi thanh toán thành công (PENDING → CONFIRMED)
  ConfirmReservation: async function (serviceId, qty, session) {
    var opts = session ? { session } : {};
    await extraServiceModel.findByIdAndUpdate(serviceId,
      { $inc: { reserved: -qty, soldCount: qty } }, opts);
  },

  // Giải phóng khi hủy booking PENDING (chưa thanh toán)
  ReleaseReservation: async function (serviceId, qty, session) {
    var opts = session ? { session } : {};
    await extraServiceModel.findByIdAndUpdate(serviceId,
      { $inc: { reserved: -qty } }, opts);
  },

  // Hoàn trả stock khi:
  //   - Booking CONFIRMED bị hủy (soldCount về lại)
  //   - Booking COMPLETED + isReturnable = true (vật phẩm trả lại sau buổi chơi)
  ReturnStock: async function (serviceId, qty, session) {
    var opts = session ? { session } : {};
    await extraServiceModel.findByIdAndUpdate(serviceId,
      { $inc: { soldCount: -qty } }, opts);
  }
};