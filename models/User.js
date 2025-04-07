const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    }
});

// Eğer model zaten varsa onu kullan, yoksa yeni model oluştur
const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;