var multer = require('multer');
var path = require('path');

var storageSetting = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    var filename = Date.now() + '-' + Math.round(Math.random() * 2e9) + ext;
    cb(null, filename);
  }
});

var filterImage = function (req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh'));
  }
};

module.exports = {
  uploadImage: multer({
    storage: storageSetting,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: filterImage
  })
};