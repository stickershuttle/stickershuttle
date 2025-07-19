import Layout from "@/components/Layout";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import CartCheckoutButton from "@/components/CartCheckoutButton";
import AIFileImage from "@/components/AIFileImage";
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
import { calculateCreditEarningsWithLimit } from "@/utils/cart-pricing";
import { getSupabase } from "@/lib/supabase";
import { createPortal } from "react-dom";
import { GET_USER_CREDIT_BALANCE } from "@/lib/credit-mutations";
import { useQuery, useMutation } from "@apollo/client";
import DiscountCodeInput from "@/components/DiscountCodeInput";
import { UPDATE_USER_PROFILE_NAMES, CREATE_USER_PROFILE, GET_USER_PROFILE } from "@/lib/profile-mutations";
import { TRACK_KLAVIYO_EVENT } from "@/lib/klaviyo-mutations";
import { CREATE_SHARED_CART } from "@/lib/admin-mutations";

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

const getItemTypeName = (productCategory: string, quantity: number): string => {
  switch (productCategory) {
    case 'vinyl-banners':
      return quantity === 1 ? 'banner' : 'banners';
    case 'vinyl-stickers':
    case 'holographic-stickers':
    case 'chrome-stickers':
    case 'glitter-stickers':
    case 'clear-stickers':
    case 'sticker-sheets':
    default:
      return quantity === 1 ? 'sticker' : 'stickers';
  }
};

// Calculate area from size string
const calculateAreaFromSize = (sizeString: string, customWidth?: string, customHeight?: string): number => {
  // Defensive check for undefined or null sizeString
  if (!sizeString) {
    console.warn('calculateAreaFromSize: sizeString is undefined, using default Medium size');
    return PRESET_SIZES.medium.sqInches; // Default to 9 sq in (3" × 3")
  }
  
  // Handle custom sizes with provided width/height parameters
  if (sizeString.includes("Custom") && customWidth && customHeight) {
    const w = parseFloat(customWidth) || 0;
    const h = parseFloat(customHeight) || 0;
    return calculateSquareInches(w, h);
  }
  
  // Handle stored custom sizes in format "1.5\"x2\"" or "1.5x2"
  if (sizeString.includes('x') && !sizeString.includes('Small') && !sizeString.includes('Medium') && !sizeString.includes('Large')) {
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*["']?\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      const w = parseFloat(match[1]) || 0;
      const h = parseFloat(match[2]) || 0;
      const area = w * h;
      // Parsed custom size
      return area;
    }
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
  // Check if this is a deal item - if so, use fixed deal pricing
  if (item.customization.isDeal && item.customization.dealPrice) {
    return {
      total: item.customization.dealPrice,
      perSticker: item.customization.dealPrice / quantity,
      discountPercentage: 0,
      area: 9 // Default area for deals
    };
  }
  
  // Check if this is a sample pack - use fixed $9 pricing
  if (item.product.name === 'Sample Pack by Sticker Shuttle') {
    return {
      total: 9.00 * quantity,
      perSticker: 9.00,
      discountPercentage: 0,
      area: 9 // Default area for sample pack
    };
  }
  
  // Check if this is an additional cost item - use fixed pricing
  if (item.product.name === 'Additional Cost') {
    return {
      total: item.totalPrice,
      perSticker: item.unitPrice,
      discountPercentage: 0,
      area: 1 // Default area for additional cost
    };
  }
  
  // For vinyl banners, use the original pricing from the calculator - don't recalculate
  if (item.product.category === 'vinyl-banners') {
    return {
      total: item.totalPrice,
      perSticker: item.unitPrice,
      discountPercentage: 0,
      area: (item.customization.additionalInfo as any)?.sqFt || 15 // Use stored square footage or default
    };
  }
  
  // Debug logging for cart item structure
  if (!item.customization?.selections?.size?.displayValue) {
    console.warn('Cart item missing size data:', {
      itemId: item.id,
      productName: item.product?.name || 'Unknown',
      selections: item.customization?.selections,
      customization: item.customization
    });
  }
  
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

  // Apply 15% price increase for specialty sticker types
  let specialtyMultiplier = 1.0;
  const productName = item.product?.name?.toLowerCase() || '';
  if (productName.includes('holographic') || productName.includes('chrome') || 
      productName.includes('glitter') || productName.includes('clear')) {
    specialtyMultiplier = 1.15;
  }

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
    
    // Apply white option modifier and specialty sticker price increase
    const adjustedTotal = realResult.totalPrice * whiteOptionMultiplier * specialtyMultiplier;
    const adjustedPerSticker = realResult.finalPricePerSticker * whiteOptionMultiplier * specialtyMultiplier;
    
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
    750: 0.24, // 76% discount (uses 500 tier from CSV)
    1000: 0.19, // 81% discount (uses 1000 tier from CSV)
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
  let productionDays = 2; // Default: 2 business days
  let shippingDays = 3; // Standard shipping (business days)
  let isHighVolume = false;
  
  // 5,000+ stickers require extended processing
  if (totalQuantity >= 5000) {
    productionDays = 4; // 3-4 business days, using 4 for calculation
    shippingDays = 3; // Standard shipping (business days)
    isHighVolume = true;
  }
  // 1,001-4,999 stickers get expedited shipping
  else if (totalQuantity >= 1001) {
    productionDays = 2;
    shippingDays = 1; // Next day air (business days)
  }
  // 1,000 stickers or less get 1 day processing
  else if (totalQuantity <= 1000) {
    productionDays = 1;
    shippingDays = 3; // Standard shipping (business days)
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
const formatOptionName = (type: string, key?: string, productCategory?: string) => {
  if (typeof type !== 'string') return "Option";
  
  // Handle special field names
  if (key === 'kissOption') return "Kiss Cut Options";
  if (key === 'whiteOption') return "White Ink";
  
  switch (type) {
    case "shape":
      return "Shape";
    case "finish":
      // For vinyl banners, show "Finishing" instead of "Material"
      return productCategory === "vinyl-banners" ? "Finishing" : "Material";
    case "size-preset":
      return "Size";
    case "white-base":
      return "White Ink";
    default:
      // Handle hyphenated names (like "size-preset")
      return type.split("-")
        .map(word => capitalize(word))
        .join(" ");
  }
};

export default function CartPage() {
  const { cart, addToCart, removeFromCart, clearCart, updateCartItemQuantity, updateCartItemCustomization } = useCart();
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
  
  // New state for store credit and discount
  const [creditToApply, setCreditToApply] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  
  // Blind shipment toggle state
  const [isBlindShipment, setIsBlindShipment] = useState(false);
  
  // Guest checkout form state
  const [guestCheckoutData, setGuestCheckoutData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // State to track when user tries to checkout without account
  const [showAccountRequiredMessage, setShowAccountRequiredMessage] = useState(false);
  
  // Share cart state
  const [isCreatingSharedCart, setIsCreatingSharedCart] = useState(false);
  const [sharedCartUrl, setSharedCartUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Additional payment state
  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState('');
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);

  // Query for user credit balance
  const { data: creditData } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  // Query for user profile to get wholesale status
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const userProfile = profileData?.getUserProfile;
  const isWholesale = userProfile?.isWholesaleCustomer || false;
  const creditRate = isWholesale ? 2.5 : 5;
  const creditRateDecimal = isWholesale ? 0.025 : 0.05;

  // Mutations for user profile
  const [updateUserProfileNames] = useMutation(UPDATE_USER_PROFILE_NAMES);
  const [createUserProfile] = useMutation(CREATE_USER_PROFILE);
  
  // Mutation for creating shared cart
  const [createSharedCart] = useMutation(CREATE_SHARED_CART, {
    onCompleted: (data) => {
      if (data.createSharedCart.success) {
        setSharedCartUrl(data.createSharedCart.shareUrl);
        setShowShareModal(true);
        // Shared cart created successfully
      } else {
        console.error('❌ Error creating shared cart:', data.createSharedCart.error);
      }
      setIsCreatingSharedCart(false);
    },
    onError: (error) => {
      console.error('❌ GraphQL error creating shared cart:', error);
      setIsCreatingSharedCart(false);
    }
  });

  const userCredits = creditData?.getUserCreditBalance?.balance || 0;

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
        // Hide account required message if user is logged in
        if (session?.user) {
          setShowAccountRequiredMessage(false);
        }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    checkUser();
  }, []);

  // Clean up session storage on component mount
  useEffect(() => {
    // Clean up any leftover session storage from previous sessions
    const fromStripe = sessionStorage.getItem('stripe_checkout_initiated');
    if (fromStripe) {
      sessionStorage.removeItem('stripe_checkout_initiated');
      sessionStorage.removeItem('pre_checkout_credit_state');
    }
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

  // Helper function to get quantity increment
  const getQuantityIncrement = (currentQuantity: number, item?: CartItem): number => {
    // Sample packs should increment by 1
    if (item && item.product.name === 'Sample Pack by Sticker Shuttle') {
      return 1;
    }
    // Regular products increment by 50 or 250
    return currentQuantity < 750 ? 50 : 250;
  };

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

  // Handle login
  const handleLogin = async () => {
    if (!loginData.email.trim() || !loginData.password.trim()) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        alert(`Login failed: ${error.message}`);
        return;
      }

      if (data.user) {
        setUser(data.user);
        setShowLoginModal(false);
        setLoginData({ email: '', password: '' });
        // User is already on cart page, no need to redirect
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Calculate cart totals - exclude additional cost items from subtotal
  const subtotal = updatedCart.reduce((sum, item) => {
    // Skip additional cost items - they should be added after discounts
    if (item.product.name === 'Additional Cost') {
      return sum;
    }
    const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
    return sum + itemTotal;
  }, 0);

  // Calculate additional payment total separately
  const additionalPaymentTotal = updatedCart.reduce((sum, item) => {
    if (item.product.name === 'Additional Cost') {
      const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
      return sum + itemTotal;
    }
    return sum;
  }, 0);

  // Check if cart contains reorder items and calculate discount only for reordered items (excluding additional costs)
  const hasReorderItems = updatedCart.some(item => item.customization.isReorder && item.product.name !== 'Additional Cost');
  const reorderItemsSubtotal = updatedCart.reduce((sum, item) => {
    if (item.customization.isReorder && item.product.name !== 'Additional Cost') {
      const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
      return sum + itemTotal;
    }
    return sum;
  }, 0);
  const reorderDiscount = hasReorderItems ? reorderItemsSubtotal * 0.1 : 0; // 10% discount only on reordered items
  
  // Calculate discount amount
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  
  // Helper function to safely parse numbers and handle NaN
  const safeParseFloat = (value: any, fallback = 0): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Handle creating a shared cart
  const handleCreateSharedCart = async () => {
    // Use cart context directly to ensure we get the most up-to-date data including additional payments
    const cartToShare = cart.length > 0 ? cart : updatedCart;
    
    if (cartToShare.length === 0) {
      console.error('❌ Cannot share empty cart');
      return;
    }

    // Ensure we include any pricing updates for the shared cart
    const cartWithUpdatedPricing = cartToShare.map(item => {
      const pricing = calculateItemPricing(item, item.quantity, pricingData);
      return {
        ...item,
        unitPrice: pricing.perSticker,
        totalPrice: pricing.total
      };
    });

    console.log('🔗 Creating shared cart with items:', cartWithUpdatedPricing.map(item => ({ 
      name: item.product.name, 
      totalPrice: item.totalPrice,
      isAdditionalCost: item.product.name === 'Additional Cost' 
    })));

    setIsCreatingSharedCart(true);
    
    try {
      await createSharedCart({
        variables: {
          input: {
            cartData: JSON.stringify(cartWithUpdatedPricing)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error creating shared cart:', error);
      setIsCreatingSharedCart(false);
    }
  };

  // Handle copying share URL
  const handleCopyShareUrl = async () => {
    if (sharedCartUrl) {
      try {
        await navigator.clipboard.writeText(sharedCartUrl);
        // Share URL copied to clipboard
        
        // Show feedback to user
        const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: select the text for manual copying
        const input = document.querySelector('[data-share-url-input]') as HTMLInputElement;
        if (input) {
          input.select();
          input.setSelectionRange(0, 99999); // For mobile devices
        }
      }
    }
  };

  // Handle additional payment
  const handleAdditionalPayment = (amount: number) => {
    if (amount <= 0) return;
    
    // Remove existing additional cost item if any
    const existingAdditionalCostIndex = updatedCart.findIndex(item => item.product.name === 'Additional Cost');
    if (existingAdditionalCostIndex !== -1) {
      removeFromCart(updatedCart[existingAdditionalCostIndex].id);
    }
    
    // Create additional cost cart item
    const additionalCostItem: CartItem = {
      id: `additional-cost-${Date.now()}`,
      product: {
        id: 'additional-cost',
        sku: 'SS-ADD-001',
        name: 'Additional Cost',
        category: 'vinyl-stickers',
        basePrice: amount,
        description: 'Additional payment added to order',
        shortDescription: 'Additional payment',
        images: [],
        defaultImage: '',
        features: [],
        customizable: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
      addedAt: new Date().toISOString(),
      customization: {
        productId: 'additional-cost',
        selections: {},
        totalPrice: amount,
        customFiles: [],
        notes: '',
        isReorder: false,
        isDeal: false
      }
    };
    
    addToCart(additionalCostItem);
    
    // Reset input
    setAdditionalPaymentAmount('');
    setSelectedPercentage(null);
  };

  const handlePercentageClick = (percentage: number) => {
    setSelectedPercentage(percentage);
    const amount = (safeSubtotal * percentage) / 100;
    handleAdditionalPayment(amount);
  };

  const handleCustomAmountAdd = () => {
    const amount = parseFloat(additionalPaymentAmount);
    if (!isNaN(amount) && amount > 0) {
      handleAdditionalPayment(amount);
    }
  };

  // Calculate final total with all discounts and credits - ensure no NaN values
  const safeSubtotal = safeParseFloat(subtotal, 0);
  const safeReorderDiscount = safeParseFloat(reorderDiscount, 0);
  const safeDiscountAmount = safeParseFloat(discountAmount, 0);
  const safeCreditToApply = safeParseFloat(creditToApply, 0);
  
  // Add blind shipment fee (free for wholesale customers)
  const blindShipmentFee = isBlindShipment && !isWholesale ? 5.00 : 0;
  
  // Calculate wholesale discount (15% off for wholesale customers)
  const wholesaleDiscount = isWholesale ? safeSubtotal * 0.15 : 0;
  
  const afterDiscounts = safeSubtotal - safeReorderDiscount - safeDiscountAmount - wholesaleDiscount;
  const finalTotal = Math.max(0, afterDiscounts - safeCreditToApply + blindShipmentFee + additionalPaymentTotal);

  // Calculate rush order breakdown
  const rushOrderBreakdown = updatedCart.reduce((acc, item) => {
    if (item.customization.selections?.rush?.value === true) {
      // Calculate what the price would be without rush
      const basePrice = item.totalPrice / 1.4; // Remove 40% markup
      acc.baseSubtotal += basePrice;
      acc.hasRushItems = true;
    } else {
      acc.baseSubtotal += item.totalPrice;
    }
    return acc;
  }, { totalRushCost: 0, baseSubtotal: 0, hasRushItems: false });

  // Calculate rush fee as 40% of the base subtotal (this gives the expected user experience)
  if (rushOrderBreakdown.hasRushItems) {
    rushOrderBreakdown.totalRushCost = rushOrderBreakdown.baseSubtotal * 0.4;
  }

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
      <section className="pt-7 pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">




          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-white">Your Cart</h1>
          </div>
          
          {updatedCart.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="mb-8">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Your Cart is Empty</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                  Add some awesome stickers to your cart to get started on your next mission.
                </p>
                <Link href="/products">
                  <button 
                    className="px-8 py-3 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    + Start New Mission
                  </button>
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
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🏆 Vinyl Material</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">✨ Matte or Gloss Finish</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">💎 Rare Product</span>
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
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Products List */}
              <div className="flex-1 flex flex-col gap-6">
                {updatedCart.map((item) => {
                  const nextTierSavings = calculateNextTierSavings(item, item.quantity, pricingData);
                  
                  return (
                    <div key={item.id} className="rounded-xl p-6" style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}>
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Product Image */}
                        <div className="w-full md:w-48 flex-shrink-0 relative">
                          {item.product.name === 'Additional Cost' ? (
                            <div className="aspect-square rounded-xl overflow-hidden bg-gray-800/50 p-4 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-4xl mb-2">💰</div>
                                <div className="text-sm text-gray-300 font-medium">Additional Cost</div>
                              </div>
                            </div>
                          ) : item.customization.customFiles?.[0] || item.product.name === 'Sample Pack by Sticker Shuttle' ? (
                            <div className="aspect-square rounded-xl overflow-hidden bg-gray-800/50 p-4">
                              <AIFileImage
                                src={item.customization.customFiles?.[0] || (item.product.name === 'Sample Pack by Sticker Shuttle' ? 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png' : '')}
                                filename={item.customization.customFiles?.[0] ? 
                                  item.customization.customFiles[0].split('/').pop()?.split('?')[0] || 'design.jpg' : 
                                  'sample-pack.png'
                                }
                                alt={item.product.name}
                                className="w-full h-full object-contain"
                                size="preview"
                                showFileType={true}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square rounded-xl bg-gray-800/50 overflow-hidden">
                              <img 
                                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                alt="No file uploaded"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {/* Reorder Badge - Now outside and on top */}
                          {item.customization.isReorder && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                              RE-ORDER
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          {/* Header with Product Name and Actions */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              {/* Product Icon */}
                              {item.product.name.toLowerCase().includes('vinyl') && (
                                <img 
                                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                                  alt="Vinyl Stickers Icon" 
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              {item.product.name.toLowerCase().includes('holographic') && (
                                <img 
                                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                                  alt="Holographic Icon" 
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              {item.product.name.toLowerCase().includes('chrome') && (
                                <img 
                                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                                  alt="Chrome Icon" 
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              {item.product.name.toLowerCase().includes('glitter') && (
                                <img 
                                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                                  alt="Glitter Icon" 
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              {item.product.name === 'Additional Cost' && (
                                <span className="w-8 h-8 flex items-center justify-center text-green-400 text-xl">💰</span>
                              )}
                              <h3 className="text-xl font-bold text-white">{item.product.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => removeFromCart(item.id)} 
                                className="text-gray-400 hover:text-red-400 p-2 rounded-lg transition-colors"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>

                          {/* Proof Status */}
                          {(item.customization.selections?.proof?.value === true || item.customization.selections?.proof?.value === false) && (
                            <div className="mb-6">
                              <p className="text-gray-400 text-sm">
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

                          {/* Product Specifications */}
                          {item.product.name !== 'Additional Cost' && (
                          <div className="mb-6">
                            <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-4">Product Specifications</h4>
                            
                            <div className="space-y-3">
                              {/* Show configuration options */}
                              {Object.entries(item.customization.selections || {})
                                .filter(([key, sel]) => {
                                  if (!sel) return false;
                                  // Skip proof and rush selections here
                                  if (key === 'proof' || key === 'rush') return false;
                                  // Skip Instagram selection (it has its own dedicated section)
                                  if (key === 'instagram') return false;
                                  // Skip duplicate size entries
                                  if (key === 'size' && item.customization.selections?.['size-preset']) return false;
                                  // For deal items, only allow shape options (no material/finish)
                                  if (item.customization.isDeal && (key === 'material' || key === 'finish')) return false;
                                  return true;
                                })
                                .map(([key, sel]) => {
                                
                                const getOptionType = (selectionKey: string) => {
                                  switch (selectionKey) {
                                    case 'shape': return 'shape';
                                    case 'cut': return 'shape';
                                    case 'material': return 'material';
                                    case 'finish': return 'material';
                                    default: return null;
                                  }
                                };
                                
                                const optionType = getOptionType(key);
                                // For deal items, only allow shape swapping
                                const canSwap = optionType !== null && (!item.customization.isDeal || optionType === 'shape');
                                const isDropdownOpen = activeDropdown?.itemId === item.id && activeDropdown?.type === optionType;
                                
                                return (
                                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{getOptionEmoji(sel.type || '', sel.value)}</span>
                                      <span className="text-xs font-medium text-gray-400 uppercase">{formatOptionName(sel.type || '', key, item.product.category)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">{typeof sel.displayValue === 'string' ? sel.displayValue : 'N/A'}</span>
                                      {canSwap && (
                                        <button
                                          ref={(el) => {
                                            dropdownRefs.current[`${item.id}-${optionType!}`] = el;
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDropdown(item.id, optionType!, e.currentTarget);
                                          }}
                                          className="text-gray-400 hover:text-white transition-colors p-1"
                                          title={`Change ${formatOptionName(sel.type || '', key, item.product.category).toLowerCase()}`}
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Rush Order */}
                              {item.customization.selections?.rush?.value === true && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🚀</span>
                                    <span className="text-xs font-medium text-gray-400 uppercase">Rush Order</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-300 font-medium">+40%</span>
                                    <button
                                      onClick={() => handleRushOrderToggle(item.id, false)}
                                      className="text-red-300/60 hover:text-red-300 transition-colors text-sm"
                                      title="Remove rush order"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Sample Pack Sticker Types */}
                              {item.product.name === 'Sample Pack by Sticker Shuttle' && (
                                <div className="mt-4">
                                  <div className="text-xs font-medium text-gray-400 uppercase mb-3">Included Sticker Types</div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                                        alt="Premium Matte" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Matte</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                                        alt="Holographic" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Holo</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                                        alt="Glitter" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Glitter</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                                        alt="Clear" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Clear</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                                        alt="Chrome" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Chrome</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-lg" style={{
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}>
                                      <img 
                                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                                        alt="Premium Gloss" 
                                        className="w-6 h-6 object-contain mb-1"
                                      />
                                      <span className="text-xs text-blue-200 text-center">Gloss</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          )}

                          {/* Quantity Section */}
                          {!item.customization.isDeal && item.product.name !== 'Additional Cost' && (
                            <div className="mb-6">
                              <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-4">Quantity</h4>
                              
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const increment = getQuantityIncrement(item.quantity, item);
                                      const newQty = Math.max(1, item.quantity - increment);
                                      handleQuantityChange(item.id, newQty);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}
                                    disabled={item.quantity <= 1}
                                    aria-label="Decrease quantity"
                                  >
                                    −
                                  </button>
                                  <div 
                                    className="px-4 py-2 rounded-lg min-w-[80px] text-center"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}
                                  >
                                    <input
                                      id={`quantity-${item.id}`}
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQty = parseInt(e.target.value) || 1;
                                        handleQuantityChange(item.id, newQty);
                                      }}
                                      className="w-full text-center bg-transparent text-white text-lg font-semibold no-spinner border-none outline-none"
                                      aria-label={`Quantity for ${item.product.name}`}
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const increment = getQuantityIncrement(item.quantity, item);
                                      handleQuantityChange(item.id, item.quantity + increment);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center text-white rounded-lg transition-colors"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                      backdropFilter: 'blur(12px)'
                                    }}
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                                
                                {/* Discount Badge */}
                                {(() => {
                                  const pricing = calculateItemPricing(item, item.quantity, pricingData);
                                  if (pricing.discountPercentage > 0) {
                                    return (
                                      <span className="text-green-300 text-sm font-medium">
                                        {pricing.discountPercentage}% off
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Quantity Discount Alert - Only for non-deal items */}
                          {!item.customization.isDeal && nextTierSavings && nextTierSavings.totalSavings > 0 && (
                            <div 
                              className="mb-6 px-4 py-3 rounded-lg"
                              style={{
                                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.4) 0%, rgba(14, 165, 233, 0.25) 50%, rgba(14, 165, 233, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(14, 165, 233, 0.4)',
                                boxShadow: 'rgba(14, 165, 233, 0.075) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">💡</span>
                                <span className="text-sky-200 text-sm">
                                  Add {nextTierSavings.additionalQuantity} more for {nextTierSavings.nextTierDiscount}% off your order - up from {calculateItemPricing(item, item.quantity, pricingData).discountPercentage}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Additional Notes */}
                          <div>
                            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Additional Notes</h4>
                            <textarea
                              value={itemNotes[item.id] || item.customization.notes || ''}
                              onChange={(e) => handleNotesChange(item.id, e.target.value)}
                              placeholder="Any special instructions or requests..."
                              className="w-full px-4 py-3 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
                              rows={3}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                              }}
                            />
                          </div>

                          {/* Instagram Opt-in */}
                          {(instagramOptIn[item.id] || item.customization.instagramOptIn || item.customization.additionalInfo?.instagramHandle) && (
                            <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-pink-200 text-sm font-medium mb-1">📸 Instagram Content Permission</p>
                                  <p className="text-pink-200/80 text-xs mb-2">
                                    You have opted-in to let us post the making of your stickers as content. We are allowed to tag you at anytime.
                                  </p>
                                  {item.customization.additionalInfo?.instagramHandle && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-pink-300 text-sm font-medium">Instagram Handle:</span>
                                      <span className="text-pink-200 text-sm">@{item.customization.additionalInfo.instagramHandle}</span>
                                    </div>
                                  )}
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
                  );
                })}
              </div>

               {/* Right Column - Order Summary & Checkout */}
               <div className="w-full lg:w-[480px] lg:sticky lg:top-24 lg:self-start">
                 <div className="rounded-2xl p-6" style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                   backdropFilter: 'blur(12px)'
                 }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Order Summary</h3>
                    {updatedCart.length > 0 && (
                      <button
                        onClick={handleCreateSharedCart}
                        disabled={isCreatingSharedCart}
                        className="text-white/70 hover:text-white transition-colors"
                        title="Share this cart with others"
                      >
                        {isCreatingSharedCart ? (
                          <div className="w-5 h-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal ({totalQuantity} {(() => {
                        // Determine the most common product type in cart
                        const productTypes = updatedCart.map(item => item.product.category);
                        const bannerCount = productTypes.filter(type => type === 'vinyl-banners').length;
                        const stickerCount = productTypes.length - bannerCount;
                        
                        // If all items are banners, use banner terminology
                        if (bannerCount > 0 && stickerCount === 0) {
                          return getItemTypeName('vinyl-banners', totalQuantity);
                        }
                        // If mixed or all stickers, use sticker terminology
                        return getItemTypeName('vinyl-stickers', totalQuantity);
                      })()})</span>
                      <span>${rushOrderBreakdown.hasRushItems ? rushOrderBreakdown.baseSubtotal.toFixed(2) : subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-300">
                      <span>You're paying</span>
                      <span>${(subtotal / totalQuantity).toFixed(2)} per {(() => {
                        // Determine the most common product type in cart
                        const productTypes = updatedCart.map(item => item.product.category);
                        const bannerCount = productTypes.filter(type => type === 'vinyl-banners').length;
                        const stickerCount = productTypes.length - bannerCount;
                        
                        // If all items are banners, use banner terminology
                        if (bannerCount > 0 && stickerCount === 0) {
                          return getItemTypeName('vinyl-banners', 1);
                        }
                        // If mixed or all stickers, use sticker terminology
                        return getItemTypeName('vinyl-stickers', 1);
                      })()}</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>Shipping</span>
                      <span>FREE</span>
                    </div>
                    {rushOrderBreakdown.hasRushItems && (
                      <div className="flex justify-between text-red-300">
                        <span>Rush Order (+40%)</span>
                        <span>+${rushOrderBreakdown.totalRushCost.toFixed(2)}</span>
                      </div>
                    )}
                    {hasReorderItems && (
                      <div className="text-amber-300">
                        <div className="flex justify-between">
                          <span>Reorder Discount (10%)</span>
                          <span>-${reorderDiscount.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          (applied to reordered items only)
                        </div>
                      </div>
                    )}
                    {wholesaleDiscount > 0 && (
                      <div className="flex justify-between text-blue-300">
                        <span>Wholesale Discount (15%)</span>
                        <span>-${wholesaleDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {appliedDiscount && (
                      <div className="flex justify-between text-purple-300">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span>-${appliedDiscount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {creditToApply > 0 && (
                      <div className="flex justify-between text-yellow-300">
                        <span>Store Credit Applied</span>
                        <span>-${creditToApply.toFixed(2)}</span>
                      </div>
                    )}
                    {isBlindShipment && (
                      <div className="flex justify-between text-purple-300">
                        <span>Blind Shipment Fee</span>
                        <span>+${blindShipmentFee.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalPaymentTotal > 0 && (
                      <div className="flex justify-between text-green-300">
                        <span>Additional Payment</span>
                        <span>+${additionalPaymentTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="border-white/20 my-3" />
                    {/* Total Savings */}
                    {(reorderDiscount > 0 || discountAmount > 0 || creditToApply > 0 || wholesaleDiscount > 0) && (
                      <div className="flex justify-between text-green-400 font-semibold">
                        <span>Total Savings</span>
                        <span>-${(reorderDiscount + discountAmount + creditToApply + wholesaleDiscount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-white">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Store Credit Earnings */}
                    {(() => {
                      if (!user) return null;
                      
                      const creditEarnings = calculateCreditEarningsWithLimit(
                        finalTotal,
                        userCredits,
                        creditRateDecimal
                      );
                      
                      if (creditEarnings.isLimitReached) {
                        return (
                          <div className="flex justify-between text-red-400 text-sm font-medium mt-3 pt-3 border-t border-white/10">
                            <span className="flex items-center gap-2">
                              <span>🚫</span>
                              Credit Limit Reached
                            </span>
                            <span>$0.00</span>
                          </div>
                        );
                      }
                      
                      if (creditEarnings.isLimitExceeded) {
                        return (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex justify-between text-yellow-400 text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <i className="fas fa-coins"></i>
                                Store Credit Earned ({creditRate}%)
                              </span>
                              <span>+${creditEarnings.creditAmount.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-yellow-300 mt-1">
                              ⚠️ Capped at $100 limit (would have earned ${creditEarnings.potentialAmount.toFixed(2)})
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex justify-between text-yellow-400 text-sm font-medium mt-3 pt-3 border-t border-white/10">
                          <span className="flex items-center gap-2">
                            <i className="fas fa-coins"></i>
                            Store Credit Earned ({creditRate}%)
                          </span>
                          <span>+${creditEarnings.creditAmount.toFixed(2)}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Store Credit Section */}
                  {user && userCredits > 0 && (
                    <div 
                      className={`rounded-2xl overflow-hidden mb-4 ${appliedDiscount ? 'opacity-50 pointer-events-none' : ''}`}
                      style={{
                        background: userCredits >= 100 
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.6) 0%, rgba(248, 113, 113, 0.4) 25%, rgba(254, 202, 202, 0.25) 50%, rgba(239, 68, 68, 0.15) 75%, rgba(254, 202, 202, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(250, 204, 21, 0.6) 0%, rgba(255, 215, 0, 0.4) 25%, rgba(250, 204, 21, 0.25) 50%, rgba(255, 193, 7, 0.15) 75%, rgba(250, 204, 21, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(200%)',
                        border: userCredits >= 100 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 215, 0, 0.5)',
                        boxShadow: userCredits >= 100 
                          ? 'rgba(239, 68, 68, 0.125) 0px 4px 20px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(250, 204, 21, 0.125) 0px 4px 20px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      <div className="px-6 py-4">
                        {appliedDiscount && (
                          <div className="mb-3 p-2 rounded-lg bg-red-500/20 border border-red-400/30">
                            <p className="text-red-200 text-xs text-center">
                              🚫 Cannot use store credit with discount codes. Remove "{appliedDiscount.code}" to use store credit.
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{userCredits >= 100 ? '🚨' : '🎉'}</span>
                            <div>
                              <h3 className="text-lg font-bold text-white">
                                ${userCredits.toFixed(2)} Store Credit
                              </h3>
                              <p className={`text-sm ${userCredits >= 100 ? 'text-red-300' : 'text-yellow-300'}`}>
                                {userCredits >= 100 ? 'Limit reached ($100.00)' : appliedDiscount ? 'Cannot use with discount' : 'Available to use'}
                              </p>
                              {userCredits >= 100 && (
                                <p className="text-red-200 text-xs mt-1">
                                  Spend credits to earn more on future orders
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            max={Math.min(safeParseFloat(userCredits, 0), safeParseFloat(afterDiscounts, 0))}
                            value={appliedDiscount ? '' : (creditToApply > 0 ? safeParseFloat(creditToApply, 0) : '')}
                            onChange={(e) => {
                              if (!appliedDiscount) {
                                const value = safeParseFloat(e.target.value, 0);
                                const safeUserCredits = safeParseFloat(userCredits, 0);
                                const safeAfterDiscounts = safeParseFloat(afterDiscounts, 0);
                                setCreditToApply(Math.min(value, safeUserCredits, safeAfterDiscounts));
                              }
                            }}
                            disabled={appliedDiscount !== null}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400 focus:bg-white/10 transition-all store-credit-input disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={appliedDiscount ? "Disabled" : "Enter amount..."}
                          />
                          <button
                            onClick={() => {
                              if (!appliedDiscount) {
                                const safeUserCredits = safeParseFloat(userCredits, 0);
                                const safeAfterDiscounts = safeParseFloat(afterDiscounts, 0);
                                setCreditToApply(Math.min(safeUserCredits, safeAfterDiscounts));
                              }
                            }}
                            disabled={appliedDiscount !== null}
                            className="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            style={{
                              background: userCredits >= 100 
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(248, 113, 113, 0.35) 50%, rgba(254, 202, 202, 0.2) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
                              backdropFilter: 'blur(25px) saturate(200%)',
                              border: userCredits >= 100 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 215, 0, 0.6)',
                              boxShadow: userCredits >= 100 
                                ? 'rgba(239, 68, 68, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                                : 'rgba(250, 204, 21, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                            }}
                          >
                            Use All
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discount Code Section */}
                  {!isWholesale && (
                    <div className="mb-6">
                      <DiscountCodeInput
                        orderAmount={subtotal}
                        onDiscountApplied={setAppliedDiscount}
                        currentAppliedDiscount={appliedDiscount}
                        hasReorderDiscount={hasReorderItems}
                        reorderDiscountAmount={reorderDiscount}
                        hasStoreCredits={creditToApply > 0}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Guest Checkout Form */}
                  {!user && (
                    <div className="space-y-3 mb-4">
                      {!isOtpMode ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                First Name *
                              </label>
                              <input
                                type="text"
                                value={guestCheckoutData.firstName}
                                onChange={(e) => {
                                  setGuestCheckoutData(prev => ({
                                    ...prev,
                                    firstName: e.target.value
                                  }));
                                  // Hide the account required message when user starts filling the form
                                  if (showAccountRequiredMessage) {
                                    setShowAccountRequiredMessage(false);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                                placeholder="John"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                Last Name *
                              </label>
                              <input
                                type="text"
                                value={guestCheckoutData.lastName}
                                onChange={(e) => setGuestCheckoutData(prev => ({
                                  ...prev,
                                  lastName: e.target.value
                                }))}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                                placeholder="Doe"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              value={guestCheckoutData.email}
                              onChange={(e) => setGuestCheckoutData(prev => ({
                                ...prev,
                                email: e.target.value
                              }))}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                              placeholder="john@example.com"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Password *
                            </label>
                            <input
                              type="password"
                              value={guestCheckoutData.password}
                              onChange={(e) => setGuestCheckoutData(prev => ({
                                ...prev,
                                password: e.target.value
                              }))}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                              placeholder="Create a password"
                              required
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            <p>We'll create an account for you automatically to track your order and future purchases.</p>
                            <p className="mt-2">
                              Already have an account?{' '}
                              <button
                                onClick={() => setShowLoginModal(true)}
                                className="text-purple-400 hover:text-purple-300 underline"
                              >
                                Log in
                              </button>
                            </p>
                          </div>
                          
                          {/* Account Required Message */}
                          {showAccountRequiredMessage && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                              <p className="text-red-300 text-sm font-medium">
                                You must create an account before placing an order. This guarantees proper order tracking and communication.
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <div className="mb-4">
                              <span className="text-3xl">📧</span>
                              <h3 className="text-lg font-semibold text-white mt-2">Verify Your Email</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                We've sent a 6-digit code to <span className="text-white">{guestCheckoutData.email}</span>
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Enter 6-digit verification code
                              </label>
                              <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  setOtpCode(value);
                                }}
                                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => {
                                setIsOtpMode(false);
                                setOtpCode('');
                              }}
                              className="text-purple-400 hover:text-purple-300 text-sm underline mt-3"
                            >
                              ← Back to edit details
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Checkout Actions */}
                  <div className="space-y-4">
                    {/* Enhanced Checkout Button */}
                    <button
                      onClick={async () => {
                        // Validate guest checkout form if user is not logged in
                        if (!user) {
                          // Show the account required message when they try to checkout
                          setShowAccountRequiredMessage(true);
                          
                          if (!isOtpMode) {
                            // Validate sign up form
                            if (!guestCheckoutData.firstName.trim() || !guestCheckoutData.lastName.trim() || !guestCheckoutData.email.trim() || !guestCheckoutData.password.trim()) {
                              // Just return to show the red message, no popup
                              return;
                            }
                            
                            // Basic email validation
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(guestCheckoutData.email)) {
                              // Just return to show the red message, no popup
                              return;
                            }
                            
                            // Basic password validation (at least 6 characters)
                            if (guestCheckoutData.password.length < 6) {
                              // Just return to show the red message, no popup
                              return;
                            }
                            
                            // Send OTP via Supabase (use same flow as signup page)
                            setIsSendingOtp(true);
                            try {
                              const supabase = getSupabase();
                              
                              // Sign up with Supabase to trigger OTP (same as signup page)
                              const { data, error: authError } = await supabase.auth.signUp({
                                email: guestCheckoutData.email,
                                password: guestCheckoutData.password,
                                options: {
                                  data: {
                                    first_name: guestCheckoutData.firstName,
                                    last_name: guestCheckoutData.lastName,
                                    full_name: `${guestCheckoutData.firstName} ${guestCheckoutData.lastName}`,
                                    created_via_guest_checkout: true
                                  }
                                }
                              });
                              
                              if (authError) {
                                console.error('Error sending verification code:', authError.message);
                                setIsSendingOtp(false);
                                return;
                              }
                              
                              // Switch to OTP mode
                              setIsOtpMode(true);
                            } catch (error: any) {
                              console.error('Error sending OTP:', error);
                              // Just log error, don't show popup
                            } finally {
                              setIsSendingOtp(false);
                            }
                            return;
                          } else {
                            // Validate OTP
                            if (otpCode.length !== 6) {
                              // Just return - OTP validation happens in the form itself
                              return;
                            }
                            
                            // Verify OTP with Supabase (use same flow as signup page)
                            setIsVerifyingOtp(true);
                            try {
                              const supabase = getSupabase();
                              
                              // Verify the OTP (same as signup page, using 'signup' type)
                              const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                                email: guestCheckoutData.email,
                                token: otpCode,
                                type: 'signup'
                              });
                              
                              if (verifyError) {
                                // Try alternative verification types if signup fails
                                const { data: emailVerifyData, error: emailVerifyError } = await supabase.auth.verifyOtp({
                                  email: guestCheckoutData.email,
                                  token: otpCode,
                                  type: 'email'
                                });
                                
                                if (emailVerifyError) {
                                  console.error('Invalid verification code:', emailVerifyError.message);
                                  setIsVerifyingOtp(false);
                                  return;
                                }
                              }
                              
                              // User should be automatically logged in after successful verification
                              // Update the user state
                              const { data: { session } } = await supabase.auth.getSession();
                              if (session?.user) {
                                setUser(session.user);
                                
                                // Create user profile with names from guest checkout data
                                try {
                                  await createUserProfile({
                                    variables: {
                                      userId: session.user.id,
                                      firstName: guestCheckoutData.firstName,
                                      lastName: guestCheckoutData.lastName
                                    }
                                  });
                                  console.log('✅ User profile created after signup');
                                } catch (profileError) {
                                  console.error('⚠️ Failed to create profile:', profileError);
                                  // Don't block checkout for profile creation errors
                                }
                                
                                // Wait for React state to update before proceeding with checkout
                                setTimeout(() => {
                                  const checkoutButton = document.querySelector('.cart-checkout-button-trigger');
                                  if (checkoutButton) {
                                    (checkoutButton as HTMLButtonElement).click();
                                  }
                                }, 100); // Small delay to allow state update
                                
                                setIsVerifyingOtp(false);
                                return;
                              }
                              
                              // Proceed with checkout
                              setIsVerifyingOtp(false);
                            } catch (error: any) {
                              console.error('Error verifying OTP:', error);
                              // Just log error, don't show popup
                              setIsVerifyingOtp(false);
                              return;
                            }
                          }
                        }
                        
                        // Only trigger checkout if user is not in OTP verification process
                        if (!isOtpMode) {
                          const checkoutButton = document.querySelector('.cart-checkout-button-trigger');
                          if (checkoutButton) {
                            (checkoutButton as HTMLButtonElement).click();
                          }
                        }
                      }}
                      className="w-full py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group cursor-pointer hover:scale-105 transform"
                      style={{
                        background: 'linear-gradient(135deg, rgba(51, 234, 147, 0.4) 0%, rgba(51, 234, 147, 0.25) 50%, rgba(51, 234, 147, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(51, 234, 147, 0.4)',
                        boxShadow: 'rgba(51, 234, 147, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                      disabled={isSendingOtp || isVerifyingOtp}
                    >
                      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
                        <span className="text-3xl md:text-3xl">{!user && isOtpMode ? '🔐' : '💳'}</span>
                        <div className="text-center md:text-left">
                          <div className="text-white font-bold text-lg flex items-center justify-center md:justify-start gap-2 mb-1">
                            {isSendingOtp ? 'Sending Code...' : isVerifyingOtp ? 'Verifying...' : (!user && isOtpMode ? 'Verify & Checkout' : 'Go to Checkout')}
                          </div>
                          {user ? (
                            <div className="text-white/90 text-sm font-normal flex items-center justify-center md:justify-start gap-2">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Logged in as {user.email}
                            </div>
                          ) : (
                            <div className="text-white/90 text-sm font-normal">
                              {isOtpMode ? 'Enter code to complete sign up' : 'Account will be created automatically'}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Hidden actual checkout button */}
                    <div className="hidden">
                      <CartCheckoutButton
                        key={`checkout-${user?.id || 'guest'}`} // Force re-render when user changes
                        cartItems={updatedCart} // Don't pre-apply reorder discount - let backend handle it
                        className="cart-checkout-button-trigger"
                        creditsToApply={safeParseFloat(creditToApply, 0)}
                        discountCode={appliedDiscount?.code}
                        discountAmount={appliedDiscount?.amount}
                        isBlindShipment={isBlindShipment}
                        guestCheckoutData={!user ? { firstName: guestCheckoutData.firstName, lastName: guestCheckoutData.lastName, email: guestCheckoutData.email } : undefined}
                        onCheckoutStart={() => {
                          console.log('🚀 Starting enhanced cart checkout with user context:', updatedCart.length, 'items');
                          console.log('👤 User state at checkout:', user ? `Logged in as ${user.email} (ID: ${user.id})` : 'Guest user');
                          console.log('📧 Guest checkout data:', !user ? guestCheckoutData : 'None (user is logged in)');
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
                        Go to Checkout
                      </CartCheckoutButton>
                    </div>



                    {/* Delivery Information */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <span>📦</span> Estimated Delivery
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Processing</span>
                          <span className="text-white">
                            {deliveryInfo.isHighVolume ? '3-4' : deliveryInfo.productionDays} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shipping</span>
                          <span className="text-white">{deliveryInfo.shippingDays} days</span>
                        </div>
                        <hr className="border-white/10" />
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-300">Delivery by</span>
                          <span className="text-white">
                            {deliveryInfo.deliveryDate.toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Sample Pack Shipping Note */}
                      {updatedCart.some(item => item.product.name === 'Sample Pack by Sticker Shuttle') && (
                        <div className="flex items-center gap-2 p-3 rounded-lg mt-3" style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}>
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366914/USPS-Logo_lnyobe.png" 
                            alt="USPS Logo" 
                            className="w-6 h-6 object-contain"
                          />
                          <p className="text-blue-200 text-xs">
                            Sample packs are sent without tracking via USPS.
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 pt-2">
                        * UPS may not deliver on weekends. To be safe, delivery dates are automatically moved to the next business day.
                      </p>
                    </div>

                    {/* Blind Shipment Toggle */}
                    <div className="mt-6">
                      <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                           style={{
                             background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.3) 0%, rgba(255, 165, 0, 0.15) 50%, rgba(255, 165, 0, 0.05) 100%)',
                             border: '1px solid rgba(255, 165, 0, 0.4)',
                             boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                             backdropFilter: 'blur(12px)'
                           }}>
                        <button
                          onClick={() => setIsBlindShipment(!isBlindShipment)}
                          title={isBlindShipment ? 'Disable blind shipment' : 'Enable blind shipment'}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            isBlindShipment ? 'bg-orange-500' : 'bg-white/20'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            isBlindShipment ? 'translate-x-7' : 'translate-x-1'
                          }`} />
                        </button>
                                                  <div>
                            <span className="text-sm font-medium text-orange-200">Blind Shipment</span>
                            <p className="text-xs text-orange-200/80">Hide Sticker Shuttle logos from packaging</p>
                          </div>
                      </div>
                      {isBlindShipment && (
                        <div className="mt-3 text-xs text-orange-200 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                          ℹ️ Your order will have generic packaging and shipping labels. The label will still show our return address minus our company name.
                        </div>
                      )}
                    </div>
                    
                    {/* Additional Payment Section */}
                    <div className="mt-6">
                      <div className="p-4 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                             border: '1px solid rgba(34, 197, 94, 0.4)',
                             boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                             backdropFilter: 'blur(12px)'
                           }}>
                        <div className="mb-4">
                          <h4 className="text-green-200 font-medium mb-2">Additional Payment</h4>
                          <p className="text-xs text-green-200/80">Add extra amount to your order</p>
                        </div>
                        
                        {/* Percentage Buttons */}
                        <div className="flex gap-2 mb-4">
                          {[5, 10, 15].map((percentage) => (
                            <button
                              key={percentage}
                              onClick={() => handlePercentageClick(percentage)}
                              className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200 hover:scale-105"
                              style={{
                                background: selectedPercentage === percentage 
                                  ? 'rgba(34, 197, 94, 0.3)' 
                                  : 'rgba(255, 255, 255, 0.1)',
                                border: selectedPercentage === percentage 
                                  ? '1px solid rgba(34, 197, 94, 0.6)' 
                                  : '1px solid rgba(255, 255, 255, 0.2)',
                                color: selectedPercentage === percentage ? '#BBF7D0' : '#D1D5DB'
                              }}
                            >
                              {percentage}% (${((safeSubtotal * percentage) / 100).toFixed(2)})
                            </button>
                          ))}
                        </div>
                        
                        {/* Custom Amount Input */}
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={additionalPaymentAmount}
                            onChange={(e) => setAdditionalPaymentAmount(e.target.value)}
                            placeholder="Custom amount ($)"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border bg-black/20 text-white placeholder-gray-400 border-white/20 focus:border-green-400 focus:outline-none"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={handleCustomAmountAdd}
                            disabled={!additionalPaymentAmount || parseFloat(additionalPaymentAmount) <= 0}
                            className="px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{
                              background: 'rgba(34, 197, 94, 0.3)',
                              border: '1px solid rgba(34, 197, 94, 0.6)',
                              color: '#BBF7D0'
                            }}
                          >
                            Add
                          </button>
                        </div>
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
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
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

        /* Store Credit Input Arrow Styling */
        .store-credit-input::-webkit-outer-spin-button,
        .store-credit-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .store-credit-input[type=number] {
          -moz-appearance: textfield;
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="max-w-md w-full rounded-2xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Welcome Back!</h3>
              <p className="text-white/80 text-sm">Sign in to your account to continue</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                  placeholder="Enter your email"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                  placeholder="Enter your password"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginData({ email: '', password: '' });
                }}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  color: '#ffffff'
                }}
              >
                {isLoggingIn ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-xs text-gray-400">
                Don't have an account?{' '}
                <a
                  href="/signup?redirect=/cart"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Create one during checkout
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Cart Modal */}
      {showShareModal && sharedCartUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="max-w-md w-full rounded-2xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">🔗 Cart Shared Successfully!</h3>
              <p className="text-white/80 text-sm">Share this link with anyone to let them pay for this cart</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Share URL
                </label>
                                 <div className="flex gap-2">
                   <input
                     type="text"
                     value={sharedCartUrl}
                     readOnly
                     data-share-url-input
                     className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-400 focus:bg-white/10 transition-all"
                     onClick={(e) => (e.target as HTMLInputElement).select()}
                   />
                   <button
                     onClick={handleCopyShareUrl}
                     data-copy-button
                     className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                     style={{
                       background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                       backdropFilter: 'blur(25px) saturate(180%)',
                       border: '1px solid rgba(59, 130, 246, 0.4)',
                       boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                       color: '#ffffff'
                     }}
                   >
                     Copy
                   </button>
                 </div>
              </div>
              
              <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-lg border border-white/10">
                💡 <strong>Note:</strong> This link will expire in 30 days. Anyone with this link can view and pay for this exact cart configuration.
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSharedCartUrl(null);
                }}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff'
                }}
              >
                Close
              </button>
              
              <button
                onClick={() => {
                  window.open(sharedCartUrl, '_blank');
                }}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  color: '#ffffff'
                }}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 







