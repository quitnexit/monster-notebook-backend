const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true  // Başındaki ve sonundaki boşlukları temizler
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true  // Hep küçük harf
    },
    fullSlug: {  // Yeni alan: tam path
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: false
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null  // Ana kategori ise null
    },
    level: {  // ✨ Bu özelliği ekleyebiliriz
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true  // createdAt ve updatedAt ekler
});

// Kaydetmeden önce level'ı otomatik hesapla    // Kaydetmeden önce fullSlug oluştur
CategorySchema.pre('save', async function(next) {
    try {
        if (this.parent) {
            const parentCategory = await mongoose.model('Category').findById(this.parent);
            if (parentCategory) {
                this.fullSlug = `${parentCategory.fullSlug}/${this.slug}`;
                this.level = parentCategory.level + 1;
            }
        } else {
            this.fullSlug = this.slug;
            this.level = 0;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

module.exports = Category; 