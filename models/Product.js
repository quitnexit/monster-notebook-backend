const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    // Temel bilgiler
    name: {
        type: String,
        required: [true, 'Ürün adı zorunludur'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Ürün açıklaması zorunludur']
    },
    price: {
        type: Number,
        required: [true, 'Ürün fiyatı zorunludur'],
        min: [0, 'Fiyat 0\'dan küçük olamaz']
    },
    
    // Stok bilgileri
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stok 0\'dan küçük olamaz']
    },
    
    // Kategori ilişkisi
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Kategori seçimi zorunludur']
    },
    
    // Ürün görselleri (sadece URL ve meta bilgileri)
    images: [{
        url: String,
        alt: String,
        isMain: {
            type: Boolean,
            default: false
        }
    }],
    
    // Dinamik özellikler (kategori bazlı)
    specifications: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Durum bilgileri
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    // SEO bilgileri
    metaTitle: String,
    metaDescription: String,
    
    // Fiyat geçmişi
    priceHistory: [{
        price: Number,
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Slug oluşturma middleware
ProductSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Fiyat değiştiyse fiyat geçmişine ekle
    if (this.isModified('price')) {
        this.priceHistory.push({
            price: this.price,
            date: new Date()
        });
    }

    next();
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
module.exports = Product;