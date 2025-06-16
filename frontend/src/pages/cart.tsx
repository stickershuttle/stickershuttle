import Layout from "@/components/Layout";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import CartCheckoutButton from "@/components/CartCheckoutButton";
import { CartItem } from "@/types/product";
import { useState, useEffect, useRef } from "react";
import { 
  calculateRealPrice, 
  loadRealPricingData, 
  BasePriceRow, 
  QuantityDiscountRow,
  calculateSquareInches,
  PRESET_SIZES 
} from "@/utils/real-pricing";
import { getSupabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

// Available configuration options
const SHAPE_OPTIONS = ["Custom Shape", "Circle", "Oval", "Rectangle", "Square"];
const MATERIAL_OPTIONS = ["Matte", "Gloss", "Shimmer Gloss"];
const SIZE_OPTIONS = ['Small (2")', 'Medium (3")', 'Large (4")', 'X-Large (5")', "Custom size"];

// Helper function to get emoji for option type
const getOptionEmoji = (type: string, value: any) => {
  switch (type) {
    case "shape":
      return "✂️";
    case "finish":
      return "🧻"; // Always toilet roll for material
    case "size-preset":
      return "📏";
    case "white-base":
      return "⚪";
    default:
      return "";
  }
};

// Helper function to properly capitalize strings
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Calculate area from size string
const calculateAreaFromSize = (sizeString: string, customWidth?: string, customHeight?: string): number => {
  if (sizeString.includes("Custom") && customWidth && customHeight) {
    const w = parseFloat(customWidth) || 0;
    const h = parseFloat(customHeight) || 0;
    return calculateSquareInches(w, h);
  }
  
  // Use preset sizes for accurate square inch calculation
  if (sizeString.includes('Small')) return PRESET_SIZES.small.sqInches; // 4 sq in (2" × 2")
  if (sizeString.includes('Medium')) return PRESET_SIZES.medium.sqInches; // 9 sq in (3" × 3")
  if (sizeString.includes('Large') && !sizeString.includes('X-Large')) return PRESET_SIZES.large.sqInches; // 16 sq in (4" × 4")
  if (sizeString.includes('X-Large')) return PRESET_SIZES.xlarge.sqInches; // 25 sq in (5" × 5")
  
  // Fallback calculation
  const match = sizeString.match(/(\d+)"/);
  const sizeInches = match ? parseInt(match[1]) : 3;
  return sizeInches * sizeInches;
};

// Calculate pricing for cart item
const calculateItemPricing = (
  item: CartItem, 
  quantity: number, 
  pricingData: { basePricing: BasePriceRow[]; quantityDiscounts: QuantityDiscountRow[] } | null
) => {
  const area = calculateAreaFromSize(
    item.customization.selections?.size?.displayValue || "Medium (3\")",
    item.customization.selections?.size?.value?.includes('x') ? 
      item.customization.selections.size.value.split('x')[0].replace('"', '') : undefined,
    item.customization.selections?.size?.value?.includes('x') ? 
      item.customization.selections.size.value.split('x')[1].replace('"', '') : undefined
  );

  const rushOrder = item.customization.selections?.rush?.value === true;
  
  // Get white option pricing modifier for holographic stickers
  const whiteOptionModifiers = {
    'color-only': 1.0,
    'partial-white': 1.05,
    'full-white': 1.1
  };
  const whiteOptionValue = item.customization.selections?.whiteOption?.value || 'color-only';
  const whiteOptionMultiplier = whiteOptionModifiers[whiteOptionValue as keyof typeof whiteOptionModifiers] || 1.0;

  if (pricingData && pricingData.basePricing && pricingData.quantityDiscounts) {
    const realResult = calculateRealPrice(
      pricingData.basePricing,
      pricingData.quantityDiscounts,
      area,
      quantity,
      rushOrder
    );
    
    // Calculate discount percentage
    let discount = 0;
    if (quantity > 50) {
      // Find the appropriate quantity tier
      let applicableQuantity = 50;
      for (const row of pricingData.quantityDiscounts) {
        if (quantity >= row.quantity) {
          applicableQuantity = row.quantity;
        } else {
          break;
        }
      }
      
      const quantityRow = pricingData.quantityDiscounts.find(row => row.quantity === applicableQuantity);
      if (quantityRow) {
        // Find the appropriate square inch tier
        const availableSqInches = Object.keys(quantityRow.discounts)
          .map(k => parseInt(k))
          .sort((a, b) => a - b);
        
        let applicableSqInches = availableSqInches[0];
        for (const sqIn of availableSqInches) {
          if (area >= sqIn) {
            applicableSqInches = sqIn;
          } else {
            break;
          }
        }
        
        const discountDecimal = quantityRow.discounts[applicableSqInches] || 0;
        discount = discountDecimal * 100; // Convert to percentage
      }
    }
    
    // Apply white option modifier for holographic stickers
    const adjustedTotal = realResult.totalPrice * whiteOptionMultiplier;
    const adjustedPerSticker = realResult.finalPricePerSticker * whiteOptionMultiplier;
    
    return {
      total: adjustedTotal,
      perSticker: adjustedPerSticker,
      discountPercentage: Math.round(discount),
      area: area
    };
  }

  // Fallback legacy pricing
  const basePrice = 1.36;
  const baseArea = 9;
  const scaledBasePrice = basePrice * (area / baseArea);
  
  const discountMap: { [key: number]: number } = {
    50: 1.0,
    100: 0.647,
    200: 0.463,
    300: 0.39,
    500: 0.324,
    750: 0.324,
    1000: 0.257,
    2500: 0.213,
  };

  // Find closest quantity tier
  const quantities = Object.keys(discountMap).map(Number).sort((a, b) => a - b);
  let applicableQuantity = quantities[0];
  for (const qty of quantities) {
    if (quantity >= qty) {
      applicableQuantity = qty;
    } else {
      break;
    }
  }

  const discountMultiplier = discountMap[applicableQuantity] || 1.0;
  let pricePerSticker = scaledBasePrice * discountMultiplier * whiteOptionMultiplier;
  let totalPrice = pricePerSticker * quantity;

  if (rushOrder) {
    totalPrice *= 1.4;
    pricePerSticker *= 1.4;
  }

  // Calculate discount percentage for legacy pricing
  const discount = quantity > 50 ? Math.round((1 - discountMultiplier) * 100) : 0;

  return {
    total: totalPrice,
    perSticker: pricePerSticker,
    discountPercentage: discount,
    area: area
  };
};

// Calculate next quantity tier savings
const calculateNextTierSavings = (
  item: CartItem,
  currentQuantity: number,
  pricingData: { basePricing: BasePriceRow[]; quantityDiscounts: QuantityDiscountRow[] } | null
) => {
  if (!pricingData) return null;

  // Major discount tiers from pricing data
  const majorTiers = [100, 200, 300, 500, 750, 1000, 2500];
  
  // Find the next major tier
  const nextMajorTier = majorTiers.find(tier => tier > currentQuantity);
  
  // If no major tier found, no upgrade suggestion
  if (!nextMajorTier) return null;
  
  // Calculate suggested next tier (50-unit increments or major tier, whichever is closer)
  let suggestedTier;
  const next50Increment = Math.ceil(currentQuantity / 50) * 50;
  
  // If the next 50 increment is less than or equal to the next major tier, use it
  // Otherwise, suggest the major tier
  if (next50Increment <= nextMajorTier && next50Increment > currentQuantity) {
    suggestedTier = next50Increment;
  } else {
    suggestedTier = nextMajorTier;
  }

  const currentPricing = calculateItemPricing(item, currentQuantity, pricingData);
  const suggestedPricing = calculateItemPricing(item, suggestedTier, pricingData);
  
  // Calculate what they would pay now for current quantity + additional quantity at current rate
  const additionalQuantity = suggestedTier - currentQuantity;
  const currentRateForAdditional = additionalQuantity * currentPricing.perSticker;
  const totalAtCurrentRate = currentPricing.total + currentRateForAdditional;
  
  // Calculate what they would pay at the new tier rate for all items
  const totalAtNewRate = suggestedTier * suggestedPricing.perSticker;
  
  // Savings is the difference
  const totalSavings = totalAtCurrentRate - totalAtNewRate;
  
  // Only show if there are actual savings and different discount percentage
  if (totalSavings <= 0 || suggestedPricing.discountPercentage <= currentPricing.discountPercentage) {
    return null;
  }

  return {
    nextTier: suggestedTier,
    additionalQuantity,
    additionalCost: additionalQuantity * suggestedPricing.perSticker, // Cost for additional items at new rate
    totalSavings,
    nextTierDiscount: suggestedPricing.discountPercentage
  };
};

// Calculate estimated delivery date (only count business days)
const calculateDeliveryDate = (totalQuantity: number, hasRushOrder: boolean) => {
  const now = new Date();
  let productionDays = 2; // 48 hours = 2 business days
  let shippingDays = 3; // Standard shipping (business days)
  let isHighVolume = false;
  
  // 5,000+ stickers require extended processing
  if (totalQuantity >= 5000) {
    productionDays = 4; // 3-4 business days, using 4 for calculation
    shippingDays = 3; // Standard shipping (business days)
    isHighVolume = true;
  }
  // 1,000+ stickers get expedited (but not if 5k+)
  else if (totalQuantity >= 1000) {
    productionDays = 1;
    shippingDays = 1; // Next day air (business days)
  }
  
  // Rush orders reduce production time (but minimum 2 days for 5k+ orders)
  if (hasRushOrder) {
    if (totalQuantity >= 5000) {
      productionDays = Math.max(2, productionDays - 1); // Minimum 2 business days for high volume
    } else {
      productionDays = Math.max(1, productionDays - 1);
    }
  }
  
  // Calculate delivery date by adding business days only
  const totalBusinessDays = productionDays + shippingDays;
  let deliveryDate = new Date(now);
  let businessDaysAdded = 0;
  
  while (businessDaysAdded < totalBusinessDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    const dayOfWeek = deliveryDate.getDay();
    
    // Only count Monday (1) through Friday (5) as business days
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDaysAdded++;
    }
  }
  
  return {
    deliveryDate,
    totalDays: totalBusinessDays,
    productionDays,
    shippingDays,
    isExpedited: totalQuantity >= 1000 && totalQuantity < 5000,
    isHighVolume
  };
};



// Helper function to format option name
const formatOptionName = (type: string) => {
  if (typeof type !== 'string') return "Option";
  
  switch (type) {
    case "shape":
      return "Shape";
    case "finish":
      return "Material";
    case "size-preset":
      return "Size";
    case "white-base":
      return "White Option";
    default:
      // Handle hyphenated names (like "size-preset")
      return type.split("-")
        .map(word => capitalize(word))
        .join(" ");
  }
};

export default function CartPage() {
  const { cart, removeFromCart, clearCart, updateCartItemQuantity, updateCartItemCustomization } = useCart();
  const [pricingData, setPricingData] = useState<{ basePricing: BasePriceRow[]; quantityDiscounts: QuantityDiscountRow[] } | null>(null);
  const [updatedCart, setUpdatedCart] = useState<CartItem[]>(cart);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<{ itemId: string, type: string } | null>(null);
  const [customSizeInputs, setCustomSizeInputs] = useState<{ [itemId: string]: { width: string, height: string } }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [itemNotes, setItemNotes] = useState<{ [itemId: string]: string }>({});
  const [instagramOptIn, setInstagramOptIn] = useState<{ [itemId: string]: boolean }>({});

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    checkUser();
  }, []);

  // Show login banner for logged-out users
  useEffect(() => {
    if (!userLoading && !user && cart.length > 0) {
      setShowLoginBanner(true);
    }
  }, [userLoading, user, cart.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking inside a dropdown
      if (target.closest('.dropdown-container')) {
        return;
      }
      if (activeDropdown) {
        setActiveDropdown(null);
        setDropdownPosition(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // Load pricing data on mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await loadRealPricingData();
        setPricingData(data);
      } catch (error) {
        console.error('Failed to load pricing data:', error);
      }
    };
    loadPricing();
  }, []);

  // Update cart when pricing data loads or cart changes
  useEffect(() => {
    if (pricingData) {
      const updated = cart.map(item => {
        const pricing = calculateItemPricing(item, item.quantity, pricingData);
        return {
          ...item,
          unitPrice: pricing.perSticker,
          totalPrice: pricing.total
        };
      });
      setUpdatedCart(updated);
    } else {
      setUpdatedCart(cart);
    }

    // Initialize notes and Instagram opt-in from existing cart data
    const notes: { [itemId: string]: string } = {};
    const instagram: { [itemId: string]: boolean } = {};
    
    cart.forEach(item => {
      if (item.customization.notes) {
        notes[item.id] = item.customization.notes;
      }
      if (item.customization.instagramOptIn) {
        instagram[item.id] = item.customization.instagramOptIn;
      }
    });
    
    setItemNotes(notes);
    setInstagramOptIn(instagram);
  }, [cart, pricingData]);

  // Handle quantity change
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = updatedCart.find(item => item.id === itemId);
    if (!item || !pricingData) return;

    const pricing = calculateItemPricing(item, newQuantity, pricingData);
    const updatedItem = {
      ...item,
      quantity: newQuantity,
      unitPrice: pricing.perSticker,
      totalPrice: pricing.total
    };

    updateCartItemQuantity(itemId, newQuantity, pricing.perSticker, pricing.total);
  };

  // Handle proof preference change
  const handleProofChange = (itemId: string, sendProof: boolean) => {
    const item = updatedCart.find(item => item.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      customization: {
        ...item.customization,
        selections: {
          ...item.customization.selections,
          proof: {
            type: "finish" as const,
            value: sendProof,
            displayValue: sendProof ? "Send Proof" : "No Proof",
            priceImpact: 0
          }
        }
      }
    };

    // Update local state
    setUpdatedCart(prevCart => 
      prevCart.map(cartItem => 
        cartItem.id === itemId ? updatedItem : cartItem
      )
    );

    // Update persistent cart
    updateCartItemCustomization(itemId, updatedItem);
  };

  // Handle wishlist toggle
  const toggleWishlist = (itemId: string) => {
    setWishlistItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle configuration option change
  const handleOptionChange = (itemId: string, optionType: string, newValue: string) => {
    const item = updatedCart.find(item => item.id === itemId);
    if (!item) return;

    // Size swapping is disabled - this code is no longer needed
    // Special handling for custom size - don't close dropdown, show inputs
    // if (optionType === 'size' && newValue === 'Custom size') {
    //   setCustomSizeInputs(prev => ({
    //     ...prev,
    //     [itemId]: { width: '', height: '' }
    //   }));
    //   return; // Don't close dropdown, don't update item yet
    // }

    // Map option types to selection keys and types
    const optionMapping: { [key: string]: { key: string, type: string } } = {
      'shape': { key: 'shape', type: 'shape' },
      'material': { key: 'material', type: 'finish' }
      // Removed size mapping - sizes should not be swappable
    };

    // For material, check if item has 'finish' key instead of 'material'
    // For shape, check if item has 'cut' key instead of 'shape'
    let mapping = optionMapping[optionType];
    if (optionType === 'material' && item.customization.selections?.finish && !item.customization.selections?.material) {
      mapping = { key: 'finish', type: 'finish' };
    }
    if (optionType === 'shape') {
      // Always use the existing key that the item has, or default to 'shape'
      if (item.customization.selections?.cut) {
        mapping = { key: 'cut', type: 'shape' };
      } else {
        mapping = { key: 'shape', type: 'shape' };
      }
    }
    
    if (!mapping) return;

    const updatedItem = {
      ...item,
      customization: {
        ...item.customization,
        selections: {
          ...item.customization.selections,
          [mapping.key]: {
            type: mapping.type as any,
            value: newValue,
            displayValue: newValue,
            priceImpact: 0
          }
        }
      }
    };

    // Recalculate pricing
    const pricing = calculateItemPricing(updatedItem, updatedItem.quantity, pricingData);
    updatedItem.unitPrice = pricing.perSticker;
    updatedItem.totalPrice = pricing.total;

    // Update local state
    setUpdatedCart(prevCart => 
      prevCart.map(cartItem => 
        cartItem.id === itemId ? updatedItem : cartItem
      )
    );

    // Update persistent cart
    updateCartItemCustomization(itemId, updatedItem);
    
    // Close dropdown
    setActiveDropdown(null);
  };

  // Handle custom size update
  const handleCustomSizeUpdate = (itemId: string) => {
    const item = updatedCart.find(item => item.id === itemId);
    const inputs = customSizeInputs[itemId];
    
    if (!item || !inputs || !inputs.width || !inputs.height) return;

    const customValue = `${inputs.width}"x${inputs.height}"`;
    const customDisplayValue = `Custom (${inputs.width}" × ${inputs.height}")`;

    const updatedItem = {
      ...item,
      customization: {
        ...item.customization,
        selections: {
          ...item.customization.selections,
          'size-preset': {
            type: 'size-preset' as any,
            value: customValue,
            displayValue: customDisplayValue,
            priceImpact: 0
          }
        }
      }
    };

    // Recalculate pricing with custom dimensions
    const pricing = calculateItemPricing(updatedItem, updatedItem.quantity, pricingData);
    updatedItem.unitPrice = pricing.perSticker;
    updatedItem.totalPrice = pricing.total;

    // Update local state
    setUpdatedCart(prevCart => 
      prevCart.map(cartItem => 
        cartItem.id === itemId ? updatedItem : cartItem
      )
    );

    // Update persistent cart
    updateCartItemCustomization(itemId, updatedItem);
    
    // Clear custom inputs and close dropdown
    setCustomSizeInputs(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setActiveDropdown(null);
  };

  // Get available options for option type
  const getAvailableOptions = (optionType: string): string[] => {
    switch (optionType) {
      case 'shape':
        return SHAPE_OPTIONS;
      case 'material':
        return MATERIAL_OPTIONS;
      // Removed size case - sizes should not be swappable
      default:
        return [];
    }
  };

  // Toggle dropdown
  const toggleDropdown = (itemId: string, optionType: string, buttonElement?: HTMLButtonElement) => {
    if (activeDropdown?.itemId === itemId && activeDropdown?.type === optionType) {
      setActiveDropdown(null);
      setDropdownPosition(null);
    } else {
      setActiveDropdown({ itemId, type: optionType });
      
      // Calculate position for portal dropdown using the passed button element or fallback to ref
      const button = buttonElement || dropdownRefs.current[`${itemId}-${optionType}`];
      if (button) {
        const rect = button.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: Math.max(200, rect.width)
        });
      }
    }
  };

  // Handle notes change
  const handleNotesChange = (itemId: string, notes: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: notes
    }));
    
    // Update cart item
    const item = updatedCart.find(item => item.id === itemId);
    if (item) {
      const updatedItem = {
        ...item,
        customization: {
          ...item.customization,
          notes: notes
        }
      };
      
      setUpdatedCart(prevCart => 
        prevCart.map(cartItem => 
          cartItem.id === itemId ? updatedItem : cartItem
        )
      );
      
      updateCartItemCustomization(itemId, updatedItem);
    }
  };

  // Handle Instagram opt-in toggle
  const handleInstagramOptIn = (itemId: string, optIn: boolean) => {
    setInstagramOptIn(prev => ({
      ...prev,
      [itemId]: optIn
    }));
    
    // Update cart item
    const item = updatedCart.find(item => item.id === itemId);
    if (item) {
      const updatedItem = {
        ...item,
        customization: {
          ...item.customization,
          instagramOptIn: optIn
        }
      };
      
      setUpdatedCart(prevCart => 
        prevCart.map(cartItem => 
          cartItem.id === itemId ? updatedItem : cartItem
        )
      );
      
      updateCartItemCustomization(itemId, updatedItem);
    }
  };

  // Handle rush order toggle
  const handleRushOrderToggle = (itemId: string, rushOrder: boolean) => {
    const item = updatedCart.find(item => item.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      customization: {
        ...item.customization,
        selections: {
          ...item.customization.selections,
          rush: {
            type: "finish" as const,
            value: rushOrder,
            displayValue: rushOrder ? "Rush Order" : "Standard",
            priceImpact: rushOrder ? 0.4 : 0 // 40% increase
          }
        }
      }
    };

    // Recalculate pricing
    const pricing = calculateItemPricing(updatedItem, updatedItem.quantity, pricingData);
    updatedItem.unitPrice = pricing.perSticker;
    updatedItem.totalPrice = pricing.total;

    // Update local state
    setUpdatedCart(prevCart => 
      prevCart.map(cartItem => 
        cartItem.id === itemId ? updatedItem : cartItem
      )
    );

    // Update persistent cart
    updateCartItemCustomization(itemId, updatedItem);
  };

  // Calculate cart totals
  const subtotal = updatedCart.reduce((sum, item) => {
    const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
    return sum + itemTotal;
  }, 0);

  // Calculate rush order breakdown
  const rushOrderBreakdown = updatedCart.reduce((acc, item) => {
    if (item.customization.selections?.rush?.value === true) {
      // Calculate what the price would be without rush
      const basePrice = item.totalPrice / 1.4; // Remove 40% markup
      const rushCost = item.totalPrice - basePrice;
      acc.totalRushCost += rushCost;
      acc.baseSubtotal += basePrice;
      acc.hasRushItems = true;
    } else {
      acc.baseSubtotal += item.totalPrice;
    }
    return acc;
  }, { totalRushCost: 0, baseSubtotal: 0, hasRushItems: false });

  const totalQuantity = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
  const hasRushOrder = updatedCart.some(item => item.customization.selections?.rush?.value === true);
  const deliveryInfo = calculateDeliveryDate(totalQuantity, hasRushOrder);

  // Calculate total discount saved
  const totalDiscount = updatedCart.reduce((sum, item) => {
    const pricing = calculateItemPricing(item, item.quantity, pricingData);
    if (pricing.discountPercentage > 0) {
      const fullPrice = item.quantity * 1.36; // Base price estimate
      const discountAmount = fullPrice - pricing.total;
      return sum + discountAmount;
    }
    return sum;
  }, 0);

  return (
    <Layout title="Your Cart - Sticker Shuttle">
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          


          {/* Login Recommendation - Mobile Banner */}
          {showLoginBanner && (
            <div className="mb-6 p-4 rounded-lg backdrop-blur-md md:hidden" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749075558/StickerShuttle_Alien_xfwvvh.svg"
                      alt="Sticker Shuttle Alien"
                      className="w-10 h-10 transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-2">
                      It's recommended you sign in for the best experience and future orders!
                    </p>
                    <div className="flex gap-2">
                      <a
                        href="/login"
                        className="px-3 py-2 text-xs font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: 'white'
                        }}
                      >
                        Login
                      </a>
                      <a
                        href="/signup"
                        className="px-3 py-2 text-xs font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                          color: '#030140',
                          border: 'none'
                        }}
                      >
                        Sign Up
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowLoginBanner(false)}
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors text-xs backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Login Recommendation - Desktop Popup */}
          {showLoginBanner && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden md:flex items-center justify-center">
              <div className="max-w-md mx-4 p-6 rounded-lg backdrop-blur-md" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}>
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <img
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749075558/StickerShuttle_Alien_xfwvvh.svg"
                      alt="Sticker Shuttle Alien"
                      className="w-16 h-16 transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sign in for the best experience!</h3>
                  <p className="text-white/80 mb-6">
                    Get access to order history, faster checkout, and exclusive deals.
                  </p>
                  <div className="flex gap-3 justify-center mb-4">
                    <a
                      href="/login"
                      className="px-4 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: 'white'
                      }}
                    >
                      Login
                    </a>
                    <a
                      href="/signup"
                      className="px-4 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                        color: '#030140',
                        border: 'none'
                      }}
                    >
                      Sign Up
                    </a>
                  </div>
                  <button
                    onClick={() => setShowLoginBanner(false)}
                    className="text-white/60 hover:text-white transition-colors text-sm underline"
                  >
                    Continue without signing in
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-white">Your Cart</h1>
            <Link 
              href="/products/vinyl-stickers"
              className="px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-lg text-purple-200 hover:bg-purple-500/30 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              ➕ Add More Designs
            </Link>
          </div>
          
          {updatedCart.length === 0 ? (
            <>
              <div className="container-style p-6 text-center text-gray-300">
                Your cart is empty.<br />
                <Link href="/products" className="text-purple-400 hover:text-purple-300 underline transition-colors">
                  Continue Shopping
                </Link>
              </div>

              {/* Product Types Section - Same as Homepage */}
              <div className="mt-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Start with one of our popular products</h2>
                  <p className="text-gray-300">Choose from our premium sticker and banner options</p>
                </div>

                {/* Desktop/Tablet Grid */}
                <div className="hidden md:grid md:grid-cols-5 gap-4 group/container">
                  {/* Vinyl Stickers */}
                  <Link href="/products/vinyl-stickers">
                    <div 
                      className="vinyl-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-500 ease-out">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                          alt="Vinyl Stickers" 
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Stickers →</h3>
                      
                      {/* Hover to show features on desktop */}
                      <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                        <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">💧 Waterproof & UV Resistant</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🛡️ Laminated with 7 yr protection</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🎯 Premium Vinyl Material</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🏠 Dishwasher Safe</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">✂️ Custom Shapes Available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Holographic Stickers */}
                  <Link href="/products/holographic-stickers">
                    <div 
                      className="holographic-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-500 ease-out">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                          alt="Holographic Stickers" 
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.35)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.21))'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Holographic Stickers →</h3>
                      
                      {/* Hover to show features on desktop */}
                      <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                        <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌈 Rainbow Holographic Effect</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🛡️ Laminated with 7 yr protection</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">✨ Holographic Vinyl Material</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">💎 Light-Reflecting Surface</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">👁️ Eye-Catching Design</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Chrome Stickers */}
                  <Link href="/products/chrome-stickers">
                    <div 
                      className="chrome-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-2 transition-transform duration-500 ease-out">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                          alt="Chrome Stickers" 
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Chrome Stickers →</h3>
                      
                      {/* Hover to show features on desktop */}
                      <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                        <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🪞 Mirror Chrome Finish</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🛡️ Laminated with 7 yr protection</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🔩 Metallic Polyester Film</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">✨ High-Gloss Surface</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🚗 Automotive Grade</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Glitter Stickers */}
                  <Link href="/products/glitter-stickers">
                    <div 
                      className="glitter-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                          alt="Glitter Stickers" 
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.35)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.21))'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Glitter Stickers →</h3>
                      
                      {/* Hover to show features on desktop */}
                      <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                        <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">✨ Sparkly Glitter Finish</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🛡️ Laminated with 7 yr protection</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">💫 Specialty Glitter Vinyl</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🎨 Textured Surface</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🌈 Multiple Colors Available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Vinyl Banners */}
                  <Link href="/products/vinyl-banners">
                    <div 
                      className="banner-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                          alt="Vinyl Banners" 
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 12px rgba(196, 181, 253, 0.35)) drop-shadow(0 0 24px rgba(196, 181, 253, 0.21))'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Banners →</h3>
                      
                      {/* Hover to show features on desktop */}
                      <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                        <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">💪 Heavy Duty 13oz Vinyl</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🛡️ Laminated with 7 yr protection</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🔗 Hemmed & Grommeted</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌦️ UV & Weather Resistant</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">📏 Custom Sizes Available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Mobile Scrollable Cards */}
                <div className="md:hidden overflow-x-auto pb-4">
                  <div className="flex space-x-4 w-max">
                    {/* Vinyl Stickers Mobile */}
                    <Link href="/products/vinyl-stickers">
                      <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                            alt="Vinyl Stickers" 
                            className="w-full h-full object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-white">Vinyl<br/>Stickers →</h3>
                      </div>
                    </Link>

                    {/* Holographic Stickers Mobile */}
                    <Link href="/products/holographic-stickers">
                      <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                            alt="Holographic Stickers" 
                            className="w-full h-full object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.3))'
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-white">Holographic<br/>Stickers →</h3>
                      </div>
                    </Link>

                    {/* Chrome Stickers Mobile */}
                    <Link href="/products/chrome-stickers">
                      <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                            alt="Chrome Stickers" 
                            className="w-full h-full object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-white">Chrome<br/>Stickers →</h3>
                      </div>
                    </Link>

                    {/* Glitter Stickers Mobile */}
                    <Link href="/products/glitter-stickers">
                      <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                            alt="Glitter Stickers" 
                            className="w-full h-full object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.3))'
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-white">Glitter<br/>Stickers →</h3>
                      </div>
                    </Link>

                    {/* Vinyl Banners Mobile */}
                    <Link href="/products/vinyl-banners">
                      <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                            alt="Vinyl Banners" 
                            className="w-full h-full object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 12px rgba(196, 181, 253, 0.5)) drop-shadow(0 0 24px rgba(196, 181, 253, 0.3))'
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-white">Vinyl<br/>Banners →</h3>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6">
                             {updatedCart.map((item) => {
                 const nextTierSavings = calculateNextTierSavings(item, item.quantity, pricingData);
                 
                 return (
                   <div key={item.id} className="container-style p-6">
                     <div className="flex flex-col md:flex-row gap-6">
                       {/* Product Image */}
                       <div className="w-full md:w-1/4">
                         {item.customization.customFiles?.[0] ? (
                           <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-white/15 bg-white/5 p-3">
                             <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5 text-white/50">
                               {/* Fallback content always present */}
                               <span className="text-sm font-medium">Preview</span>
                             </div>
                             {/* Image with padding so entire image is visible */}
                             <img
                               src={item.customization.customFiles[0]}
                               alt={item.product.name}
                               className="relative z-10 w-full h-full object-contain transition-opacity duration-300"
                               onError={(e) => {
                                 // Hide just the img on error, leaving the fallback visible
                                 const target = e.target as HTMLImageElement;
                                 target.style.display = 'none';
                               }}
                             />
                           </div>
                         ) : (
                           <div className="aspect-square rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/15 flex items-center justify-center text-white/50">
                             <div className="text-center">
                               <div className="text-2xl mb-2">📁</div>
                               <span className="text-sm font-medium">No image uploaded</span>
                             </div>
                           </div>
                         )}
                       </div>

                       {/* Product Details */}
                       <div className="flex-1">
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <div className="flex items-center gap-3 mb-1">
                               {item.product.name.toLowerCase().includes('vinyl') && (
                                 <img 
                                   src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                                   alt="Vinyl Stickers Icon" 
                                   className="w-8 h-8 object-contain"
                                 />
                               )}
                               <h3 className="text-xl font-bold text-white">{item.product.name}</h3>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => toggleWishlist(item.id)}
                               className={`p-2 rounded-lg transition-colors ${
                                 wishlistItems.includes(item.id)
                                   ? 'text-red-400 hover:text-red-300 bg-red-500/20'
                                   : 'text-gray-400 hover:text-red-400 hover:bg-red-500/20'
                               }`}
                               title="Add to wishlist"
                             >
                               {wishlistItems.includes(item.id) ? '❤️' : '🤍'}
                             </button>
                             <button 
                               onClick={() => removeFromCart(item.id)} 
                               className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-lg transition-colors"
                             >
                               🗑️ Remove
                             </button>
                           </div>
                         </div>

                         {/* Proof Status - Simple Line */}
                         {(item.customization.selections?.proof?.value === true || item.customization.selections?.proof?.value === false) && (
                           <div className="mb-4">
                             <p className="text-white/70 text-sm">
                               📋 {item.customization.selections?.proof?.value === true 
                                 ? (
                                   <>
                                     Proof requested - expect within 4 hours{" "}
                                     <button
                                       onClick={() => handleProofChange(item.id, false)}
                                       className="text-blue-400 hover:text-blue-300 underline text-sm transition-colors"
                                     >
                                       Don't send proof
                                     </button>
                                   </>
                                 )
                                 : (
                                   <>
                                     No proof requested{" "}
                                     <button
                                       onClick={() => handleProofChange(item.id, true)}
                                       className="text-blue-400 hover:text-blue-300 underline text-sm transition-colors"
                                     >
                                       Send proof
                                     </button>
                                   </>
                                 )
                               }
                             </p>
                           </div>
                         )}

                         {/* Configuration Pills */}
                         <div className="space-y-4">
                           <div className="space-y-2">
                             {/* Show configuration options with swap functionality */}
                             {Object.entries(item.customization.selections || {})
                               .filter(([key, sel]) => {
                                 if (!sel) return false;
                                 // Skip proof and rush selections here - they'll be handled separately
                                 if (key === 'proof' || key === 'rush') return false;
                                 // Skip duplicate size entries - prefer 'size-preset' over 'size'
                                 if (key === 'size' && item.customization.selections?.['size-preset']) return false;
                                 return true;
                               })
                               .map(([key, sel]) => {
                               
                               // Map selection key to option type for dropdowns
                               const getOptionType = (selectionKey: string) => {
                                 switch (selectionKey) {
                                   case 'shape': return 'shape';
                                   case 'cut': return 'shape'; // Handle cut as shape (from calculators)
                                   case 'material': return 'material';
                                   case 'finish': return 'material'; // Handle finish as material
                                   // Remove size swapping - sizes should not be swappable
                                   // case 'size-preset': return 'size';
                                   // case 'size': return 'size'; // Handle both size keys
                                   default: return null;
                                 }
                               };
                               
                               const optionType = getOptionType(key);
                               const canSwap = optionType !== null;
                               const isDropdownOpen = activeDropdown?.itemId === item.id && activeDropdown?.type === optionType;
                               
                               return (
                                 <div key={key} className="relative">
                                   <div className="flex items-center gap-2">
                                     <label className="text-white font-medium text-sm min-w-[70px] flex items-center gap-1">
                                       <span>{getOptionEmoji(sel.type || '', sel.value)}</span>
                                       {formatOptionName(sel.type || '')}:
                                     </label>
                                     <div className="relative">
                                       <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm flex items-center gap-2">
                                         <span className="text-white">{typeof sel.displayValue === 'string' ? sel.displayValue : 'N/A'}</span>
                                         {canSwap && (
                                           <button
                                             ref={(el) => {
                                               dropdownRefs.current[`${item.id}-${optionType!}`] = el;
                                             }}
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               toggleDropdown(item.id, optionType!, e.currentTarget);
                                             }}
                                             className="text-white/50 hover:text-white transition-colors"
                                             title={`Change ${formatOptionName(sel.type || '').toLowerCase()}`}
                                           >
                                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                               <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                             </svg>
                                           </button>
                                         )}
                                       </div>

                                     </div>
                                   </div>
                                 </div>
                               );
                             })}
                             
                             {/* Rush Order pill */}
                             {item.customization.selections?.rush?.value === true && (
                               <div className="flex items-center gap-2">
                                 <label className="text-white font-medium text-sm min-w-[70px] flex items-center gap-1">
                                   <span>🚀</span>
                                   Rush:
                                 </label>
                                 <div className="px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-sm flex items-center gap-2">
                                   <span className="text-red-200 font-medium">+40%</span>
                                   <button
                                     onClick={() => handleRushOrderToggle(item.id, false)}
                                     className="w-4 h-4 rounded-full flex items-center justify-center text-red-200/80 hover:text-red-200 transition-colors text-xs"
                                     title="Remove rush order"
                                   >
                                     ✕
                                   </button>
                                 </div>
                               </div>
                             )}
                           </div>

                           {/* Divider */}
                           <hr className="border-white/20" />

                           {/* Quantity Control */}
                           <div className="space-y-2">
                             {/* Quantity Label - Mobile Only */}
                             <label htmlFor={`quantity-${item.id}`} className="block sm:hidden text-white font-medium text-sm text-center">Quantity:</label>
                             
                             <div className="flex items-center justify-center sm:justify-start gap-2">
                               {/* Desktop Label */}
                               <label htmlFor={`quantity-${item.id}`} className="hidden sm:block text-white font-medium text-sm">Quantity:</label>
                               
                               <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                                 <button
                                   onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                   className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors text-lg"
                                   disabled={item.quantity <= 1}
                                   aria-label="Decrease quantity"
                                 >
                                   −
                                 </button>
                                 <input
                                   id={`quantity-${item.id}`}
                                   type="number"
                                   min="1"
                                   value={item.quantity}
                                   onChange={(e) => {
                                     const newQty = parseInt(e.target.value) || 1;
                                     handleQuantityChange(item.id, newQty);
                                   }}
                                   className="w-20 text-center bg-transparent text-white text-base font-medium no-spinner"
                                   aria-label={`Quantity for ${item.product.name}`}
                                 />
                                 <button
                                   onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                   className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors text-lg"
                                   aria-label="Increase quantity"
                                 >
                                   +
                                 </button>
                               </div>
                               
                               {/* Discount Percentage - Next to Quantity on Desktop */}
                               {(() => {
                                 const pricing = calculateItemPricing(item, item.quantity, pricingData);
                                 if (pricing.discountPercentage > 0) {
                                   return (
                                     <span className="hidden sm:inline text-green-300 text-sm font-medium">
                                       {pricing.discountPercentage}% off
                                     </span>
                                   );
                                 }
                                 return null;
                               })()}
                             </div>
                             
                             {/* Discount Percentage - Under Quantity on Mobile */}
                             {(() => {
                               const pricing = calculateItemPricing(item, item.quantity, pricingData);
                               if (pricing.discountPercentage > 0) {
                                 return (
                                   <div className="flex justify-center sm:hidden">
                                     <div className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-400/30 text-sm">
                                       <span className="text-green-200 font-medium">
                                         {pricing.discountPercentage}% off
                                       </span>
                                     </div>
                                   </div>
                                 );
                               }
                               return null;
                             })()}
                           </div>

                           {/* Quantity Discount Visualizer - Under Quantity Pill */}
                           {nextTierSavings && nextTierSavings.totalSavings > 0 && (() => {
                             const currentPricing = calculateItemPricing(item, item.quantity, pricingData);
                             return (
                               <div className="px-3 py-2 bg-yellow-400/20 border border-yellow-400/30 rounded-lg text-sm">
                                 <div className="flex items-center gap-2">
                                   <span className="text-yellow-300">💰</span>
                                   <span className="text-yellow-200 font-medium">
                                     Add {nextTierSavings.additionalQuantity} more for {nextTierSavings.nextTierDiscount}% off your order - up from {currentPricing.discountPercentage}%
                                   </span>
                                 </div>
                               </div>
                             );
                           })()}

                           {/* Divider */}
                           <hr className="border-white/20" />

                           {/* Additional Notes */}
                           <div className="space-y-3">
                             <div>
                               <label className="text-white font-medium text-sm mb-2 block">📝 Additional Notes:</label>
                               <textarea
                                 value={itemNotes[item.id] || item.customization.notes || ''}
                                 onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                 placeholder="Any special instructions or requests..."
                                 className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 resize-none"
                                 rows={2}
                               />
                             </div>

                             {/* Instagram Opt-in */}
                             {(instagramOptIn[item.id] || item.customization.instagramOptIn) && (
                               <div className="p-3 bg-pink-500/20 border border-pink-400/30 rounded-lg">
                                 <div className="flex items-start justify-between gap-3">
                                   <div className="flex-1">
                                     <p className="text-pink-200 text-sm font-medium mb-1">📸 Instagram Content Permission</p>
                                     <p className="text-pink-200/80 text-xs">
                                       You have opted-in to let us post the making of your stickers as content. We are allowed to tag you at anytime.
                                     </p>
                                   </div>
                                   <button
                                     onClick={() => handleInstagramOptIn(item.id, false)}
                                     className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-pink-200/80 hover:text-pink-200 transition-colors text-xs"
                                     title="Remove Instagram opt-in"
                                   >
                                     ✕
                                   </button>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}



               {/* Two Column Bottom Section */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Left Column: Delivery Only */}
                 <div className="space-y-6">
                   {/* Free Shipping Banner - Small */}
                   <div className="p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                     <div className="flex items-center justify-center gap-2 text-sm">
                       <span className="text-green-300">🚚</span>
                       <span className="text-green-200 font-medium">
                         {totalQuantity >= 1000 
                           ? "FREE Next Day Air Shipping! ⚡" 
                           : "FREE Standard Shipping!"}
                       </span>
                     </div>
                   </div>

                   {/* Delivery Information */}
                   <div className="container-style p-4">
                     <div className="flex items-center gap-2 mb-3">
                       <span className="text-blue-400">📦</span>
                       <h4 className="text-base font-medium text-white">Estimated Delivery</h4>
                     </div>
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-white/80">Processing</span>
                         <span className="text-white">
                           {deliveryInfo.isHighVolume 
                             ? '3-4 days' 
                             : `${deliveryInfo.productionDays} day${deliveryInfo.productionDays > 1 ? 's' : ''}`}
                           {deliveryInfo.isExpedited && ' ⚡'}
                           {deliveryInfo.isHighVolume && ' 📈'}
                         </span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span className="text-white/80">Shipping</span>
                         <span className="text-white">
                           {deliveryInfo.shippingDays} day{deliveryInfo.shippingDays > 1 ? 's' : ''}
                           {deliveryInfo.isExpedited && ' (Next Day Air)'}
                         </span>
                       </div>
                       <hr className="border-white/20" />
                       <div className="flex justify-between text-sm font-medium">
                         <span className="text-green-200">Delivery by</span>
                         <span className="text-green-200">
                           {deliveryInfo.deliveryDate.toLocaleDateString('en-US', { 
                             weekday: 'short', 
                             month: 'short', 
                             day: 'numeric' 
                           })}
                         </span>
                       </div>
                       <p className="text-xs text-white/60 mt-2">
                         * UPS does not deliver on weekends. Weekend delivery dates are automatically moved to the next business day.
                       </p>
                     </div>
                   </div>
                 </div>

                 {/* Right Column: Order Summary & Checkout */}
                 <div className="space-y-6">
                   <div className="container-style p-6">
                     <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                     <div className="space-y-2 mb-6">
                       {rushOrderBreakdown.hasRushItems ? (
                         <>
                           <div className="flex justify-between text-white/80">
                             <span>Base Subtotal ({totalQuantity} stickers)</span>
                             <span>${rushOrderBreakdown.baseSubtotal.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-red-300">
                             <span>Rush Order (+40%)</span>
                             <span>+${rushOrderBreakdown.totalRushCost.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-white/80">
                             <span>Subtotal with Rush</span>
                             <span>${subtotal.toFixed(2)}</span>
                           </div>
                         </>
                       ) : (
                         <div className="flex justify-between text-white/80">
                           <span>Subtotal ({totalQuantity} stickers)</span>
                           <span>${subtotal.toFixed(2)}</span>
                         </div>
                       )}
                       <div className="flex justify-between text-blue-300">
                         <span>You're paying</span>
                         <span>${(subtotal / totalQuantity).toFixed(2)} per sticker</span>
                       </div>
                       <div className="flex justify-between text-green-300">
                         <span>Shipping</span>
                         <span>FREE {totalQuantity >= 1000 ? '(Next Day Air)' : ''}</span>
                       </div>
                       <hr className="border-white/20" />
                       <div className="flex justify-between text-lg font-bold text-white">
                         <span>Total</span>
                         <span>${subtotal.toFixed(2)}</span>
                       </div>
                     </div>

                     {/* Checkout Actions */}
                     <div className="space-y-3">
                       {/* Enhanced Checkout Button - NEW Phase 2 Implementation */}
                       <CartCheckoutButton
                         cartItems={updatedCart}
                         className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-lg checkout-button-yellow"
                         onCheckoutStart={() => {
                           console.log('🚀 Starting enhanced cart checkout with user context:', updatedCart.length, 'items');
                         }}
                         onCheckoutSuccess={() => {
                           console.log('✅ Enhanced checkout successful - clearing cart and redirecting to dashboard');
                           clearCart();
                           
                           // Show immediate success feedback
                           const successMessage = document.createElement('div');
                           successMessage.innerHTML = `
                             <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 10000; max-width: 300px;">
                               <div style="font-weight: bold; margin-bottom: 4px;">🎉 Order Complete!</div>
                               <div style="font-size: 14px; opacity: 0.9;">Redirecting to your dashboard...</div>
                             </div>
                           `;
                           document.body.appendChild(successMessage);
                           
                           setTimeout(() => {
                             document.body.removeChild(successMessage);
                           }, 5000);
                         }}
                         onCheckoutError={(error) => {
                           console.error('❌ Enhanced checkout error:', error);
                           
                           // Show user-friendly error message
                           const errorMessage = document.createElement('div');
                           errorMessage.innerHTML = `
                             <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #ef4444, #f87171); color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 10000; max-width: 300px;">
                               <div style="font-weight: bold; margin-bottom: 4px;">❌ Checkout Error</div>
                               <div style="font-size: 14px; opacity: 0.9;">${error}</div>
                             </div>
                           `;
                           document.body.appendChild(errorMessage);
                           
                           setTimeout(() => {
                             document.body.removeChild(errorMessage);
                           }, 7000);
                         }}
                       >
                         💳 Go to Checkout
                       </CartCheckoutButton>
                       

                       
                       <button 
                         onClick={clearCart} 
                         className="w-full px-4 py-2 rounded-lg text-white/90 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                         style={{
                           background: 'rgba(255, 255, 255, 0.1)',
                           border: '1px solid rgba(255, 255, 255, 0.2)'
                         }}
                       >
                         🗑️ Clear Cart
                       </button>
                     </div>
                   </div>

                   {/* Social Proof - Moved Under Order Summary */}
                   <div className="container-style p-4">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                       <div className="flex items-center gap-2">
                         <span className="text-orange-400">🔥</span>
                         <span className="text-orange-200">3 customers ordered this in the last hour</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-yellow-400">⭐</span>
                         <span className="text-yellow-200">4.9/5 from 1,200+ reviews</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
              
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        .checkout-button-yellow {
          background: linear-gradient(135deg, #ffd713, #ffed4e) !important;
          color: #030140 !important;
          border: none !important;
        }
        
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .no-spinner[type=number] {
          -moz-appearance: textfield;
        }

        /* Sticker type hover glow effects */
        .vinyl-hover:hover {
          border-color: rgba(168, 242, 106, 0.8) !important;
          box-shadow: 0 0 20px rgba(168, 242, 106, 0.4), 0 0 40px rgba(168, 242, 106, 0.2) !important;
        }
        
        .vinyl-hover:hover h3 {
          color: rgb(168, 242, 106) !important;
        }
        
        .holographic-hover:hover {
          border-color: rgba(168, 85, 247, 0.8) !important;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2) !important;
        }
        
        .holographic-hover:hover h3 {
          color: rgb(168, 85, 247) !important;
        }
        
        .chrome-hover:hover {
          border-color: rgba(220, 220, 220, 0.8) !important;
          box-shadow: 0 0 20px rgba(220, 220, 220, 0.4), 0 0 40px rgba(180, 180, 180, 0.2) !important;
        }
        
        .chrome-hover:hover h3 {
          background: linear-gradient(45deg, #dcdcdc, #ffffff, #c0c0c0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .glitter-hover:hover {
          border-color: rgba(59, 130, 246, 0.8) !important;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2) !important;
        }
        
        .glitter-hover:hover h3 {
          color: rgb(59, 130, 246) !important;
        }
        
        .banner-hover:hover {
          border-color: rgba(196, 181, 253, 0.8) !important;
          box-shadow: 0 0 20px rgba(196, 181, 253, 0.4), 0 0 40px rgba(196, 181, 253, 0.2) !important;
        }
        
        .banner-hover:hover h3 {
          color: rgb(196, 181, 253) !important;
        }
      `}</style>

      {/* Portal-based Dropdown */}
      {activeDropdown && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="dropdown-container fixed z-[9999] bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-lg"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: '200px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 space-y-1">
            {getAvailableOptions(activeDropdown.type).map((option) => {
              const currentItem = updatedCart.find(item => item.id === activeDropdown.itemId);
              const currentSelection = currentItem?.customization.selections?.[
                activeDropdown.type === 'shape' ? 'shape' :
                activeDropdown.type === 'material' ? 'material' :
                'size-preset'
              ];
              
              return (
                <button
                  key={option}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionChange(activeDropdown.itemId, activeDropdown.type, option);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    option === currentSelection?.displayValue
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {option}
                </button>
              );
            })}
            
            {/* Custom Size Inputs */}
            {activeDropdown.type === 'size' && customSizeInputs[activeDropdown.itemId] && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/70 text-xs mb-2">Enter custom dimensions:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="W"
                    value={customSizeInputs[activeDropdown.itemId]?.width || ''}
                    onChange={(e) => setCustomSizeInputs(prev => ({
                      ...prev,
                      [activeDropdown.itemId]: {
                        ...prev[activeDropdown.itemId],
                        width: e.target.value
                      }
                    }))}
                    className="w-16 px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-white/50 text-xs">×</span>
                  <input
                    type="number"
                    placeholder="H"
                    value={customSizeInputs[activeDropdown.itemId]?.height || ''}
                    onChange={(e) => setCustomSizeInputs(prev => ({
                      ...prev,
                      [activeDropdown.itemId]: {
                        ...prev[activeDropdown.itemId],
                        height: e.target.value
                      }
                    }))}
                    className="w-16 px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-white/70 text-xs">inches</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomSizeUpdate(activeDropdown.itemId);
                    }}
                    className="px-3 py-1 text-xs rounded bg-purple-500/20 border border-purple-400/30 text-purple-200 hover:bg-purple-500/30 transition-colors"
                    disabled={!customSizeInputs[activeDropdown.itemId]?.width || !customSizeInputs[activeDropdown.itemId]?.height}
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
} 