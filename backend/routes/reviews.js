var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");

var { checkLogin } = require("../utils/authHandler");
var { ReviewValidator, validatedResult } = require("../utils/validator");

var reviewController = require("../controllers/reviews");
var bookingController = require("../controllers/bookings");
var facilityController = require("../controllers/facilities");
var bookingModel = require("../schemas/bookings");

// GET /api/v1/reviews/facility/:facilityId  (public)
router.get("/facility/:facilityId", async function (req, res) {
  try {
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 10;
    var result = await reviewController.FindByFacility(
      req.params.facilityId,
      page,
      limit,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/reviews
router.post(
  "/",
  checkLogin,
  ReviewValidator,
  validatedResult,
  async function (req, res) {
    var session = await mongoose.startSession();
    session.startTransaction();
    try {
      var { bookingId, rating, comment } = req.body;

      var booking = await bookingController.FindById(bookingId);
      if (!booking) throw new Error("Không tìm thấy đặt sân");
      if (String(booking.user._id) !== String(req.user._id))
        throw new Error("Không có quyền đánh giá");
      if (booking.status !== "COMPLETED")
        throw new Error("Chỉ có thể đánh giá sau khi hoàn thành đặt sân");
      if (booking.isReviewed) throw new Error("Đặt sân này đã được đánh giá");
      var facilityId =
        booking.field && booking.field.facility
          ? booking.field.facility._id
          : null;
      if (!facilityId) throw new Error("Không xác định được cơ sở của đặt sân");
      var review = await reviewController.CreateReview(
        {
          user: req.user._id,
          facility: facilityId,
          booking: bookingId,
          rating: parseInt(rating),
          comment: comment || "",
        },
        session,
      );

      await session.commitTransaction();
      await facilityController.UpdateRatingStats(facilityId);
      return res
        .status(201)
        .json({ success: true, message: "Đánh giá thành công", data: review });
    } catch (error) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: error.message });
    } finally {
      session.endSession();
    }
  },
);

// DELETE /api/v1/reviews/:id
router.delete("/:id", checkLogin, async function (req, res) {
  try {
    var reviewModel = require("../schemas/reviews");
    var review = await reviewModel.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đánh giá" });

    var userRoles = req.user.roles.map(function (r) {
      return r.name;
    });
    var isAdmin =
      userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
    if (!isAdmin && String(review.user) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền xóa đánh giá này" });
    }

    await reviewController.SoftDelete(req.params.id);
    if (review.booking) {
      await bookingModel.findByIdAndUpdate(review.booking, { isReviewed: false });
    }

    await facilityController.UpdateRatingStats(review.facility);
    return res.json({ success: true, message: "Xóa đánh giá thành công" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
