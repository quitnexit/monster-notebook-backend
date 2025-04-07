const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: 'Banner'
  },
  category: {
    type: String,
    required: true,
    enum: ['main', 'sidebar', 'footer']
  },
  position: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Banner', bannerSchema);