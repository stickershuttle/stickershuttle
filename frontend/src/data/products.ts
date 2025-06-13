import { Product, ProductSize, generateProductId, generateSKU } from '../types/product';

// Common sizes for stickers
export const STICKER_SIZES: ProductSize[] = [
  {
    id: '1x1',
    name: '1″ × 1″',
    dimensions: '1″ × 1″',
    widthInches: 1,
    heightInches: 1,
    squareInches: 1,
    priceModifier: 0.7,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '1.5x1.5',
    name: '1.5″ × 1.5″',
    dimensions: '1.5″ × 1.5″',
    widthInches: 1.5,
    heightInches: 1.5,
    squareInches: 2.25,
    priceModifier: 0.8,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '2x2',
    name: '2″ × 2″',
    dimensions: '2″ × 2″',
    widthInches: 2,
    heightInches: 2,
    squareInches: 4,
    priceModifier: 1.0,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '2.5x2.5',
    name: '2.5″ × 2.5″',
    dimensions: '2.5″ × 2.5″',
    widthInches: 2.5,
    heightInches: 2.5,
    squareInches: 6.25,
    priceModifier: 1.15,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '3x3',
    name: '3″ × 3″',
    dimensions: '3″ × 3″',
    widthInches: 3,
    heightInches: 3,
    squareInches: 9,
    priceModifier: 1.3,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '3.5x3.5',
    name: '3.5″ × 3.5″',
    dimensions: '3.5″ × 3.5″',
    widthInches: 3.5,
    heightInches: 3.5,
    squareInches: 12.25,
    priceModifier: 1.45,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '4x4',
    name: '4″ × 4″',
    dimensions: '4″ × 4″',
    widthInches: 4,
    heightInches: 4,
    squareInches: 16,
    priceModifier: 1.6,
    minQuantity: 25,
    maxQuantity: 5000
  },
  {
    id: '5x5',
    name: '5″ × 5″',
    dimensions: '5″ × 5″',
    widthInches: 5,
    heightInches: 5,
    squareInches: 25,
    priceModifier: 1.9,
    minQuantity: 25,
    maxQuantity: 2500
  }
];

// Banner sizes
export const BANNER_SIZES: ProductSize[] = [
  {
    id: '2x4',
    name: '2′ × 4′',
    dimensions: '2′ × 4′',
    widthInches: 24,
    heightInches: 48,
    squareInches: 1152,
    priceModifier: 1.0,
    minQuantity: 1,
    maxQuantity: 100
  },
  {
    id: '3x6',
    name: '3′ × 6′',
    dimensions: '3′ × 6′',
    widthInches: 36,
    heightInches: 72,
    squareInches: 2592,
    priceModifier: 1.5,
    minQuantity: 1,
    maxQuantity: 50
  },
  {
    id: '4x8',
    name: '4′ × 8′',
    dimensions: '4′ × 8′',
    widthInches: 48,
    heightInches: 96,
    squareInches: 4608,
    priceModifier: 2.0,
    minQuantity: 1,
    maxQuantity: 25
  }
];

// Product catalog with unique IDs
export const PRODUCTS: Product[] = [
  // VINYL STICKERS
  {
    id: generateProductId('vinyl-stickers', 'premium'),
    sku: generateSKU('vinyl-stickers', 'premium'),
    name: 'Premium Vinyl Stickers',
    description: 'Waterproof and UV-resistant vinyl stickers perfect for indoor and outdoor use. Made with premium vinyl material and protected with a 7-year laminate for maximum durability.',
    shortDescription: 'Waterproof premium vinyl stickers with 7-year protection',
    category: 'vinyl-stickers',
    basePrice: 0.65, // Base price per sticker
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    materials: ['premium-vinyl'],
    defaultMaterial: 'premium-vinyl',
    sizes: STICKER_SIZES,
    defaultSize: STICKER_SIZES.find(s => s.id === '2x2')!,
    finishes: ['matte', 'gloss'],
    defaultFinish: 'gloss',
    features: [
      'Waterproof & UV Resistant',
      'Laminated with 7yr protection',
      'Custom Shapes & Sizes',
      'Dishwasher Safe',
      'Premium Vinyl Material'
    ],
    customizable: true,
    minQuantity: 25,
    maxQuantity: 5000,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },

  // HOLOGRAPHIC STICKERS
  {
    id: generateProductId('holographic-stickers', 'rainbow'),
    sku: generateSKU('holographic-stickers', 'rainbow'),
    name: 'Holographic Rainbow Stickers',
    description: 'Eye-catching holographic stickers with prismatic rainbow effects. Made with specialty holographic vinyl that creates stunning light reflections and color shifts.',
    shortDescription: 'Holographic stickers with rainbow prismatic effects',
    category: 'holographic-stickers',
    basePrice: 0.85,
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
    materials: ['holographic-vinyl'],
    defaultMaterial: 'holographic-vinyl',
    sizes: STICKER_SIZES,
    defaultSize: STICKER_SIZES.find(s => s.id === '2x2')!,
    finishes: ['gloss'], // Holographic is typically glossy
    defaultFinish: 'gloss',
    features: [
      'Holographic Rainbow Effect',
      'Laminated with 7yr protection',
      'Specialty Holographic Vinyl',
      'Eye-Catching Prismatic Finish',
      'Premium Quality Material'
    ],
    customizable: true,
    minQuantity: 25,
    maxQuantity: 2500,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },

  // CHROME STICKERS
  {
    id: generateProductId('chrome-stickers', 'mirror'),
    sku: generateSKU('chrome-stickers', 'mirror'),
    name: 'Chrome Mirror Stickers',
    description: 'Premium chrome stickers with mirror-like finish. Made with metallic polyester film for automotive-grade durability and stunning reflective appearance.',
    shortDescription: 'Mirror-finish chrome stickers with automotive-grade quality',
    category: 'chrome-stickers',
    basePrice: 0.95,
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png',
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593619/GreyAlien_StickerShuttle_ChromeIcon_jkekzp.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png',
    materials: ['chrome-vinyl'],
    defaultMaterial: 'chrome-vinyl',
    sizes: STICKER_SIZES,
    defaultSize: STICKER_SIZES.find(s => s.id === '2x2')!,
    finishes: ['gloss'], // Chrome is inherently glossy
    defaultFinish: 'gloss',
    features: [
      'Mirror Chrome Finish',
      'Laminated with 7yr protection',
      'Metallic Polyester Film',
      'High-Gloss Surface',
      'Automotive Grade'
    ],
    customizable: true,
    minQuantity: 25,
    maxQuantity: 2500,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },

  // GLITTER STICKERS
  {
    id: generateProductId('glitter-stickers', 'sparkle'),
    sku: generateSKU('glitter-stickers', 'sparkle'),
    name: 'Glitter Sparkle Stickers',
    description: 'Dazzling glitter stickers that catch and reflect light beautifully. Made with premium glitter vinyl featuring embedded sparkles for long-lasting shine.',
    shortDescription: 'Sparkly glitter stickers with embedded shine effects',
    category: 'glitter-stickers',
    basePrice: 0.75,
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png',
    materials: ['glitter-vinyl'],
    defaultMaterial: 'glitter-vinyl',
    sizes: STICKER_SIZES,
    defaultSize: STICKER_SIZES.find(s => s.id === '2x2')!,
    finishes: ['gloss'], // Glitter typically has a glossy finish
    defaultFinish: 'gloss',
    features: [
      'Sparkly Glitter Finish',
      'Laminated with 7yr protection',
      'Eye-Catching Sparkle',
      'Multiple Glitter Colors',
      'Premium Glitter Vinyl'
    ],
    customizable: true,
    minQuantity: 25,
    maxQuantity: 2500,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },

  // VINYL BANNERS
  {
    id: generateProductId('vinyl-banners', 'outdoor'),
    sku: generateSKU('vinyl-banners', 'outdoor'),
    name: 'Heavy Duty Vinyl Banners',
    description: 'Professional outdoor vinyl banners made with 13oz heavy-duty vinyl. Hemmed edges and grommets included for easy hanging. Perfect for events, businesses, and outdoor advertising.',
    shortDescription: 'Heavy-duty outdoor vinyl banners with grommets',
    category: 'vinyl-banners',
    basePrice: 45.00, // Base price for smallest banner
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png',
    materials: ['banner-vinyl'],
    defaultMaterial: 'banner-vinyl',
    sizes: BANNER_SIZES,
    defaultSize: BANNER_SIZES.find(s => s.id === '2x4')!,
    finishes: ['matte', 'gloss'],
    defaultFinish: 'matte',
    features: [
      'Heavy Duty 13oz Vinyl',
      'Laminated with 7yr protection',
      'Hemmed & Grommeted',
      'UV & Weather Resistant',
      'Custom Sizes Available'
    ],
    customizable: true,
    minQuantity: 1,
    maxQuantity: 100,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

// Helper functions to get products
export const getProductById = (id: string): Product | undefined => {
  return PRODUCTS.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return PRODUCTS.filter(product => product.category === category && product.isActive);
};

export const getAllActiveProducts = (): Product[] => {
  return PRODUCTS.filter(product => product.isActive);
};

export const getProductBySlug = (slug: string): Product | undefined => {
  return PRODUCTS.find(product => 
    product.category === slug.replace(/^\/products\//, '') && product.isActive
  );
}; 