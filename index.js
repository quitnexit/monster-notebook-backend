const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const laptopRoutes = require('./routes/laptop');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
require('dotenv').config();



const app = express();

// CORS ayarları
app.use(cors({
    origin: 'http://localhost:3000', // Next.js uygulamanızın adresi
    credentials: true
}));

// JSON verilerini işlemek için middleware
app.use(express.json());

// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/shopdb')
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch((err) => console.error('MongoDB bağlantı hatası:', err));

const port = process.env.PORT || 5000;


// Resim yükleme için storage konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/products/') // Resimlerin kaydedileceği klasör
    },
    filename: function (req, file, cb) {
        // Benzersiz dosya adı oluştur: timestamp-randomnumber.uzantı
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Sadece resim dosyalarını kabul et
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // max 5MB
    }
});

// Statik dosya sunucusu - resimlere erişim için
app.use('/uploads', express.static('uploads'));

// Laptoplar için laptop rotalarını kullan
app.use('/api', laptopRoutes);

app.get('/', (req, res) => {
    res.send('Merhaba Dünya!');
});


// Kullanıcı kayıt rotası
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu email zaten kayıtlı' });
        }

        // Şifreyi hashleme
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcı oluşturma
        const user = new User({
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi' });
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});


// Login rotası
app.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email ve şifre gerekli' });
        }

        // Kullanıcıyı veritabanında ara
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
        }

        // Şifreyi doğrula
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
        }

        // Token'ın süresi, "Beni hatırla" seçeneğine bağlı olarak ayarlanacak
        const expiresIn = rememberMe ? '7d' : '1m'; // "Beni hatırla" seçeneği ile 7 gün, yoksa 1 saat

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        // Token'ı ve kullanıcı bilgilerini gönder
        res.json({ 
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                email: user.email
            },
            expiresIn
        });
        console.log(expiresIn)

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});


// Token doğrulama middleware'i
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Token bulunamadı' });
    }

    try {
        // jwt.verify otomatik olarak token süresini kontrol eder
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli-anahtar');
        req.user = decoded; // Token bilgilerini request nesnesine ekle
        next();
    } catch (error) {
        // Token süresi dolmuşsa TokenExpiredError hatası fırlatır
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token süresi dolmuş',
                expired: true   // Frontend'e gönderilen özel flag
            });
        }
        return res.status(403).json({ message: 'Geçersiz token' });
    }
};

// Token kontrolü için endpoint
app.get('/verify-token', authenticateToken, (req, res) => {
    res.json({ 
        isValid: true,
        user: {
            email: req.user.email,
            userId: req.user.userId
        }
    });
});



/*
// 1. Silinen ürünleri listeleme
app.get('/api/products/deleted', async (req, res) => {
    try {
        const deletedProducts = await Product.find({ isDeleted: true })
            .populate('category', 'name slug');

        res.json({
            count: deletedProducts.length,
            products: deletedProducts
        });

        if (!deletedProducts) {
            return res.status(404).json({ 
                message: 'Silinen ürün bulunamadı',
                error: error.message
            });
        }
    } catch (error) {
        res.status(500).json({ 
            message: 'Silinen ürünler listelenirken hata oluştu', 
            error: error.message 
        });
    }
});


// 2. Silinen ürünü geri getirme
app.post('/api/products/:identifier(*)/restore', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let product;

        // Ürünü bul
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            product = await Product.findById(identifier);
        } else {
            product = await Product.findOne({ slug: identifier });
        }

        if (!product) {
            return res.status(404).json({ 
                message: 'Ürün bulunamadı',
                requestedIdentifier: identifier 
            });
        }

        if (!product.isDeleted) {
            return res.status(400).json({ 
                message: 'Bu ürün zaten aktif durumda'
            });
        }

        // Ürünü geri getir
        product.isDeleted = false;
        product.isActive = true;
        await product.save();

        res.json({ 
            message: 'Ürün başarıyla geri getirildi',
            restoredProduct: product 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürün geri getirilirken hata oluştu', 
            error: error.message 
        });
    }
});


// 1. Kategoriye ait ürün oluşturma
app.post('/api/:categorySlug/products', upload.array('images', 5), async (req, res) => {
    try {
        const { categorySlug } = req.params;
        const { name, description, price, specifications, stock } = req.body;

        // Yüklenen resimlerin bilgilerini hazırla
        const imageObjects = req.files ? req.files.map((file, index) => ({
            url: `/uploads/products/${file.filename}`,
            alt: name, // Resim alt text'i olarak ürün adını kullan
            isMain: index === 0 // İlk resmi ana resim olarak işaretle
        })) : [];

        // Kategoriyi slug ile bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        const product = new Product({
            name,
            description,
            price,
            category: category._id,
            specifications: typeof specifications === 'string' ? JSON.parse(specifications) : specifications,
            images: imageObjects,
            stock
        });

        await product.save();
        await product.populate('category', 'name slug');
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürün oluşturulurken hata oluştu', 
            error: error.message 
        });
    }
});

// 2. Kategoriye ait ürünleri listeleme
app.get('/api/:categorySlug/products', async (req, res) => {
    try {
        const { categorySlug } = req.params;
        
        // Kategoriyi slug ile bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        const products = await Product.find({ 
            category: category._id,
            isDeleted: false 
        }).populate('category', 'name slug');

        res.json(products);
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürünler listelenirken hata oluştu', 
            error: error.message 
        });
    }
});


// 3. Kategoriye ait tek bir ürünü getirme
app.get('/api/:categorySlug/:productSlug(*)', async (req, res) => {
    try {
        const { categorySlug, productSlug } = req.params;

        // Önce kategoriyi bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        // Sonra bu kategoriye ait ürünü bul
        const product = await Product.findOne({
            slug: productSlug,
            category: category._id,
            isDeleted: false
        }).populate('category', 'name slug');

        if (!product) {
            return res.status(404).json({ 
                message: 'Ürün bulunamadı',
                requestedSlug: productSlug 
            });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürün getirme hatası', 
            error: error.message 
        });
    }
});


// 4. Kategorideki ürünü güncelleme
app.put('/api/:categorySlug/:productSlug(*)', async (req, res) => {
    try {
        const { categorySlug, productSlug } = req.params;
        const updates = req.body;

        // Önce kategoriyi bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        // Sonra ürünü bul
        const product = await Product.findOne({
            slug: productSlug,
            category: category._id,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).json({ 
                message: 'Ürün bulunamadı',
                requestedSlug: productSlug 
            });
        }

        // Güncelleme yapılacak alanları kontrol et
        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'slug') { // _id, slug manuel güncellenmemeli
                product[key] = updates[key];
            }
        });

        await product.save();
        await product.populate('category', 'name slug');
        res.json(product);
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürün güncellenirken hata oluştu', 
            error: error.message 
        });
    }
});

// 5. Kategorideki ürünü silme
app.delete('/api/:categorySlug/:productSlug(*)', async (req, res) => {
    try {
        const { categorySlug, productSlug } = req.params;
        const { permanent = false } = req.query; // URL'de ?permanent=true parametresi

        // Önce kategoriyi bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        let product;
        if (permanent) {
            // Kalıcı silme
            product = await Product.findOneAndDelete({
                slug: productSlug,
                category: category._id
            });
        } else {
            // Soft delete
            product = await Product.findOne({
                slug: productSlug,
                category: category._id,
                isDeleted: false
            });

            if (product) {
                product.isDeleted = true;
                product.isActive = false;
                await product.save();
            }
        }

        if (!product) {
            return res.status(404).json({ 
                message: 'Ürün bulunamadı',
                requestedSlug: productSlug 
            });
        }

        res.json({ 
            message: permanent ? 'Ürün kalıcı olarak silindi' : 'Ürün pasife alındı',
            deletedProduct: product 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Ürün silinirken hata oluştu', 
            error: error.message 
        });
    }
});
*/

// 1. Yeni kategori oluşturma
app.post('/api/categories', async (req, res) => {
    try {
        const { name, description, parent } = req.body;
        
        // Slug oluştur (örn: "Oyun Laptopları" -> "oyun-laptoplari")
        const slug = name
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

        const category = new Category({
            name,
            slug,
            description,
            parent
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ 
            message: 'Kategori oluşturulurken hata oluştu', 
            error: error.message 
        });
    }
});

// 2. Tüm kategorileri listeleme
app.get('/api/categories', async (req, res) => {
    try {
        const mainCategories = await Category.find({ parent: null });
        
        const categories = await Promise.all(mainCategories.map(async (category) => {
            const categoryObj = category.toObject();
            
            // Bu kategori ve alt kategorilerindeki toplam ürün sayısını hesapla
            const products = await Product.find({
                'category.fullSlug': { $regex: `^${category.fullSlug}` },
                isActive: true,
                isDeleted: { $ne: true }
            });
            
            categoryObj.productCount = products.length;
            categoryObj.subcategories = await getSubcategoriesWithCount(category._id);
            return categoryObj;
        }));

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Kategoriler getirilirken hata oluştu' });
    }
});

async function getSubcategoriesWithCount(parentId) {
    const subcategories = await Category.find({ parent: parentId });
    
    return Promise.all(subcategories.map(async (category) => {
        const categoryObj = category.toObject();
        
        // Her alt kategori için ürün sayısını hesapla
        const products = await Product.find({
            'category.fullSlug': { $regex: `^${category.fullSlug}` },
            isActive: true,
            isDeleted: { $ne: true }
        });
        
        categoryObj.productCount = products.length;
        categoryObj.subcategories = await getSubcategoriesWithCount(category._id);
        return categoryObj;
    }));
}

// 3. Tek bir kategoriyi getirme (id, slug veya fullSlug ile)
app.get('/api/categories/:identifier(*)', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let category;

        // 1. MongoDB ObjectId formatında mı kontrol et
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            category = await Category.findById(identifier);
        } 
        // 2. Slash (/) içeriyorsa fullSlug olarak ara
        else if (identifier.includes('/')) {
            category = await Category.findOne({ fullSlug: identifier });
        } 
        // 3. Değilse normal slug olarak ara
        else {
            category = await Category.findOne({ slug: identifier });
        }

        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedIdentifier: identifier 
            });
        }

        // Parent bilgilerini getir
        await category.populate('parent');

        // Alt kategorileri de getir
        const subcategories = await Category.find({ parent: category._id });

        // Yanıta alt kategorileri de ekle
        const response = category.toObject();
        response.subcategories = subcategories;

        res.json(response);
    } catch (error) {
        res.status(500).json({ 
            message: 'Kategori getirme hatası', 
            error: error.message 
        });
    }
});

// 4. Kategori güncelleme (id, slug veya fullSlug ile)
app.put('/api/categories/:identifier(*)', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        const { name, description, parent } = req.body;
        let category;

        // Kategoriyi bul
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            category = await Category.findById(identifier);
        } else if (identifier.includes('/')) {
            category = await Category.findOne({ fullSlug: identifier });
        } else {
            category = await Category.findOne({ slug: identifier });
        }

        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedIdentifier: identifier 
            });
        }

        // Yeni slug oluştur
        const newSlug = name
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

        // Kategoriyi güncelle
        category.name = name;
        category.description = description;
        category.slug = newSlug;
        if (parent) category.parent = parent;

        // fullSlug'ı güncelle
        if (category.parent) {
            const parentCategory = await Category.findById(category.parent);
            category.fullSlug = `${parentCategory.fullSlug}/${newSlug}`;
        } else {
            category.fullSlug = newSlug;
        }

        await category.save();

        // Alt kategorilerin fullSlug'larını recursive olarak güncelle
        await updateChildrenFullSlugs(category);

        // Güncellenmiş kategoriyi ve alt kategorilerini getir
        const updatedCategory = await Category.findById(category._id);
        const subcategories = await getAllSubcategories(category._id);

        const response = updatedCategory.toObject();
        response.subcategories = subcategories;

        res.json(response);
    } catch (error) {
        res.status(500).json({ 
            message: 'Kategori güncellenirken hata oluştu', 
            error: error.message 
        });
    }
});

// Alt kategorilerin fullSlug'larını güncelleyen yardımcı fonksiyon
async function updateChildrenFullSlugs(parentCategory) {
    // Bu kategorinin direkt alt kategorilerini bul
    const children = await Category.find({ parent: parentCategory._id });

    // Her bir alt kategori için
    for (let child of children) {
        // fullSlug'ı güncelle
        child.fullSlug = `${parentCategory.fullSlug}/${child.slug}`;
        await child.save();

        // Recursive olarak bu kategorinin alt kategorilerini de güncelle
        await updateChildrenFullSlugs(child);
    }
}

// Tüm alt kategorileri getiren yardımcı fonksiyon
async function getAllSubcategories(categoryId) {
    const subcategories = await Category.find({ parent: categoryId });
    let allSubcategories = [...subcategories];
    
    for (let subcategory of subcategories) {
        const children = await getAllSubcategories(subcategory._id);
        allSubcategories = [...allSubcategories, ...children];
    }
    
    return allSubcategories;
}

// 5. Kategori silme (id, slug veya fullSlug ile)
app.delete('/api/categories/:identifier(*)', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        let category;

        // Kategoriyi bul
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            category = await Category.findById(identifier);
        } else if (identifier.includes('/')) {
            category = await Category.findOne({ fullSlug: identifier });
        } else {
            category = await Category.findOne({ slug: identifier });
        }

        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedIdentifier: identifier 
            });
        }

        // Alt kategorileri kontrol et
        const hasSubcategories = await Category.exists({ parent: category._id });
        if (hasSubcategories) {
            return res.status(400).json({ 
                message: 'Bu kategori alt kategorilere sahip olduğu için silinemez',
                categoryId: category._id,
                categoryName: category.name,
                categorySlug: category.slug 
            });
        }

        // Kategoriyi sil
        await Category.findByIdAndDelete(category._id);

        res.json({ 
            message: 'Kategori başarıyla silindi',
            deletedCategory: category 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Kategori silinirken hata oluştu', 
            error: error.message 
        });
    }
});


app.listen(port, () => {
    console.log(`Sunucu ${port} portunda çalışıyor`);
});