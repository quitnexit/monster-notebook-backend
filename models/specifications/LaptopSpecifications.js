const laptopSpecifications = {
    // Kart görünümü için basit özellikler
    simple: {
        processor: String,      // "Intel Core i7-13700H"
        graphics: String,       // "NVIDIA RTX 4060 8GB"
        memory: String,         // "16GB DDR5"
        display: String,        // "16.1\" 165Hz IPS"
        storage: String,        // "1TB NVMe SSD"
        os: String             // "Windows 11 Home"
    },

    // Detay sayfası için kapsamlı özellikler
    detailed: {
        processor: {
            brand: String,          // "Intel"
            generation: String,     // "13th Gen"
            model: String,          // "Core i7-13700H"
            cores: String,          // "14 Cores (6P + 8E)"
            threads: String,        // "20 Threads"
            cache: String,          // "24MB Cache"
            baseFrequency: String,  // "2.4 GHz"
            maxFrequency: String,   // "5.0 GHz"
            tdp: String            // "45W"
        },
        
        graphics: {
            brand: String,          // "NVIDIA"
            model: String,          // "RTX 4060"
            vram: String,           // "8GB"
            memoryType: String,     // "GDDR6"
            interface: String,      // "PCIe 4.0"
            tdp: String            // "140W"
        },

        memory: {
            size: String,           // "16GB"
            type: String,           // "DDR5"
            configuration: String,  // "2x8GB"
            frequency: String       // "4800MHz"
        },

        display: {
            size: String,          // "16.1 inç"
            panelType: String,     // "IPS"
            resolution: String,     // "1920x1080 (Full HD)"
            refreshRate: String,    // "165Hz"
            features: [String]      // ["Anti-Glare", "100% sRGB"]
        },

        storage: {
            primary: {
                name: String,       // "Samsung PM9A1"
                type: String,       // "NVMe SSD"
                capacity: String,   // "1TB"
            },
            additionalSlots: String // "1x M.2 PCIe Slot"
        },

        operatingSystem: String,    // "Windows 11 Home"

        design: {
            width: String,          // "365 mm"
            height: String,         // "251 mm"
            thickness: String,      // "23.5 mm"
            weight: String,         // "2.3 kg"
            color: String,          // "Shadow Black"
            material: String        // "Aluminum"
        },

        ports: {
            usb2: String,          // "1x USB 2.0"
            usb3: String,          // "3x USB 3.2 Gen 1"
            hdmi: String,          // "1x HDMI 2.1"
            ethernet: String,       // "Gigabit Ethernet"
            wifi: String,          // "Wi-Fi 6E (802.11ax)"
            bluetooth: String,      // "Bluetooth 5.3"
            audio: String,         // "1x 3.5mm Combo Jack"
            batteryWattage: String // "90W"
        },

        keyboard: {
            type: String,          // "Membrane"
            backlight: String,     // "RGB Backlit"
            numpad: String,        // "Yes"
            features: [String]     // ["Anti-Ghosting", "N-Key Rollover"]
        }
    }
};

module.exports = laptopSpecifications; 