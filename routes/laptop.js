const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const upload = require('../middleware/upload');
const uploadBanner = require('../middleware/uploadbanner');
const laptopSpecifications = require('../models/specifications/LaptopSpecifications'); //referans dosyası, kod akışında kullanılmadı ama laptop
// modelini buradan referans alıyoruz.  





// 6. Silinen laptopları listeleme
router.get('/laptops/deleted', async (req, res) => {
    try {
        const deletedLaptops = await Product.find({ isDeleted: true })
            .populate('category', 'name slug');

        if (!deletedLaptops || deletedLaptops.length === 0) {
            return res.status(404).json({ 
                message: 'Silinen laptop bulunamadı'
            });
        }

        res.json({
            count: deletedLaptops.length,
            laptops: deletedLaptops
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Silinen laptoplar listelenirken hata oluştu', 
            error: error.message 
        });
    }
});

// Laptop ürünü oluşturma
router.post('/laptops', upload.array('images', 10), async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            stock,
            categoryId,
            
            // Basit özellikler
            processor = '',
            graphics = '',
            memory = '',
            display = '',
            storage = '',
            os = '',
            disksupport = '',
            keyboard = '',
            thickness = '',
            weight = '',
            promotion = '',
            material = '',


            

            // Detaylı özellikler
            processorDetails,
            graphicsDetails,
            memoryDetails,
            displayDetails,
            storageDetails,
            designDetails,
            portsDetails,
            hardwarespecsDetails,
            othersDetails
        } = req.body;

        // Yüklenen resimlerin bilgilerini hazırla
        const imageObjects = req.files ? req.files.map((file, index) => ({
            url: `/uploads/products/${file.filename}`,
            alt: name || 'Laptop resmi',
            isMain: index === 0
        })) : [];

        // Güvenli JSON parse fonksiyonu
        const parseJsonSafely = (jsonString) => {
            try {
                return jsonString ? JSON.parse(jsonString) : {};
            } catch (error) {
                return {};
            }
        };

        // Boş specifications yapısı
        const emptySpecs = {
            processor: {
                processorArchitecture: '',
                processor: ''
            },
            graphics: {
                gpu: ''
            },
            memory: {
                ram: ''
            },
            display: {
                screen: ''
            },
            storage: {
                firstPort: '',
                secondPort: ''
            },
            design: {
                dimensions: '',
                weight: '',
                materialtype: '',
                adapter: '',
                battery: ''
            },
            ports: {
                usb2: '',
                usb3: '',
                usb3c: '',
                hdmi: '',
                portsupport: '',
                speakers: '',
                microphone: ''
            },
            hardwarespecs: {
                keyboard: '',
                camera: '',
                wireless: '',
                speakers: '',
                soundsystem: '',
                internalcardreader: '',
                gigaethernet: ''
            },
            others: {
                guarantee: '',
                notification: ''
            }
        };

        // Specifications nesnesini oluştur
        const specifications = {
            simple: {
                processor: processor || '',
                graphics: graphics || '',
                memory: memory || '',
                display: display || '',
                storage: storage || '',
                os: os || '',
                disksupport: disksupport || '',
                keyboard: keyboard || '',
                thickness: thickness || '',
                weight: weight || '',
                promotion: promotion || '',
                material: material || ''
            },
            detailed: {
                processor: { ...emptySpecs.processor, ...parseJsonSafely(processorDetails) },
                graphics: { ...emptySpecs.graphics, ...parseJsonSafely(graphicsDetails) },
                memory: { ...emptySpecs.memory, ...parseJsonSafely(memoryDetails) },
                display: { ...emptySpecs.display, ...parseJsonSafely(displayDetails) },
                storage: { ...emptySpecs.storage, ...parseJsonSafely(storageDetails) },
                design: { ...emptySpecs.design, ...parseJsonSafely(designDetails) },
                ports: { ...emptySpecs.ports, ...parseJsonSafely(portsDetails) },
                hardwarespecs: { ...emptySpecs.hardwarespecs, ...parseJsonSafely(hardwarespecsDetails) },
                others: { ...emptySpecs.others, ...parseJsonSafely(othersDetails) }
            }
        };

        // Yeni ürün oluştur
        const product = new Product({
            name: name || '',
            description: description || '',
            price: isNaN(parseFloat(price)) ? 0 : parseFloat(price),
            stock: isNaN(parseInt(stock)) ? 0 : parseInt(stock),
            category: categoryId,
            specifications,
            images: imageObjects
        });

        await product.save();
        res.status(201).json(product);

    } catch (error) {
        res.status(500).json({
            message: 'Laptop oluşturulurken hata oluştu',
            error: error.message
        });
    }
});


// Filtrelenmiş laptopları getir
router.get('/laptops/filter/:categorySlug(*)', async (req, res) => {
    try {
        const { categorySlug } = req.params;
        const {
            processor,
            graphics,
            processorArchitecture,
            memory,
            storage,
            display,
            os,
            firstPort,
            secondPort,
            minPrice,
            maxPrice,
            inStock,
            sortBy,
            page = 1,         // Varsayılan sayfa numarası
            limit = 12        // Sayfa başına ürün sayısı
        } = req.query;

        // Önce kategoriyi ve alt kategorileri bul
        let category = await Category.findOne({ fullSlug: categorySlug });
        if (!category) {
            category = await Category.findOne({ slug: categorySlug });
        }

        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }

        // Alt kategorileri bul
        const subcategories = await Category.find({
            fullSlug: new RegExp(`^${category.fullSlug}/.*`)
        });

        // Tüm kategori ID'lerini topla
        const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];

        // Temel filtre
        let filter = {
            category: { $in: categoryIds },
            isDeleted: false
        };

        // Özellik filtreleri
        if (processor) {
            // i7-13700H gibi bir işlemci geldiğinde
            // "Intel® Raptor Lake Core™ i7-13700H " şeklinde arayalım
            // Yani işlemciden sonra boşluk veya noktalama işareti gelsin
            filter['specifications.simple.processor'] = { 
                $regex: `${processor}(?=[\\s;,.]|$)`,  // işlemciden sonra boşluk, noktalı virgül, virgül, nokta veya string sonu
                $options: 'i' 
            };
        }

        if (processorArchitecture) {
            filter['specifications.detailed.processor.processorArchitecture'] = { $regex: processorArchitecture, $options: 'i' };
        }

        if (graphics) {
            let pattern;
            
            // Intel kartları için özel kontrol
            if (graphics.includes('Intel')) {
                pattern = graphics
                    .replace('®', '\\®?') // ® işareti opsiyonel
                    .replace(/\s+/g, '.*'); // boşlukları .* yap
            } 
            // RTX kartları için
            else {
                // Önce GB ve model numarasını al
                const gbMatch = graphics.match(/(\d+)GB/); // "6GB" -> "6"
                const rtxMatch = graphics.match(/RTX\s*(\d+)/); // "RTX 4050" -> "4050"
                
                if (gbMatch && rtxMatch) {
                    const gbValue = gbMatch[1];
                    const rtxValue = rtxMatch[1];
                    // RTX model numarası ve GB değerini içeren esnek bir pattern
                    pattern = `(?=.*${gbValue}.*GB)(?=.*RTX.*?${rtxValue})`;
                }
            }
        
            if (pattern) {
                filter['specifications.simple.graphics'] = { 
                    $regex: pattern,
                    $options: 'i' 
                };
            }
        }

        if (os) {
            filter['specifications.simple.os'] = { $regex: os, $options: 'i' };
        }

        if (memory) {
            // Gelen memory string'indeki fazla boşlukları temizleyelim
            const cleanMemory = memory.replace(/\s+/g, ' ').trim();
            const searchMatch = cleanMemory.match(/(?:(\d+)x)?(\d+)GB\s+(\d+)\s*MHz/i);
            
            if (searchMatch) {
                const [_, multiplier, size, speed] = searchMatch;
        
                if (multiplier) {
                    // 2x16GB, 2x8GB gibi formatlar için
                    filter['specifications.simple.memory'] = {
                        $regex: `\\(${multiplier}x${size}GB\\).*${speed}\\s*MHz`,
                        $options: 'i'
                    };
                } else {
                    // 16GB, 32GB gibi formatlar için
                    filter['specifications.simple.memory'] = {
                        $regex: `^${size}GB[^(]*${speed}\\s*MHz`,
                        $options: 'i'
                    };
                }
            }
        }

        if (firstPort) {
            // Storage değerini temizle ve sadece sayı + TB/GB kısmını al
            const portValue = firstPort.replace(/\s+/g, '').match(/([\d]+[GT]B)/i)?.[0] || firstPort;
            filter['specifications.detailed.storage.firstPort'] = { 
                $regex: portValue,  // Tam eşleşme için ^ ve $ kullan
                $options: 'i' 
            };
        }

        if (secondPort) {
            const portValue = secondPort.replace(/\s+/g, '').match(/([\d]+[GT]B)/i)?.[0] || secondPort;
            filter['specifications.detailed.storage.secondPort'] = { 
                $regex: portValue,  // Tam eşleşme için ^ ve $ kullan
                $options: 'i' 
            };
        }

        if (storage) {
            // Storage değerini temizle ve sadece sayı + TB/GB kısmını al
            const storageValue = storage.replace(/\s+/g, '').match(/([\d]+[GT]B)/i)?.[0] || storage;
            
            // Regex ile daha esnek arama yap
            filter['specifications.simple.storage'] = { 
                $regex: storageValue,
                $options: 'i' 
            };
        }

        if (display) {
            filter['specifications.simple.display'] = { $regex: display, $options: 'i' };
        }

        // Fiyat filtresi
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Stok durumu
        if (inStock === 'true') {
            filter.stock = { $gt: 0 };
        }

        // Tüm kategoriler için ürün sayılarını hesapla
        const allCategories = await Category.find();
        const categoryCounts = await Promise.all(allCategories.map(async (cat) => {
            // Her kategori için alt kategorileri bul
            const subCats = await Category.find({
                fullSlug: new RegExp(`^${cat.fullSlug}/.*`)
            });

            const catIds = [cat._id, ...subCats.map(sub => sub._id)];

            //Bu kategori için filtrelenmiş ürün sayısını hesapla
            const count = await Product.countDocuments({ 
                ...filter,
                category: { $in: catIds }
            });

            return {
                _id: cat._id,
                name: cat.name,
                slug: cat.slug,
                fullSlug: cat.fullSlug,
                filteredCount: count                
            }
        }))

        // Sıralama seçenekleri
        let sort = {};
        switch (sortBy) {
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'oldest':
                sort = { createdAt: 1 };
                break;
            case 'price_asc':
                sort = { price: 1 };
                break;
            case 'price_desc':
                sort = { price: -1 };
                break;
            case 'name_asc':
                sort = { name: 1 };
                break;
            case 'name_desc':
                sort = { name: -1 };
                break;
            default:
                sort = { createdAt: -1 };
        }

        // Toplam ürün sayısını bul
        const totalProducts = await Product.countDocuments(filter);

        // Sayfalama için skip hesapla
        const skip = (Number(page) - 1) * Number(limit);

        // Filtrelenmiş ve sayfalanmış ürünleri getir
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'name slug fullSlug');

        res.json({
            category: {
                _id: category._id,
                name: category.name,
                slug: category.slug,
                fullSlug: category.fullSlug
            },
            products: products,
            categoryCounts: categoryCounts,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalProducts / Number(limit)),
                totalProducts,
                hasNextPage: skip + products.length < totalProducts,
                hasPrevPage: Number(page) > 1,
                limit: Number(limit)
            },
            filters: {
                applied: {
                    processor,
                    processorArchitecture,
                    graphics,
                    memory,
                    storage,
                    display,
                    os,
                    firstPort,
                    secondPort,
                    minPrice,
                    maxPrice,
                    inStock,
                    sortBy
                }
            }
        });

    } catch (error) {
        console.error('Filtreleme hatası:', error);
        res.status(500).json({
            message: 'Ürünler filtrelenirken hata oluştu',
            error: error.message
        });
    }
});


// 1. Tüm laptopları listele (alt kategoriler dahil)
router.get('/laptops/:categorySlug(*)', async (req, res) => {
    try {
        const { categorySlug } = req.params;
        
        // Ana kategoriyi bul (ID, slug veya fullSlug ile)
        let category;
        
        if (mongoose.Types.ObjectId.isValid(categorySlug)) {
            category = await Category.findById(categorySlug);
        } else if (categorySlug.includes('/')) {
            category = await Category.findOne({ fullSlug: categorySlug });
        } else {
            category = await Category.findOne({ slug: categorySlug });
        }

        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedIdentifier: categorySlug 
            });
        }

        // Alt kategorileri bul
        const subcategories = await Category.find({
            fullSlug: new RegExp(`^${category.fullSlug}/.*`)
        });

        // Tüm kategori ID'lerini topla (ana kategori + alt kategoriler)
        const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];

        // Bu kategorilerdeki tüm ürünleri getir
        const laptops = await Product.find({ 
            category: { $in: categoryIds } 
        })
            .populate('category', 'name slug fullSlug')
            .sort({ createdAt: -1 });

        res.json({
            category: {
                _id: category._id,
                name: category.name,
                slug: category.slug,
                fullSlug: category.fullSlug
            },
            products: laptops,
            totalProducts: laptops.length
        });

    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            message: 'Laptoplar listelenirken hata oluştu',
            error: error.message
        });
    }
});


// 2. Tek bir laptop getir (alt kategori ile)
router.get('/laptop/:categorySlug/:subcategorySlug(*)/:identifier(*)', async (req, res) => {
    try {
        const { categorySlug, subcategorySlug, identifier } = req.params;
        
        // Ana kategoriyi bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ message: 'Ana kategori bulunamadı' });
        }

        // Alt kategoriyi bul
        const subcategorySlugs = subcategorySlug.split('/'); // Split by '/' to handle nested categories
        let currentCategory = category;

        for (const slug of subcategorySlugs) {
            currentCategory = await Category.findOne({ slug, parent: currentCategory._id });
            if (!currentCategory) {
                return res.status(404).json({ message: 'Alt kategori bulunamadı' });
            }
        }

        // Laptopu bul
        const laptop = await Product.findOne({ 
            category: currentCategory._id,
            slug: identifier 
        }).populate('category', 'name slug fullSlug');
        
        if (!laptop) {
            return res.status(404).json({ message: 'Laptop bulunamadı' });
        }
        
        res.json(laptop);
    } catch (error) {
        res.status(500).json({
            message: 'Laptop getirilirken hata oluştu',
            error: error.message
        });
    }
});

// 3. Laptop güncelle
router.put('/:categorySlug/:subcategorySlug(*)/:identifier(*)', upload.array('images', 10), async (req, res) => {
    try {
        const { categorySlug, subcategorySlug, identifier } = req.params;

        // Ana kategoriyi bul
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) {
            return res.status(404).json({ message: 'Ana kategori bulunamadı' });
        }

        // Alt kategoriyi bul
        const subcategorySlugs = subcategorySlug.split('/'); // Alt kategorileri ayır
        let currentCategory = category;

        for (const slug of subcategorySlugs) {
            currentCategory = await Category.findOne({ slug, parent: currentCategory._id });
            if (!currentCategory) {
                return res.status(404).json({ message: 'Alt kategori bulunamadı' });
            }
        }

        // Laptopu bul
        const laptop = await Product.findOne({ 
            category: currentCategory._id,
            slug: identifier 
        });

        if (!laptop) {
            return res.status(404).json({ message: 'Laptop bulunamadı' });
        }

        // Form data üzerinden gelen verileri al
        const {
            name,
            description,
            price,
            stock,
            categoryId,
            processor,
            graphics,
            memory,
            display,
            storage,
            os,
            disksupport,
            keyboard,
            thickness,
            weight,
            promotion,
            material,
            processorDetails,
            graphicsDetails,
            memoryDetails,
            displayDetails,
            storageDetails,
            designDetails,
            portsDetails,
            hardwarespecsDetails,
            othersDetails
        } = req.body;

        // specifications.simple nesnesini kontrol et
        laptop.specifications.simple = laptop.specifications.simple || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed = laptop.specifications.detailed || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.processor = laptop.specifications.detailed.processor || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.graphics = laptop.specifications.detailed.graphics || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.memory = laptop.specifications.detailed.memory || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.display = laptop.specifications.detailed.display || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.storage = laptop.specifications.detailed.storage || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.design = laptop.specifications.detailed.design || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.ports = laptop.specifications.detailed.ports || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.hardwarespecs = laptop.specifications.detailed.hardwarespecs || {}; // Tanımlı değilse oluştur
        laptop.specifications.detailed.others = laptop.specifications.detailed.others || {}; // Tanımlı değilse oluştur


        // Resimleri güncelle
        if (req.files) {
            laptop.images = req.files.map((file, index) => ({
                url: `/uploads/products/${file.filename}`,
                alt: name || 'Laptop resmi',
                isMain: index === 0
            }));
        }

        // Güncellenen alanları ayarlayın
        const updatedLaptop = await Product.findOneAndUpdate(
            { _id: laptop._id },
            {
                $set: {
                    name: name || laptop.name,
                    description: description || laptop.description,
                    price: isNaN(parseFloat(price)) ? laptop.price : parseFloat(price),
                    stock: isNaN(parseInt(stock)) ? laptop.stock : parseInt(stock),
                    category: categoryId || laptop.category,
                    'specifications.simple.processor': processor !== undefined ? processor : laptop.specifications.simple.processor,
                    'specifications.simple.graphics': graphics !== undefined ? graphics : laptop.specifications.simple.graphics,
                    'specifications.simple.memory': memory !== undefined ? memory : laptop.specifications.simple.memory,
                    'specifications.simple.display': display !== undefined ? display : laptop.specifications.simple.display,
                    'specifications.simple.storage': storage !== undefined ? storage : laptop.specifications.simple.storage,
                    'specifications.simple.os': os !== undefined ? os : laptop.specifications.simple.os,
                    'specifications.simple.disksupport': disksupport !== undefined ? disksupport : laptop.specifications.simple.disksupport,
                    'specifications.simple.keyboard': keyboard !== undefined ? keyboard : laptop.specifications.simple.keyboard,
                    'specifications.simple.thickness': thickness !== undefined ? thickness : laptop.specifications.simple.thickness,
                    'specifications.simple.weight': weight !== undefined ? weight : laptop.specifications.simple.weight,
                    'specifications.simple.promotion': promotion !== undefined ? promotion : laptop.specifications.simple.promotion,
                    'specifications.simple.material': material !== undefined ? material : laptop.specifications.simple.material,
                    // Processor detaylarını güncelle
                    'specifications.detailed.processor.processorArchitecture': processorDetails ? JSON.parse(processorDetails).processorArchitecture || laptop.specifications.detailed.processor.processorArchitecture : laptop.specifications.detailed.processor.processorArchitecture,
                    'specifications.detailed.processor.processor': processorDetails ? JSON.parse(processorDetails).processor || laptop.specifications.detailed.processor.processor : laptop.specifications.detailed.processor.processor,
                    // Graphics detaylarını güncelle
                    'specifications.detailed.graphics.gpu': graphicsDetails ? JSON.parse(graphicsDetails).gpu || laptop.specifications.detailed.graphics.gpu : laptop.specifications.detailed.graphics.gpu,
                    // Memory detaylarını güncelle
                    'specifications.detailed.memory.ram': memoryDetails ? JSON.parse(memoryDetails).ram || laptop.specifications.detailed.memory.ram : laptop.specifications.detailed.memory.ram,
                    // Display detaylarını güncelle
                    'specifications.detailed.display.screen': displayDetails ? JSON.parse(displayDetails).screen || laptop.specifications.detailed.display.screen : laptop.specifications.detailed.display.screen,
                    // Storage detaylarını güncelle
                    'specifications.detailed.storage.firstPort': storageDetails ? JSON.parse(storageDetails).firstPort || laptop.specifications.detailed.storage.firstPort : laptop.specifications.detailed.storage.firstPort,
                    'specifications.detailed.storage.secondPort': storageDetails ? JSON.parse(storageDetails).secondPort || laptop.specifications.detailed.storage.secondPort : laptop.specifications.detailed.storage.secondPort,
                    // Design detaylarını güncelle
                    'specifications.detailed.design.dimensions': designDetails ? JSON.parse(designDetails).dimensions || laptop.specifications.detailed.design.dimensions : laptop.specifications.detailed.design.dimensions,
                    'specifications.detailed.design.weight': designDetails ? JSON.parse(designDetails).weight || laptop.specifications.detailed.design.weight : laptop.specifications.detailed.design.weight,
                    'specifications.detailed.design.materialtype': designDetails ? JSON.parse(designDetails).materialtype || laptop.specifications.detailed.design.materialtype : laptop.specifications.detailed.design.materialtype,
                    'specifications.detailed.design.adapter': designDetails ? JSON.parse(designDetails).adapter || laptop.specifications.detailed.design.adapter : laptop.specifications.detailed.design.adapter,
                    'specifications.detailed.design.battery': designDetails ? JSON.parse(designDetails).battery || laptop.specifications.detailed.design.battery : laptop.specifications.detailed.design.battery,
                    // Ports detaylarını güncelle
                    'specifications.detailed.ports.usb2': portsDetails ? JSON.parse(portsDetails).usb2 || laptop.specifications.detailed.ports.usb2 : laptop.specifications.detailed.ports.usb2,
                    'specifications.detailed.ports.usb3': portsDetails ? JSON.parse(portsDetails).usb3 || laptop.specifications.detailed.ports.usb3 : laptop.specifications.detailed.ports.usb3,
                    'specifications.detailed.ports.usb3c': portsDetails ? JSON.parse(portsDetails).usb3c || laptop.specifications.detailed.ports.usb3c : laptop.specifications.detailed.ports.usb3c,
                    'specifications.detailed.ports.hdmi': portsDetails ? JSON.parse(portsDetails).hdmi || laptop.specifications.detailed.ports.hdmi : laptop.specifications.detailed.ports.hdmi,
                    'specifications.detailed.ports.portsupport': portsDetails ? JSON.parse(portsDetails).portsupport || laptop.specifications.detailed.ports.portsupport : laptop.specifications.detailed.ports.portsupport,
                    'specifications.detailed.ports.speakers': portsDetails ? JSON.parse(portsDetails).speakers || laptop.specifications.detailed.ports.speakers : laptop.specifications.detailed.ports.speakers,
                    'specifications.detailed.ports.microphone': portsDetails ? JSON.parse(portsDetails).microphone || laptop.specifications.detailed.ports.microphone : laptop.specifications.detailed.ports.microphone,
                    // Hardware specs detaylarını güncelle
                    'specifications.detailed.hardwarespecs.keyboard': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).keyboard || laptop.specifications.detailed.hardwarespecs.keyboard : laptop.specifications.detailed.hardwarespecs.keyboard,
                    'specifications.detailed.hardwarespecs.camera': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).camera || laptop.specifications.detailed.hardwarespecs.camera : laptop.specifications.detailed.hardwarespecs.camera,
                    'specifications.detailed.hardwarespecs.wireless': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).wireless || laptop.specifications.detailed.hardwarespecs.wireless : laptop.specifications.detailed.hardwarespecs.wireless,
                    'specifications.detailed.hardwarespecs.speakers': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).speakers || laptop.specifications.detailed.hardwarespecs.speakers : laptop.specifications.detailed.hardwarespecs.speakers,
                    'specifications.detailed.hardwarespecs.soundsystem': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).soundsystem || laptop.specifications.detailed.hardwarespecs.soundsystem : laptop.specifications.detailed.hardwarespecs.soundsystem,
                    'specifications.detailed.hardwarespecs.internalcardreader': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).internalcardreader || laptop.specifications.detailed.hardwarespecs.internalcardreader : laptop.specifications.detailed.hardwarespecs.internalcardreader,
                    'specifications.detailed.hardwarespecs.gigaethernet': hardwarespecsDetails ? JSON.parse(hardwarespecsDetails).gigaethernet || laptop.specifications.detailed.hardwarespecs.gigaethernet : laptop.specifications.detailed.hardwarespecs.gigaethernet,
                    // Others detaylarını güncelle
                    'specifications.detailed.others.guarantee': othersDetails ? JSON.parse(othersDetails).guarantee || laptop.specifications.detailed.others.guarantee : laptop.specifications.detailed.others.guarantee,
                    'specifications.detailed.others.notification': othersDetails ? JSON.parse(othersDetails).notification || laptop.specifications.detailed.others.notification : laptop.specifications.detailed.others.notification,
                    // Resimleri güncelle
                    images: laptop.images
                }
            },
            { new: true } // Güncellenmiş laptopu geri döndür
        );


        // Güncellenmiş laptopu kaydedin
        res.json(updatedLaptop);
    } catch (error) {
        res.status(500).json({
            message: 'Laptop güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// 4. Laptop sil
router.delete('/:categorySlug(*)/:identifier(*)', async (req, res) => {
    try {
        const { categorySlug, identifier } = req.params;
        const { permanent = false } = req.query; // URL'de ?permanent=true parametresi

        // Önce kategoriyi bul
        const category = await Category.findOne({ fullSlug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        let laptop;
        if (permanent) {
            // Kalıcı silme
            laptop = await Product.findOneAndDelete({
                slug: identifier,
                category: category._id
            });
        } else {
            // Soft delete
            laptop = await Product.findOne({
                slug: identifier,
                category: category._id,
                isDeleted: false
            });

            if (laptop) {
                laptop.isDeleted = true;
                laptop.isActive = false;
                await laptop.save();
            }
        }

        if (!laptop) {
            return res.status(404).json({ 
                message: 'Laptop bulunamadı',
                requestedSlug: identifier 
            });
        }

        res.json({ 
            message: permanent ? 'Laptop kalıcı olarak silindi' : 'Laptop pasife alındı',
            deletedLaptop: laptop 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Laptop silinirken hata oluştu', 
            error: error.message 
        });
    }
});


// 5. Silinen laptopu geri getirme
router.post('/:categorySlug(*)/:identifier(*)/restore', async (req, res) => {
    try {
        const { categorySlug, identifier } = req.params;
        let laptop;

        // Kategoriyi bul
        const category = await Category.findOne({ fullSlug: categorySlug });
        if (!category) {
            return res.status(404).json({ 
                message: 'Kategori bulunamadı',
                requestedSlug: categorySlug 
            });
        }

        // Laptopu bul
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            laptop = await Product.findById(identifier);
        } else {
            laptop = await Product.findOne({ slug: identifier, category: category._id });
        }

        if (!laptop) {
            return res.status(404).json({ 
                message: 'Laptop bulunamadı',
                requestedIdentifier: identifier 
            });
        }

        if (!laptop.isDeleted) {
            return res.status(400).json({ 
                message: 'Bu laptop zaten aktif durumda'
            });
        }

        // Laptopu geri getir
        laptop.isDeleted = false;
        laptop.isActive = true;
        await laptop.save();

        res.json({ 
            message: 'Laptop başarıyla geri getirildi',
            restoredLaptop: laptop 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Laptop geri getirilirken hata oluştu', 
            error: error.message 
        });
    }
});



// Kategori ve alt kategoriler için toplam ürün sayısını getir
router.get('/categories/products/count/:categorySlug', async (req, res) => {
    const { categorySlug } = req.params;

    try {
        // Kategoriyi slug ile bul
        const category = await Category.findOne({ slug: categorySlug }).lean();
        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }

        // Recursive fonksiyon: Kategori ve alt kategoriler için toplam ürün sayısını hesapla
        const getTotalProducts = async (categoryId) => {
            // Üst kategori için ürün sayısını hesapla
            const productCount = await Product.countDocuments({
                category: categoryId,
                isDeleted: false // Sadece silinmemiş ürünleri say
            });


            // Alt kategorileri bul
            const subcategories = await Category.find({ parent: categoryId }).lean();
            const subcategoryCounts = await Promise.all(subcategories.map(async sub => {
                const count = await getTotalProducts(sub._id); // Recursive çağrı
                return {
                    name: sub.name,
                    slug: sub.slug,
                    count: count // Alt kategorinin toplam ürün sayısı
                };
            }));

            // Alt kategorilerin toplam sayısını hesapla
            const totalSubcategoryCount = subcategoryCounts.reduce((acc, sub) => acc + sub.count, 0);

            return productCount + totalSubcategoryCount; // Üst kategori ve alt kategorilerin toplamı
        };

        // Toplam ürün sayısını hesapla
        const totalProducts = await getTotalProducts(category._id);

        console.log(`Kategori name: ${category.name}, Ürün Sayısı: ${totalProducts}`);

        res.json({
            category: {
                name: category.name,
                slug: category.slug,
                totalProducts: totalProducts // Üst kategori ve alt kategorilerin toplam ürün sayısı
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Kategori ve ürün sayısı alınırken hata oluştu',
            error: error.message
        });
    }
});





// Tüm kategorileri ve her birinin ürün sayısını getir
router.get('/categories/with-product-count', async (req, res) => {
    try {
        // Tüm kategorileri al
        const categories = await Category.find().lean();

        // Her kategori için ürün sayısını hesapla
        const categoryCounts = await Promise.all(categories.map(async (category) => {
            const totalProducts = await getTotalProducts(category._id);
            return {
                name: category.name,
                slug: category.slug,
                totalProducts: totalProducts
            };
        }));

        res.json(categoryCounts);
    } catch (error) {
        res.status(500).json({
            message: 'Kategoriler ve ürün sayıları alınırken hata oluştu',
            error: error.message
        });
    }
});

// Recursive fonksiyon: Kategori ve alt kategoriler için toplam ürün sayısını hesapla
const getTotalProducts = async (categoryId) => {
    const productCount = await Product.countDocuments({
        category: categoryId,
        isDeleted: false // Sadece silinmemiş ürünleri say
    });

    const subcategories = await Category.find({ parent: categoryId }).lean();
    const subcategoryCounts = await Promise.all(subcategories.map(async sub => {
        const count = await getTotalProducts(sub._id); // Recursive çağrı
        return count; // Alt kategorinin toplam ürün sayısı
    }));

    const totalSubcategoryCount = subcategoryCounts.reduce((acc, count) => acc + count, 0);

    return productCount + totalSubcategoryCount; // Üst kategori ve alt kategorilerin toplamı
};


// Banner yükleme endpoint'i
router.post('/banners/upload', uploadBanner.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Lütfen bir banner resmi yükleyin' });
        }

        const { category, position, alt } = req.body;

        if (!category || !['main', 'sidebar', 'footer'].includes(category)) {
            return res.status(400).json({ message: 'Geçerli bir kategori belirtin (main, sidebar, footer)' });
        }

        const banner = new Banner({
            imageUrl: `/uploads/banners/${req.file.filename}`,
            category,
            position,
            alt: alt || 'Banner'
        });

        await banner.save();
        res.status(201).json(banner);

    } catch (error) {
        console.error('Banner yükleme hatası:', error);
        res.status(500).json({
            message: 'Banner yüklenirken bir hata oluştu',
            error: error.message
        });
    }
});

// Kategori bazlı banner'ları getir
router.get('/banners/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const banners = await Banner.find({ 
            category,
            isActive: true 
        }).sort({ position: 1 });

        res.json(banners);
    } catch (error) {
        res.status(500).json({
            message: 'Banner\'lar getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

// Kategori ve pozisyon bazlı banner getirme endpoint'i
router.get('/banners/position/:category/:position', async (req, res) => {
    try {
        const { category, position } = req.params;

        // Kategori kontrolü
        if (!['main', 'sidebar', 'footer'].includes(category)) {
            return res.status(400).json({ 
                message: 'Geçerli bir kategori belirtin (main, sidebar, footer)' 
            });
        }

        const banner = await Banner.findOne({ 
            category,
            position,
            isActive: true 
        });

        if (!banner) {
            return res.status(404).json({ 
                message: 'Banner bulunamadı',
                category,
                position
            });
        }

        res.json(banner);
    } catch (error) {
        res.status(500).json({
            message: 'Banner getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

// Tüm banner'ları getir
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true })
            .sort({ category: 1, position: 1 });

        const groupedBanners = {
            main: banners.filter(b => b.category === 'main'),
            sidebar: banners.filter(b => b.category === 'sidebar'),
            footer: banners.filter(b => b.category === 'footer')
        };

        res.json(groupedBanners);
    } catch (error) {
        res.status(500).json({
            message: 'Banner\'lar getirilirken bir hata oluştu',
            error: error.message
        });
    }
});


module.exports = router;