import { Product, generateProductId, generateSKU } from '../../types/product';

export interface DealProduct extends Product {
  dealPrice: number;
  dealQuantity: number;
  dealSize: string;
  originalPrice?: number;
  savings?: number;
}

export const PRESET_DEALS: DealProduct[] = [
  // 100 3" Vinyl Stickers for $29
  {
    id: generateProductId('deals', 'vinyl-100-3inch'),
    sku: generateSKU('deals', 'vinyl-100-3inch'),
    name: '100 3" Vinyl Stickers',
    description: 'Perfect starter pack - 100 premium vinyl stickers at 3" max width. Waterproof, UV-resistant, and laminated for 7-year durability.',
    shortDescription: '100 premium vinyl stickers at 3" max width',
    category: 'deals',
    basePrice: 0.29, // $29 / 100 = $0.29 per sticker
    dealPrice: 29,
    dealQuantity: 100,
    dealSize: '3"',
    originalPrice: 88,
    savings: 59,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    features: [
      'Waterproof & UV Resistant',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Premium Vinyl Material'
    ],
    customizable: true,
    minQuantity: 100,
    maxQuantity: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 50 3" Vinyl Stickers for $21
  {
    id: generateProductId('deals', 'vinyl-50-3inch'),
    sku: generateSKU('deals', 'vinyl-50-3inch'),
    name: '50 3" Vinyl Stickers',
    description: 'Great value pack - 50 premium vinyl stickers at 3" max width. Perfect for small projects and testing designs.',
    shortDescription: '50 premium vinyl stickers at 3" max width',
    category: 'deals',
    basePrice: 0.42, // $21 / 50 = $0.42 per sticker
    dealPrice: 21,
    dealQuantity: 50,
    dealSize: '3"',
    originalPrice: 68,
    savings: 47,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    features: [
      'Waterproof & UV Resistant',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Premium Vinyl Material'
    ],
    customizable: true,
    minQuantity: 50,
    maxQuantity: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 100 3" Holographic Stickers for $49
  {
    id: generateProductId('deals', 'holographic-100-3inch'),
    sku: generateSKU('deals', 'holographic-100-3inch'),
    name: '100 3" Holographic Stickers',
    description: 'Premium holographic stickers with stunning light reflections. 100 stickers at 3" max width.',
    shortDescription: '100 holographic stickers at 3" max width',
    category: 'deals',
    basePrice: 0.49, // $49 / 100 = $0.49 per sticker
    dealPrice: 49,
    dealQuantity: 100,
    dealSize: '3"',
    originalPrice: 100,
    savings: 51,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
    features: [
      'Holographic Rainbow Effect',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Specialty Holographic Vinyl'
    ],
    customizable: true,
    minQuantity: 100,
    maxQuantity: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 50 3" Holographic Stickers for $35
  {
    id: generateProductId('deals', 'holographic-50-3inch'),
    sku: generateSKU('deals', 'holographic-50-3inch'),
    name: '50 3" Holographic Stickers',
    description: 'Eye-catching holographic stickers for premium projects. 50 stickers at 3" max width.',
    shortDescription: '50 holographic stickers at 3" max width',
    category: 'deals',
    basePrice: 0.70, // $35 / 50 = $0.70 per sticker
    dealPrice: 35,
    dealQuantity: 50,
    dealSize: '3"',
    originalPrice: 78,
    savings: 43,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
    features: [
      'Holographic Rainbow Effect',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Specialty Holographic Vinyl'
    ],
    customizable: true,
    minQuantity: 50,
    maxQuantity: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 150 3" Vinyl Stickers for $49
  {
    id: generateProductId('deals', 'vinyl-150-3inch'),
    sku: generateSKU('deals', 'vinyl-150-3inch'),
    name: '150 3" Vinyl Stickers',
    description: '150 premium vinyl stickers at 3" max width. Perfect for bulk projects and maximum savings.',
    shortDescription: '150 premium vinyl stickers at 3" max width',
    category: 'deals',
    basePrice: 0.33, // $49 / 150 = $0.33 per sticker
    dealPrice: 49,
    dealQuantity: 150,
    dealSize: '3"',
    originalPrice: 131,
    savings: 82,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    features: [
      'Waterproof & UV Resistant',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Premium Vinyl Material'
    ],
    customizable: true,
    minQuantity: 150,
    maxQuantity: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 100 3" Matte Chrome Stickers for $49
  {
    id: generateProductId('deals', 'chrome-100-3inch'),
    sku: generateSKU('deals', 'chrome-100-3inch'),
    name: '100 3" Matte Chrome Stickers',
    description: 'Premium matte chrome stickers with automotive-grade quality. 100 stickers at 3" max width.',
    shortDescription: '100 matte chrome stickers at 3" max width',
    category: 'deals',
    basePrice: 0.49, // $49 / 100 = $0.49 per sticker
    dealPrice: 49,
    dealQuantity: 100,
    dealSize: '3"',
    originalPrice: 100,
    savings: 51,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png',
    features: [
      'Matte Chrome Finish',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '3" Max Width',
      'Automotive Grade Quality'
    ],
    customizable: true,
    minQuantity: 100,
    maxQuantity: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 50 2" Holographic Stickers for $19
  {
    id: generateProductId('deals', 'holographic-50-2inch'),
    sku: generateSKU('deals', 'holographic-50-2inch'),
    name: '50 2" Holographic Stickers',
    description: 'Compact holographic stickers perfect for smaller applications. 50 stickers at 2" max width.',
    shortDescription: '50 holographic stickers at 2" max width',
    category: 'deals',
    basePrice: 0.38, // $19 / 50 = $0.38 per sticker
    dealPrice: 19,
    dealQuantity: 50,
    dealSize: '2"',
    originalPrice: 67,
    savings: 48,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
    features: [
      'Holographic Rainbow Effect',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '2" Max Width',
      'Specialty Holographic Vinyl'
    ],
    customizable: true,
    minQuantity: 50,
    maxQuantity: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  },

  // 100 2.5" Vinyl Stickers for $25
  {
    id: generateProductId('deals', 'vinyl-100-2.5inch'),
    sku: generateSKU('deals', 'vinyl-100-2.5inch'),
    name: '100 2.5" Vinyl Stickers',
    description: 'Mid-size premium vinyl stickers at great value. 100 stickers at 2.5" max width - perfect balance of size and price.',
    shortDescription: '100 premium vinyl stickers at 2.5" max width',
    category: 'deals',
    basePrice: 0.25, // $25 / 100 = $0.25 per sticker
    dealPrice: 25,
    dealQuantity: 100,
    dealSize: '2.5"',
    originalPrice: 75,
    savings: 50,
    pricingModel: 'flat-rate',
    images: [
      'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
    ],
    defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
    features: [
      'Waterproof & UV Resistant',
      'Laminated with 7yr protection',
      'Custom Shapes',
      '2.5" Max Width',
      'Premium Vinyl Material'
    ],
    customizable: true,
    minQuantity: 100,
    maxQuantity: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculatorConfig: {
      showPreview: true,
      allowFileUpload: true,
      requireProof: false,
      hasCustomSize: false
    }
  }
];

// Helper functions
export const getDealById = (id: string): DealProduct | undefined => {
  return PRESET_DEALS.find(deal => deal.id === id);
};

export const getAllActiveDeals = (): DealProduct[] => {
  return PRESET_DEALS.filter(deal => deal.isActive);
};

export const getDealsByQuantity = (quantity: number): DealProduct[] => {
  return PRESET_DEALS.filter(deal => deal.dealQuantity === quantity && deal.isActive);
};

export const getDealsByMaterial = (material: string): DealProduct[] => {
  const materialMap: { [key: string]: string } = {
    'vinyl': 'vinyl',
    'holographic': 'holographic',
    'chrome': 'chrome'
  };
  
  return PRESET_DEALS.filter(deal => 
    deal.name.toLowerCase().includes(materialMap[material.toLowerCase()]) && deal.isActive
  );
}; 