// Product types for Sticker Shuttle - Updated with Real Specifications
export type ProductCategory = 
  | 'vinyl-stickers' 
  | 'holographic-stickers' 
  | 'chrome-stickers' 
  | 'glitter-stickers' 
  | 'clear-stickers'    // Added
  | 'sticker-sheets'    // Added
  | 'vinyl-banners'
  | 'pop-up-banners'    // Added for Bannership pop-up banners
  | 'x-banners'         // Added for Bannership X-banners
  | 'deals'             // Added for preset deals
  | 'marketplace'       // Added for marketplace products
  | 'marketplace-stickers' // Added for marketplace sticker products
  | 'marketplace-pack'; // Added for marketplace packs

// Size definitions for products
export interface ProductSize {
  id: string;
  name: string;
  dimensions: string;
  widthInches: number;
  heightInches: number;
  squareInches: number;
  priceModifier: number;
  minQuantity: number;
  maxQuantity: number;
}

// Attribute Types for Product Customization
export type AttributeType = 
  | 'shape'          // Shape options (Custom Shape, Circle, etc.)
  | 'white-base'     // White base options (for holo/glitter/chrome/clear)
  | 'finish'         // Surface finish (for vinyl/sheets)
  | 'size-preset'    // Preset size options with custom option
  | 'size-custom'    // Custom size inputs
  | 'quantity'       // Quantity selector
  | 'file-upload'    // File upload requirement
  | 'addon';         // Add-on enhancements (vibrancy, etc.)

// Individual Attribute Definitions
export interface AttributeOption {
  id: string;
  name: string;
  description?: string;
  priceModifier: number; // Multiplier or flat fee
  isDefault?: boolean;
  isAvailable?: boolean;
  image?: string;
  // For size presets
  width?: number;
  height?: number;
}

export interface ProductAttribute {
  id: string;
  type: AttributeType;
  name: string;
  description: string;
  required: boolean;
  order: number; // Display order in UI
  
  // For size-custom type
  customSize?: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    unit: 'inches' | 'feet';
    pricePerSquareInch: number;
  };
  
  // For quantity type  
  quantity?: {
    min: number;
    max: number;
    default: number;
    breakpoints: Array<{
      minQty: number;
      priceModifier: number; // Bulk discount multiplier
    }>;
  };
  
  // For option-based types (shape, white-base, finish, size-preset)
  options?: AttributeOption[];
  
  // For file upload
  fileUpload?: {
    required: boolean;
    acceptedFormats: string[];
    maxFileSize: number; // in MB
    allowMultiple: boolean;
  };
}

// Product Configuration
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  category: ProductCategory;
  
  // Base pricing
  basePrice: number; // Starting price before customizations
  pricingModel?: 'per-unit' | 'per-square-inch' | 'flat-rate';
  
  // Visual assets
  images: string[];
  defaultImage: string;
  
  // Customization attributes - this is the key flexibility
  attributes?: ProductAttribute[];
  
  // Legacy/Simple product properties (for backward compatibility)
  materials?: string[];
  defaultMaterial?: string;
  sizes?: ProductSize[];
  defaultSize?: ProductSize;
  finishes?: string[];
  defaultFinish?: string;
  minQuantity?: number;
  maxQuantity?: number;
  
  // Product features for marketing
  features: string[];
  
  // Business rules
  customizable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Integration settings
  calculatorConfig?: {
    showPreview: boolean;
    allowFileUpload: boolean;
    requireProof: boolean;
    hasCustomSize: boolean;
  };
}

// Customer selections for a product
export interface ProductCustomization {
  productId: string;
  selections: {
    [attributeId: string]: {
      type: AttributeType;
      value: any; // Flexible value type
      displayValue: string; // Human readable
      priceImpact: number;
    };
  };
  totalPrice: number;
  customFiles?: string[]; // Uploaded design files
  notes?: string;
  instagramOptIn?: boolean; // Permission to post content to Instagram
  isReorder?: boolean; // Flag to indicate this is a reordered item
  isDeal?: boolean; // Flag to indicate this is a deal item
  dealPrice?: number; // Fixed deal price
  additionalInfo?: { // Additional information from calculators
    instagramHandle?: string;
    uploadLater?: boolean;
  };
}

// Cart item with full customization
export interface CartItem {
  id: string;
  product: Product;
  customization: ProductCustomization;
  quantity: number; // This might be redundant with customization.selections.quantity
  unitPrice: number;
  totalPrice: number;
  addedAt: string;
}

// Helper interfaces for common attribute patterns
export interface CustomSizeSelection {
  width: number;
  height: number;
  unit: 'inches' | 'feet';
  squareInches: number;
}

export interface ShapeSelection {
  id: string;
  name: string;
  type: 'preset' | 'custom' | 'kiss-cut';
}

export interface QuantitySelection {
  amount: number;
  bulkTier: number;
  priceModifier: number;
}

// Utility functions for ID generation
export const generateProductId = (category: ProductCategory, variant: string): string => {
  const categoryCode = category.split('-').map(part => part.substring(0, 2)).join('');
  return `${categoryCode}-${variant}`.toLowerCase();
};

export const generateSKU = (category: ProductCategory, variant: string): string => {
  const categoryAbbrev = {
    'vinyl-stickers': 'VS',
    'holographic-stickers': 'HS', 
    'chrome-stickers': 'CS',
    'glitter-stickers': 'GS',
    'clear-stickers': 'CLS',
    'sticker-sheets': 'SS',
    'vinyl-banners': 'VB',
    'deals': 'DL'
  }[category];
  
  return `SS-${categoryAbbrev}-${variant.toUpperCase()}`;
};

export const generateCartItemId = (): string => {
  return `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Pricing calculation helper
export const calculateCustomizationPrice = (
  product: Product, 
  customization: ProductCustomization
): number => {
  let totalPrice = product.basePrice;
  
  Object.values(customization.selections).forEach(selection => {
    totalPrice += selection.priceImpact;
  });
  
  return totalPrice;
};

// Validation helpers
export const validateCustomization = (
  product: Product, 
  customization: ProductCustomization
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check all required attributes are selected
  product.attributes?.filter(attr => attr.required).forEach(attr => {
    if (!customization.selections[attr.id]) {
      errors.push(`${attr.name} is required`);
    }
  });
  
  // Validate custom size constraints
  Object.entries(customization.selections).forEach(([attrId, selection]) => {
    const attribute = product.attributes?.find(a => a.id === attrId);
    if (attribute?.type === 'size-custom' && attribute.customSize) {
      const dims = selection.value as CustomSizeSelection;
      if (dims.width < attribute.customSize.minWidth || dims.width > attribute.customSize.maxWidth) {
        errors.push(`Width must be between ${attribute.customSize.minWidth}" and ${attribute.customSize.maxWidth}"`);
      }
      if (dims.height < attribute.customSize.minHeight || dims.height > attribute.customSize.maxHeight) {
        errors.push(`Height must be between ${attribute.customSize.minHeight}" and ${attribute.customSize.maxHeight}"`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 