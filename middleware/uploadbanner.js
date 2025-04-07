const multer = require('multer');
const path = require('path');

const bannerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/banners/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadBanner = multer({
    storage: bannerStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Sadece .jpeg, .png ve .gif formatları kabul edilir'));
        }
    }
});

module.exports = uploadBanner;