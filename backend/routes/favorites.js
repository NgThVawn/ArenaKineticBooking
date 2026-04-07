var express = require('express');
var router = express.Router();

var { checkLogin } = require('../utils/authHandler');
var favoriteController = require('../controllers/favorites');

// POST /api/v1/favorites/toggle/:facilityId
router.post('/toggle/:facilityId', checkLogin, async function (req, res) {
  try {
    var result = await favoriteController.Toggle(req.user._id, req.params.facilityId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/favorites/my
router.get('/my', checkLogin, async function (req, res) {
  try {
    var favorites = await favoriteController.FindByUser(req.user._id);
    return res.json({ success: true, data: favorites });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;