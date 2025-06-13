// CSV Pricing Utility for Sticker Shuttle
// Handles parsing and querying pricing data from CSV files

export interface PricingRow {
  productType: string;
  sizeInches: number;
  quantity: number;
  basePrice: number;
  totalPrice: number;
  pricePerSticker: number;
  discountMultiplier: number;
  rushMultiplier: number;
}

export interface PricingData {
  [key: string]: PricingRow[]; // Keyed by product type
}

// Parse CSV text into structured pricing data
export function parseCSVPricing(csvText: string): PricingData {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  const pricingData: PricingData = {};
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    const row: PricingRow = {
      productType: values[0],
      sizeInches: parseFloat(values[1]),
      quantity: parseInt(values[2]),
      basePrice: parseFloat(values[3]),
      totalPrice: parseFloat(values[4]),
      pricePerSticker: parseFloat(values[5]),
      discountMultiplier: parseFloat(values[6]),
      rushMultiplier: parseFloat(values[7])
    };
    
    if (!pricingData[row.productType]) {
      pricingData[row.productType] = [];
    }
    
    pricingData[row.productType].push(row);
  }
  
  return pricingData;
}

// Load pricing data from CSV file
export async function loadPricingData(csvPath: string): Promise<PricingData> {
  try {
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error(`Failed to load pricing data: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    return parseCSVPricing(csvText);
  } catch (error) {
    console.error('Error loading pricing data:', error);
    throw error;
  }
}

// Find exact pricing match for size and quantity
export function findExactPrice(
  pricingData: PricingData, 
  productType: string, 
  sizeInches: number, 
  quantity: number
): PricingRow | null {
  const productPricing = pricingData[productType];
  if (!productPricing) return null;
  
  return productPricing.find(row => 
    row.sizeInches === sizeInches && row.quantity === quantity
  ) || null;
}

// Calculate price for custom size using interpolation
export function calculateCustomPrice(
  pricingData: PricingData,
  productType: string,
  customArea: number, // in square inches
  quantity: number,
  rushOrder: boolean = false
): { total: number; perSticker: number } | null {
  const productPricing = pricingData[productType];
  if (!productPricing) return null;
  
  // Find the closest quantity tier
  const quantityTiers = [...new Set(productPricing.map(row => row.quantity))].sort((a, b) => a - b);
  const closestQuantity = findClosestQuantity(quantityTiers, quantity);
  
  // Get pricing for this quantity tier
  const quantityPricing = productPricing.filter(row => row.quantity === closestQuantity);
  
  if (quantityPricing.length === 0) return null;
  
  // Calculate price based on area
  let pricePerSticker = 0;
  
  if (quantityPricing.length === 1) {
    // Only one size available, scale by area
    const baseRow = quantityPricing[0];
    const baseArea = baseRow.sizeInches * baseRow.sizeInches;
    pricePerSticker = baseRow.pricePerSticker * (customArea / baseArea);
  } else {
    // Interpolate between available sizes
    pricePerSticker = interpolatePriceByArea(quantityPricing, customArea);
  }
  
  // Apply quantity scaling if exact quantity doesn't match
  if (quantity !== closestQuantity) {
    const quantityMultiplier = calculateQuantityMultiplier(quantityTiers, quantity, closestQuantity);
    pricePerSticker *= quantityMultiplier;
  }
  
  // Apply rush order multiplier
  if (rushOrder) {
    const rushMultiplier = quantityPricing[0].rushMultiplier || 1.4;
    pricePerSticker *= rushMultiplier;
  }
  
  const totalPrice = pricePerSticker * quantity;
  
  return {
    total: totalPrice,
    perSticker: pricePerSticker
  };
}

// Find the closest quantity tier
function findClosestQuantity(quantityTiers: number[], targetQuantity: number): number {
  if (targetQuantity <= quantityTiers[0]) return quantityTiers[0];
  if (targetQuantity >= quantityTiers[quantityTiers.length - 1]) return quantityTiers[quantityTiers.length - 1];
  
  for (let i = 0; i < quantityTiers.length - 1; i++) {
    if (targetQuantity >= quantityTiers[i] && targetQuantity <= quantityTiers[i + 1]) {
      // Return the lower tier for conservative pricing
      return quantityTiers[i];
    }
  }
  
  return quantityTiers[0];
}

// Interpolate price based on area between available sizes
function interpolatePriceByArea(quantityPricing: PricingRow[], targetArea: number): number {
  // Sort by size
  const sortedPricing = quantityPricing.sort((a, b) => a.sizeInches - b.sizeInches);
  
  // Convert sizes to areas
  const areaData = sortedPricing.map(row => ({
    area: row.sizeInches * row.sizeInches,
    pricePerSticker: row.pricePerSticker
  }));
  
  // If target area is smaller than smallest available
  if (targetArea <= areaData[0].area) {
    return areaData[0].pricePerSticker * (targetArea / areaData[0].area);
  }
  
  // If target area is larger than largest available
  if (targetArea >= areaData[areaData.length - 1].area) {
    const lastData = areaData[areaData.length - 1];
    return lastData.pricePerSticker * (targetArea / lastData.area);
  }
  
  // Interpolate between two closest sizes
  for (let i = 0; i < areaData.length - 1; i++) {
    if (targetArea >= areaData[i].area && targetArea <= areaData[i + 1].area) {
      const ratio = (targetArea - areaData[i].area) / (areaData[i + 1].area - areaData[i].area);
      return areaData[i].pricePerSticker + ratio * (areaData[i + 1].pricePerSticker - areaData[i].pricePerSticker);
    }
  }
  
  // Fallback to first price
  return areaData[0].pricePerSticker;
}

// Calculate quantity multiplier for non-standard quantities
function calculateQuantityMultiplier(
  quantityTiers: number[], 
  targetQuantity: number, 
  baseQuantity: number
): number {
  // Simple scaling - you can make this more sophisticated
  if (targetQuantity === baseQuantity) return 1.0;
  
  // Find the discount progression
  const baseIndex = quantityTiers.indexOf(baseQuantity);
  
  if (targetQuantity > baseQuantity && baseIndex < quantityTiers.length - 1) {
    // Quantity is higher, should be cheaper per unit
    const nextTier = quantityTiers[baseIndex + 1];
    const progressRatio = Math.min((targetQuantity - baseQuantity) / (nextTier - baseQuantity), 1.0);
    return 1.0 - (progressRatio * 0.05); // Up to 5% additional discount
  } else if (targetQuantity < baseQuantity && baseIndex > 0) {
    // Quantity is lower, should be more expensive per unit
    const prevTier = quantityTiers[baseIndex - 1];
    const progressRatio = (baseQuantity - targetQuantity) / (baseQuantity - prevTier);
    return 1.0 + (progressRatio * 0.1); // Up to 10% price increase
  }
  
  return 1.0;
}

// Get all available quantities for a product type
export function getAvailableQuantities(pricingData: PricingData, productType: string): number[] {
  const productPricing = pricingData[productType];
  if (!productPricing) return [];
  
  return [...new Set(productPricing.map(row => row.quantity))].sort((a, b) => a - b);
}

// Get all available sizes for a product type
export function getAvailableSizes(pricingData: PricingData, productType: string): number[] {
  const productPricing = pricingData[productType];
  if (!productPricing) return [];
  
  return [...new Set(productPricing.map(row => row.sizeInches))].sort((a, b) => a - b);
}

// Validate if a combination exists in the pricing data
export function validatePricingCombination(
  pricingData: PricingData,
  productType: string,
  sizeInches: number,
  quantity: number
): boolean {
  return findExactPrice(pricingData, productType, sizeInches, quantity) !== null;
}

// Get pricing summary for debugging
export function getPricingSummary(pricingData: PricingData): string {
  let summary = 'Pricing Data Summary:\n';
  
  Object.entries(pricingData).forEach(([productType, pricing]) => {
    const quantities = getAvailableQuantities(pricingData, productType);
    const sizes = getAvailableSizes(pricingData, productType);
    
    summary += `\n${productType}:\n`;
    summary += `  Sizes: ${sizes.join(', ')} inches\n`;
    summary += `  Quantities: ${quantities.join(', ')}\n`;
    summary += `  Total combinations: ${pricing.length}\n`;
  });
  
  return summary;
} 