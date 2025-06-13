import { Product, ProductAttribute, AttributeOption, generateProductId, generateSKU } from '../types/product';

// Common attribute builders based on real specs
const createShapeAttribute = (shapeOptions: string[], order: number = 1): ProductAttribute => ({
  id: 'shape',
  type: 'shape',
  name: 'Shape',
  description: 'Choose your sticker shape',
  required: true,
  order,
  options: shapeOptions.map((shape, index) => ({
    id: shape.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: shape,
    priceModifier: shape === 'Custom Shape' ? 1.15 : 1.0,
    isDefault: index === 0
  }))
});

const createWhiteBaseAttribute = (order: number = 2): ProductAttribute => ({
  id: 'white-base',
  type: 'white-base',
  name: 'White Base',
  description: 'White ink and backing options',
  required: true,
  order,
  options: [
    { id: 'full-white-base', name: 'Full White Base', priceModifier: 1.15, isDefault: true },
    { id: 'partial-white-base', name: 'Partial White Base', priceModifier: 1.10 },
    { id: 'no-white-base', name: 'No White Base', priceModifier: 1.0 },
    { id: 'pick-for-me', name: 'Pick for Me!', priceModifier: 1.0 }
  ]
});

const createFinishAttribute = (order: number = 2): ProductAttribute => ({
  id: 'finish',
  type: 'finish',
  name: 'Finish',
  description: 'Surface finish options',
  required: true,
  order,
  options: [
    { id: 'matte', name: 'Matte', priceModifier: 1.0, isDefault: true },
    { id: 'gloss', name: 'Gloss', priceModifier: 1.0 },
    { id: 'shimmer-gloss', name: 'Shimmer Gloss', priceModifier: 1.05 }
  ]
});

const createStickerSizeAttribute = (order: number = 3): ProductAttribute => ({
  id: 'size-preset',
  type: 'size-preset',
  name: 'Size',
  description: 'Choose preset size or enter custom dimensions',
  required: true,
  order,
  options: [
    { id: 'small', name: 'Small (2″ × 2″)', priceModifier: 0.8, width: 2, height: 2 },
    { id: 'medium', name: 'Medium (3″ × 3″)', priceModifier: 1.0, width: 3, height: 3, isDefault: true },
    { id: 'large', name: 'Large (4″ × 4″)', priceModifier: 1.33, width: 4, height: 4 },
    { id: 'x-large', name: 'X-Large (5″ × 5″)', priceModifier: 1.67, width: 5, height: 5 },
    { id: 'custom', name: 'Custom Size (up to 12″)', priceModifier: 1.0 }
  ]
});

const createCustomSizeAttribute = (order: number = 4): ProductAttribute => ({
  id: 'size-custom',
  type: 'size-custom',
  name: 'Custom Size',
  description: 'Enter custom width and height',
  required: false, // Only required if "Custom Size" is selected
  order,
  customSize: {
    minWidth: 0.5,
    maxWidth: 12,
    minHeight: 0.5,
    maxHeight: 12,
    unit: 'inches',
    pricePerSquareInch: 0.65
  }
});

const createStickerSheetSizeAttribute = (order: number = 3): ProductAttribute => ({
  id: 'size-preset',
  type: 'size-preset',
  name: 'Size',
  description: 'Choose preset size or enter custom dimensions',
  required: true,
  order,
  options: [
    { id: '4x6', name: '4″ × 6″', priceModifier: 1.0, width: 4, height: 6, isDefault: true },
    { id: '5x7', name: '5″ × 7″', priceModifier: 1.46, width: 5, height: 7 },
    { id: '8.5x11', name: '8.5″ × 11″', priceModifier: 3.85, width: 8.5, height: 11 },
    { id: 'custom', name: 'Custom Size (up to 12″)', priceModifier: 1.0 }
  ]
});

const createQuantityAttribute = (min: number, max: number, order: number = 5): ProductAttribute => ({
  id: 'quantity',
  type: 'quantity',
  name: 'Quantity',
  description: 'Number of stickers',
  required: true,
  order,
  quantity: {
    min,
    max,
    default: 100,
    breakpoints: [
      { minQty: 15, priceModifier: 1.0 },
      { minQty: 50, priceModifier: 0.95 },
      { minQty: 100, priceModifier: 0.90 },
      { minQty: 250, priceModifier: 0.85 },
      { minQty: 500, priceModifier: 0.80 },
      { minQty: 1000, priceModifier: 0.75 },
      { minQty: 2500, priceModifier: 0.70 },
      { minQty: 5000, priceModifier: 0.65 }
    ]
  }
});

const createFileUploadAttribute = (order: number = 6): ProductAttribute => ({
  id: 'file-upload',
  type: 'file-upload',
  name: 'Design File',
  description: 'Upload your design file',
  required: true,
  order,
  fileUpload: {
    required: true,
    acceptedFormats: ['.jpg', '.jpeg', '.png', '.pdf', '.ai', '.eps', '.svg'],
    maxFileSize: 25, // 25MB
    allowMultiple: false
  }
});

// Banner size options based on real specs
const createBannerSizeAttribute = (order: number = 1): ProductAttribute => ({
  id: 'size-preset',
  type: 'size-preset',
  name: 'Banner Size',
  description: 'Choose your banner dimensions',
  required: true,
  order,
  options: [
    // 2x series
    { id: '2x2', name: '2\' × 2\'', priceModifier: 1.0, width: 2, height: 2, isDefault: true },
    { id: '2x4', name: '2\' × 4\'', priceModifier: 2.0, width: 2, height: 4 },
    { id: '2x6', name: '2\' × 6\'', priceModifier: 3.0, width: 2, height: 6 },
    { id: '2x8', name: '2\' × 8\'', priceModifier: 4.0, width: 2, height: 8 },
    { id: '2x10', name: '2\' × 10\'', priceModifier: 5.0, width: 2, height: 10 },
    { id: '2x12', name: '2\' × 12\'', priceModifier: 6.0, width: 2, height: 12 },
    { id: '2x15', name: '2\' × 15\'', priceModifier: 7.5, width: 2, height: 15 },
    { id: '2x20', name: '2\' × 20\'', priceModifier: 10.0, width: 2, height: 20 },
    
    // 3x series
    { id: '3x3', name: '3\' × 3\'', priceModifier: 2.25, width: 3, height: 3 },
    { id: '3x6', name: '3\' × 6\'', priceModifier: 4.5, width: 3, height: 6 },
    { id: '3x9', name: '3\' × 9\'', priceModifier: 6.75, width: 3, height: 9 },
    { id: '3x12', name: '3\' × 12\'', priceModifier: 9.0, width: 3, height: 12 },
    { id: '3x15', name: '3\' × 15\'', priceModifier: 11.25, width: 3, height: 15 },
    { id: '3x20', name: '3\' × 20\'', priceModifier: 15.0, width: 3, height: 20 },
    
    // 4x series
    { id: '4x4', name: '4\' × 4\'', priceModifier: 4.0, width: 4, height: 4 },
    { id: '4x8', name: '4\' × 8\'', priceModifier: 8.0, width: 4, height: 8 },
    { id: '4x12', name: '4\' × 12\'', priceModifier: 12.0, width: 4, height: 12 },
    { id: '4x16', name: '4\' × 16\'', priceModifier: 16.0, width: 4, height: 16 },
    { id: '4x20', name: '4\' × 20\'', priceModifier: 20.0, width: 4, height: 20 },
    
    // 5x series
    { id: '5x5', name: '5\' × 5\'', priceModifier: 6.25, width: 5, height: 5 },
    { id: '5x10', name: '5\' × 10\'', priceModifier: 12.5, width: 5, height: 10 },
    { id: '5x15', name: '5\' × 15\'', priceModifier: 18.75, width: 5, height: 15 },
    { id: '5x20', name: '5\' × 20\'', priceModifier: 25.0, width: 5, height: 20 }
  ]
});

// PRODUCTS CATALOG - REAL SPECIFICATIONS
export const PRODUCTS: Product[] = [
  
  // VINYL STICKERS
  {
    id: generateProductId('vinyl-stickers', 'custom'),
    sku: generateSKU('vinyl-stickers', 'CUSTOM'),
    name: 'Custom Vinyl Stickers',
    description: 'Premium waterproof vinyl stickers with custom shapes and finishes.',
    shortDescription: 'Waterproof custom vinyl stickers',
    category: 'vinyl-stickers',
    basePrice: 0.65,
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    attributes: [
      createShapeAttribute(['Custom Shape', 'Circle', 'Oval', 'Rectangle', 'Square', 'Kiss-Cut'], 1),
      createFinishAttribute(2),
      createStickerSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Waterproof & UV Resistant',
      'Custom Shapes Available',
      'Multiple Finish Options',
      'Dishwasher Safe',
      'Premium Vinyl Material'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // HOLOGRAPHIC STICKERS
  {
    id: generateProductId('holographic-stickers', 'rainbow'),
    sku: generateSKU('holographic-stickers', 'RAINBOW'),
    name: 'Holographic Rainbow Stickers',
    description: 'Eye-catching holographic stickers with prismatic rainbow effects.',
    shortDescription: 'Holographic stickers with rainbow effects',
    category: 'holographic-stickers',
    basePrice: 0.85,
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
    attributes: [
      createShapeAttribute(['Custom Shape', 'Circle', 'Oval', 'Rectangle', 'Square', 'Kiss-Cut'], 1),
      createWhiteBaseAttribute(2),
      createStickerSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Holographic Rainbow Effect',
      'White Base Options',
      'Custom Shapes Available',
      'Specialty Material',
      'Eye-Catching Finish'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // CHROME STICKERS
  {
    id: generateProductId('chrome-stickers', 'mirror'),
    sku: generateSKU('chrome-stickers', 'MIRROR'),
    name: 'Chrome Mirror Stickers',
    description: 'Premium chrome stickers with mirror-like metallic finish.',
    shortDescription: 'Mirror-finish chrome stickers',
    category: 'chrome-stickers',
    basePrice: 0.95,
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png',
    attributes: [
      createShapeAttribute(['Custom Shape', 'Circle', 'Oval', 'Rectangle', 'Square', 'Kiss-Cut'], 1),
      createWhiteBaseAttribute(2),
      createStickerSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Mirror Chrome Finish',
      'Metallic Appearance',
      'White Base Options',
      'Automotive Grade',
      'Premium Material'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // GLITTER STICKERS
  {
    id: generateProductId('glitter-stickers', 'sparkle'),
    sku: generateSKU('glitter-stickers', 'SPARKLE'),
    name: 'Glitter Sparkle Stickers',
    description: 'Dazzling glitter stickers that catch and reflect light beautifully.',
    shortDescription: 'Sparkly glitter stickers',
    category: 'glitter-stickers',
    basePrice: 0.75,
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png',
    attributes: [
      createShapeAttribute(['Custom Shape', 'Circle', 'Oval', 'Rectangle', 'Square', 'Kiss-Cut'], 1),
      createWhiteBaseAttribute(2),
      createStickerSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Sparkly Glitter Finish',
      'White Base Options',
      'Eye-Catching Sparkle',
      'Durable Material',
      'Party Perfect'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // CLEAR STICKERS (NEW)
  {
    id: generateProductId('clear-stickers', 'transparent'),
    sku: generateSKU('clear-stickers', 'TRANSPARENT'),
    name: 'Clear Transparent Stickers',
    description: 'Crystal clear transparent stickers perfect for windows and glass.',
    shortDescription: 'Clear transparent stickers',
    category: 'clear-stickers',
    basePrice: 0.70,
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    attributes: [
      createShapeAttribute(['Custom Shape', 'Circle', 'Oval', 'Rectangle', 'Square', 'Kiss-Cut'], 1),
      createWhiteBaseAttribute(2),
      createStickerSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Crystal Clear Material',
      'Window Safe',
      'White Base Options',
      'UV Resistant',
      'Professional Quality'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // STICKER SHEETS (NEW)
  {
    id: generateProductId('sticker-sheets', 'multi'),
    sku: generateSKU('sticker-sheets', 'MULTI'),
    name: 'Custom Sticker Sheets',
    description: 'Multiple stickers on one sheet - perfect for sticker packs and collections.',
    shortDescription: 'Multi-sticker sheets',
    category: 'sticker-sheets',
    basePrice: 0.50, // Lower per sq inch since it's multiple stickers
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    attributes: [
      createShapeAttribute(['Horizontal', 'Vertical', 'Square', 'Circle', 'Custom Shape'], 1),
      createFinishAttribute(2),
      createStickerSheetSizeAttribute(3),
      createCustomSizeAttribute(4),
      createQuantityAttribute(15, 100000, 5),
      createFileUploadAttribute(6)
    ],
    features: [
      'Multiple Stickers Per Sheet',
      'Cost Effective',
      'Custom Layouts',
      'Professional Quality',
      'Easy Distribution'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: true,
      hasCustomSize: true
    }
  },

  // VINYL BANNERS
  {
    id: generateProductId('vinyl-banners', 'outdoor'),
    sku: generateSKU('vinyl-banners', 'OUTDOOR'),
    name: 'Custom Vinyl Banners',
    description: 'Heavy-duty outdoor vinyl banners in various sizes.',
    shortDescription: 'Heavy-duty outdoor vinyl banners',
    category: 'vinyl-banners',
    basePrice: 12.50, // Base price per sq ft
    pricingModel: 'per-square-inch',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png',
    attributes: [
      createBannerSizeAttribute(1),
      createFileUploadAttribute(2)
    ],
    features: [
      'Heavy Duty Vinyl',
      'Weather Resistant',
      'Hemmed with Grommets',
      'UV Protection',
      'Multiple Sizes'
    ],
    customizable: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
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

// Get attributes for a specific product (useful for building UI)
export const getProductAttributes = (productId: string): ProductAttribute[] => {
  const product = getProductById(productId);
  return product && product.attributes ? product.attributes.sort((a, b) => a.order - b.order) : [];
};

// Get default selections for a product (useful for calculator initialization)
export const getDefaultSelections = (productId: string) => {
  const product = getProductById(productId);
  if (!product || !product.attributes) return {};

  const selections: any = {};
  
  product.attributes.forEach(attr => {
    const defaultOption = attr.options?.find(opt => opt.isDefault);
    if (defaultOption) {
      selections[attr.id] = {
        type: attr.type,
        value: defaultOption.id,
        displayValue: defaultOption.name,
        priceImpact: 0
      };
    }
    
    // Special handling for quantity
    if (attr.type === 'quantity' && attr.quantity) {
      selections[attr.id] = {
        type: attr.type,
        value: { amount: attr.quantity.default, bulkTier: 0, priceModifier: 1.0 },
        displayValue: `${attr.quantity.default}`,
        priceImpact: 0
      };
    }
  });

  return selections;
}; 