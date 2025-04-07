const multer = require('multer');
const path = require('path');

// Depolama ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/products/') // Resimlerin kaydedileceği klasör
    },
    filename: function (req, file, cb) {
        // Benzersiz dosya adı oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// Dosya filtreleme (sadece resim dosyaları)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false)
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // max 5MB
    }
});

module.exports = upload; 