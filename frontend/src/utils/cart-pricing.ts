// Real Pricing System for Sticker Shuttle
// Uses actual CSV data: base-price.csv and qty-sq.csv

export interface BasePriceRow {
  sqInches: number;
  basePrice: number;
}

export interface QuantityDiscountRow {
  quantity: number;
  discounts: { [sqInches: number]: number }; // Square inches to discount multiplier
}

export interface PricingCalculation {
  basePrice: number;
  discountMultiplier: number;
  finalPricePerSticker: number;
  totalPrice: number;
  sqInches: number;
  quantity: number;
}

// Parse base pricing CSV (Sq. Inches, Base Price)
export function parseBasePricing(csvText: string): BasePriceRow[] {
  const lines = csvText.trim().split('\n');
  const data: BasePriceRow[] = [];
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const [sqInchesStr, basePriceStr] = lines[i].split(',');
    
    if (sqInchesStr && basePriceStr) {
      const sqInches = parseInt(sqInchesStr.trim());
      const basePrice = parseFloat(basePriceStr.replace('$', '').trim());
      
      if (!isNaN(sqInches) && !isNaN(basePrice)) {
        data.push({ sqInches, basePrice });
      }
    }
  }
  
  return data.sort((a, b) => a.sqInches - b.sqInches);
}

// Parse quantity discount CSV (complex format with square inches as columns)
export function parseQuantityDiscounts(csvText: string): QuantityDiscountRow[] {
  const lines = csvText.trim().split('\n');
  
  // Parse second row to get square inch values (first row is just "Quantity,Square Inches,...")
  const sqInchParts = lines[1].split(',');
  const sqInchColumns: number[] = [];
  
  // Extract square inch values from second row (skip first empty column)
  for (let i = 1; i < sqInchParts.length; i++) {
    const sqInches = parseInt(sqInchParts[i].trim());
    if (!isNaN(sqInches)) {
      sqInchColumns.push(sqInches);
    }
  }
  
  const data: QuantityDiscountRow[] = [];
  
  // Parse data rows (skip header and square inch row)
  for (let i = 2; i < lines.length; i++) {
    const parts = lines[i].split(',');
    
    // Skip lines that start with "*" (notes)
    if (parts.length > 0 && !parts[0].trim().startsWith('*')) {
      // Parse quantity (handle quoted values like "1,000 ")
      let quantityStr = parts[0].trim();
      
      // Handle cases like "1,000 " or just "100 "
      if (quantityStr.startsWith('"') && parts.length > 1 && parts[1].includes('"')) {
        // This is a quoted quantity like "1,000 " split across columns
        quantityStr = quantityStr.replace('"', '') + parts[1].replace('"', '');
        // Shift the discount values by one position
        parts.splice(1, 1); // Remove the second part of the quantity
      }
      
      // Clean up the quantity string
      quantityStr = quantityStr.replace(/[",\s]/g, '');
      const quantity = parseInt(quantityStr);
      
      if (!isNaN(quantity) && quantity > 0) {
        const discounts: { [sqInches: number]: number } = {};
        
        // Parse discount values for each square inch column
        for (let j = 1; j < parts.length && j - 1 < sqInchColumns.length; j++) {
          const discountStr = parts[j].trim();
          const discount = parseFloat(discountStr);
          
          if (!isNaN(discount)) {
            discounts[sqInchColumns[j - 1]] = discount;
          }
        }
        
        data.push({ quantity, discounts });
      }
    }
  }
  
  return data.sort((a, b) => a.quantity - b.quantity);
}

// Load pricing data from CSV files
export async function loadRealPricingData(): Promise<{
  basePricing: BasePriceRow[];
  quantityDiscounts: QuantityDiscountRow[];
}> {
  try {
    const [basePriceResponse, qtyDiscountResponse] = await Promise.all([
      fetch('/orbit/base-price.csv'),
      fetch('/orbit/qty-sq.csv')
    ]);
    
    if (!basePriceResponse.ok || !qtyDiscountResponse.ok) {
      throw new Error(`Failed to load pricing CSV files: base-price (${basePriceResponse.status}), qty-sq (${qtyDiscountResponse.status})`);
    }
    
    const [basePriceText, qtyDiscountText] = await Promise.all([
      basePriceResponse.text(),
      qtyDiscountResponse.text()
    ]);
    
    const basePricing = parseBasePricing(basePriceText);
    const quantityDiscounts = parseQuantityDiscounts(qtyDiscountText);
    
    return { basePricing, quantityDiscounts };
    
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // This appears to be a network error. CSV files may not be accessible.
    }
    throw error;
  }
}

// Get base price for specific square inches
export function getBasePrice(basePricing: BasePriceRow[], sqInches: number): number {
  // Find exact match first
  const exactMatch = basePricing.find(row => row.sqInches === sqInches);
  if (exactMatch) {
    return exactMatch.basePrice;
  }
  
  // If no exact match, interpolate between closest values
  const sortedPricing = basePricing.sort((a, b) => a.sqInches - b.sqInches);
  
  // If smaller than smallest, use smallest
  if (sqInches <= sortedPricing[0].sqInches) {
    return sortedPricing[0].basePrice;
  }
  
  // If larger than largest, use largest
  if (sqInches >= sortedPricing[sortedPricing.length - 1].sqInches) {
    return sortedPricing[sortedPricing.length - 1].basePrice;
  }
  
  // Interpolate between two closest values
  for (let i = 0; i < sortedPricing.length - 1; i++) {
    if (sqInches >= sortedPricing[i].sqInches && sqInches <= sortedPricing[i + 1].sqInches) {
      const ratio = (sqInches - sortedPricing[i].sqInches) / 
                   (sortedPricing[i + 1].sqInches - sortedPricing[i].sqInches);
      
      return sortedPricing[i].basePrice + 
             ratio * (sortedPricing[i + 1].basePrice - sortedPricing[i].basePrice);
    }
  }
  
  return sortedPricing[0].basePrice; // Fallback
}

// Get discount multiplier for quantity and square inches
export function getDiscountMultiplier(
  quantityDiscounts: QuantityDiscountRow[], 
  quantity: number, 
  sqInches: number
): number {
  // Find the appropriate quantity tier (use lower tier as per note in CSV)
  let applicableQuantity = 50; // Default to lowest
  
  for (const row of quantityDiscounts) {
    if (quantity >= row.quantity) {
      applicableQuantity = row.quantity;
    } else {
      break;
    }
  }
  
  const quantityRow = quantityDiscounts.find(row => row.quantity === applicableQuantity);
  if (!quantityRow) {
    return 0; // No discount for quantities below 100
  }
  
  // Find the appropriate square inch tier
  const availableSqInches = Object.keys(quantityRow.discounts)
    .map(k => parseInt(k))
    .sort((a, b) => a - b);
  
  // Find closest square inch value (use lower value as per CSV note)
  let applicableSqInches = availableSqInches[0];
  
  for (const sqIn of availableSqInches) {
    if (sqInches >= sqIn) {
      applicableSqInches = sqIn;
    } else {
      break;
    }
  }
  
  return quantityRow.discounts[applicableSqInches] || 0;
}

// Calculate final pricing
export function calculateRealPrice(
  basePricing: BasePriceRow[],
  quantityDiscounts: QuantityDiscountRow[],
  sqInches: number,
  quantity: number,
  rushOrder: boolean = false
): PricingCalculation {
  const basePrice = getBasePrice(basePricing, sqInches);
  const discountMultiplier = getDiscountMultiplier(quantityDiscounts, quantity, sqInches);
  
  // Calculate final price per sticker
  let finalPricePerSticker = basePrice;
  
  // Apply discount if available (discount multiplier is a percentage: 0.43 = 43% off)
  if (discountMultiplier > 0) {
    finalPricePerSticker = basePrice * (1 - discountMultiplier);
  }
  
  // Apply rush order multiplier (40% increase)
  if (rushOrder) {
    finalPricePerSticker *= 1.4;
  }
  
  const totalPrice = finalPricePerSticker * quantity;
  
  return {
    basePrice,
    discountMultiplier,
    finalPricePerSticker,
    totalPrice,
    sqInches,
    quantity
  };
}

// Get available quantities from discount data
export function getAvailableQuantities(quantityDiscounts: QuantityDiscountRow[]): number[] {
  return quantityDiscounts.map(row => row.quantity).sort((a, b) => a - b);
}

// Get available square inch tiers from discount data
export function getAvailableSquareInches(quantityDiscounts: QuantityDiscountRow[]): number[] {
  if (quantityDiscounts.length === 0) return [];
  
  const sqInches = Object.keys(quantityDiscounts[0].discounts)
    .map(k => parseInt(k))
    .sort((a, b) => a - b);
  
  return sqInches;
}

// Utility to calculate square inches from dimensions
export function calculateSquareInches(width: number, height: number): number {
  return width * height;
}

// Preset size calculations
export const PRESET_SIZES = {
  small: { width: 2, height: 2, sqInches: 4, label: 'Small (2″ × 2″)' },
  medium: { width: 3, height: 3, sqInches: 9, label: 'Medium (3″ × 3″)' },
  large: { width: 4, height: 4, sqInches: 16, label: 'Large (4″ × 4″)' },
  xlarge: { width: 5, height: 5, sqInches: 25, label: 'X-Large (5″ × 5″)' }
};

// Debug function to show pricing summary
export function getPricingSummary(
  basePricing: BasePriceRow[],
  quantityDiscounts: QuantityDiscountRow[]
): string {
  let summary = 'Real Pricing Data Summary:\n';
  summary += `Base Pricing: ${basePricing.length} entries (${basePricing[0]?.sqInches}" to ${basePricing[basePricing.length - 1]?.sqInches}")\n`;
  summary += `Quantity Discounts: ${quantityDiscounts.length} quantity tiers\n`;
  summary += `Available Quantities: ${getAvailableQuantities(quantityDiscounts).join(', ')}\n`;
  summary += `Square Inch Tiers: ${getAvailableSquareInches(quantityDiscounts).join(', ')}\n`;
  
  // Sample calculations
  summary += '\nSample Calculations:\n';
  const sampleCalc1 = calculateRealPrice(basePricing, quantityDiscounts, 9, 100, false);
  summary += `3" stickers (9 sq in), qty 100: $${sampleCalc1.finalPricePerSticker.toFixed(2)}/each = $${sampleCalc1.totalPrice.toFixed(2)} total\n`;
  
  const sampleCalc2 = calculateRealPrice(basePricing, quantityDiscounts, 16, 500, false);
  summary += `4" stickers (16 sq in), qty 500: $${sampleCalc2.finalPricePerSticker.toFixed(2)}/each = $${sampleCalc2.totalPrice.toFixed(2)} total\n`;
  
  return summary;
} 

/**
 * Calculate credit earnings with $100 limit consideration
 * @param orderTotal - The total order amount
 * @param currentBalance - User's current credit balance
 * @param creditRate - The credit rate (0.05 for 5%, 0.025 for 2.5%)
 * @returns Object with earning details and messaging
 */
export function calculateCreditEarningsWithLimit(
  orderTotal: number,
  currentBalance: number,
  creditRate: number = 0.05
): {
  creditAmount: number;
  potentialAmount: number;
  isLimitReached: boolean;
  isLimitExceeded: boolean;
  message: string;
} {
  const CREDIT_LIMIT = 100;
  
  // If already at limit, no credits earned
  if (currentBalance >= CREDIT_LIMIT) {
    return {
      creditAmount: 0,
      potentialAmount: orderTotal * creditRate,
      isLimitReached: true,
      isLimitExceeded: false,
      message: `You've reached the $${CREDIT_LIMIT.toFixed(2)} credit limit. Please use your existing credits to earn more.`
    };
  }
  
  const potentialAmount = orderTotal * creditRate;
  const newPotentialBalance = currentBalance + potentialAmount;
  
  // If this order would exceed the limit, cap it
  if (newPotentialBalance > CREDIT_LIMIT) {
    const cappedAmount = CREDIT_LIMIT - currentBalance;
    return {
      creditAmount: cappedAmount,
      potentialAmount: potentialAmount,
      isLimitReached: false,
      isLimitExceeded: true,
      message: `You'll earn $${cappedAmount.toFixed(2)} in store credit (capped at $${CREDIT_LIMIT.toFixed(2)} limit). Without the limit, you would have earned $${potentialAmount.toFixed(2)}.`
    };
  }
  
  // Normal earning within limit
  return {
    creditAmount: potentialAmount,
    potentialAmount: potentialAmount,
    isLimitReached: false,
    isLimitExceeded: false,
    message: `You'll earn $${potentialAmount.toFixed(2)} in store credit on this order!`
  };
} 