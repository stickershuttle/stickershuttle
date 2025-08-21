"use client"

import { useState, useEffect, useCallback } from "react"
import { Instagram } from "lucide-react"
import { 
  BasePriceRow, 
  QuantityDiscountRow, 
  calculateRealPrice, 
  PRESET_SIZES,
  calculateSquareInches 
} from "@/utils/real-pricing"
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress, CalculatorMetadata } from "@/utils/cloudinary"
import AIFileImage from './AIFileImage'
import { useCart } from "@/components/CartContext"
import { generateCartItemId } from "@/types/product"
import { useRouter } from "next/router"
import { getSupabase } from "@/lib/supabase"

interface BasePricing {
  sqInches: number
  price: number
}

interface StickerSheetsCalculatorProps {
  initialBasePricing: BasePricing[]
  realPricingData?: {
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null
}

export default function StickerSheetsCalculator({ initialBasePricing, realPricingData }: StickerSheetsCalculatorProps) {
  const { addToCart, isRushOrder, updateAllItemsRushOrder } = useCart();
  const router = useRouter();
  const [basePricing, setBasePricing] = useState<BasePricing[]>(initialBasePricing)
  const [selectedCut, setSelectedCut] = useState("Vertical")
  const [selectedMaterial, setSelectedMaterial] = useState("Matte")
  const [selectedSize, setSelectedSize] = useState('4" × 6"')
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState("100")
  const [customQuantity, setCustomQuantity] = useState("")
  const [selectedKissOption, setSelectedKissOption] = useState("1-4")
  const [sendProof, setSendProof] = useState(true)
  const [uploadLater, setUploadLater] = useState(false)
  const [vibrancyBoost, setVibrancyBoost] = useState(false)
  // Use global rush order state from cart instead of local state
  const [totalPrice, setTotalPrice] = useState("")
  const [costPerSticker, setCostPerSticker] = useState("")

  const [postToInstagram, setPostToInstagram] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [hoveredGoldTier, setHoveredGoldTier] = useState<number | null>(null)
  const [showCustomGoldMessage, setShowCustomGoldMessage] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // User and profile states
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // Info tooltip state
  const [showInfoTooltip, setShowInfoTooltip] = useState(false)

  // Minimum quantity error state
  const [showMinQuantityError, setShowMinQuantityError] = useState(false)

  // Check for mobile on component mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showInfoTooltip && !(event.target as Element).closest('.info-tooltip-container')) {
        setShowInfoTooltip(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showInfoTooltip])

  // Fetch user and profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = await getSupabase();
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          // Get user profile
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [])

  // Calculate dynamic credit rate based on wholesale status
  const getCreditRate = () => {
    if (!profile) return 0.05; // Default 5% for non-users
    
    // Check if user is wholesale approved
    if (profile.is_wholesale_customer && profile.wholesale_status === 'approved') {
      return 0.025; // 2.5% for approved wholesale customers
    }
    
    return 0.05; // 5% for regular customers
  };

  // Check if user is wholesale approved
  const isWholesaleApproved = () => {
    if (!profile) return false;
    return profile.is_wholesale_customer && profile.wholesale_status === 'approved';
  };

  // Calculate wholesale discount (15% off)
  const calculateWholesaleDiscount = (originalPrice: number) => {
    if (!isWholesaleApproved()) return { discountAmount: 0, finalPrice: originalPrice };
    
    const discountAmount = originalPrice * 0.15;
    const finalPrice = originalPrice - discountAmount;
    
    return { discountAmount, finalPrice };
  };

  // Auto-expand textarea when additionalNotes changes
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder*="instructions"]') as HTMLTextAreaElement;
    if (textarea && additionalNotes) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(50, textarea.scrollHeight) + 'px';
    }
  }, [additionalNotes])

  // Sync with global rush order state on component mount and when it changes
  useEffect(() => {
    // This effect runs when the global rush order state changes
    // No need to do anything special here since we're already using isRushOrder directly
    // The pricing will be automatically recalculated via the updatePricing effect
    console.log('🚀 Global rush order state changed:', isRushOrder);
  }, [isRushOrder])

  // Pricing data for different sizes
  const getPriceDataForSize = (sizeInches: number) => {
    // Base pricing for 3" stickers
    const basePriceData = {
      50: { total: 67.98, perEach: 1.36 },
      100: { total: 87.99, perEach: 0.88 },
      200: { total: 125.97, perEach: 0.63 },
      300: { total: 158.95, perEach: 0.53 },
      500: { total: 219.92, perEach: 0.44 },
      750: { total: 329.9, perEach: 0.44 },
      1000: { total: 349.85, perEach: 0.35 },
      2500: { total: 724.65, perEach: 0.29 },
    }

    // Calculate area multiplier (3" = 9 sq inches is our base)
    const baseArea = 9 // 3" x 3"
    const currentArea = sizeInches * sizeInches
    const areaMultiplier = currentArea / baseArea

    // Scale pricing based on area
    const scaledPriceData: { [key: number]: { total: number; perEach: number } } = {}

    Object.entries(basePriceData).forEach(([qty, data]) => {
      scaledPriceData[Number.parseInt(qty)] = {
        total: data.total * areaMultiplier,
        perEach: data.perEach * areaMultiplier,
      }
    })

    return scaledPriceData
  }

  // Extract dimensions from size string for rectangular sizes
  const getSizeDimensions = (sizeString: string) => {
    if (sizeString === "Custom size") return { width: 0, height: 0 }
    
    // Handle new rectangular format: "2" × 4""
    if (sizeString === '2" × 4"') return { width: 2, height: 4 }
    if (sizeString === '4" × 6"') return { width: 4, height: 6 }
    if (sizeString === '5" × 7"') return { width: 5, height: 7 }
    if (sizeString === '8.5" × 11"') return { width: 8.5, height: 11 }
    
    // Fallback for unknown sizes
    return { width: 4, height: 6 }
  }

  const updatePricing = useCallback(() => {
    // Skip if component not mounted or during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    const area = calculateArea(selectedSize, customWidth, customHeight)
    const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)

    console.log(`\n--- Pricing Update ---`)
    console.log(`Size: ${selectedSize}, Custom Width: ${customWidth}, Custom Height: ${customHeight}`)
    console.log(`Calculated Area: ${area.toFixed(2)} sq inches`)
    console.log(`Quantity: ${quantity}`)

    if (area > 0 && quantity >= 15) {
      const { total, perSheet } = calculatePrice(quantity, area, isRushOrder)
      console.log(`Total Price: $${total.toFixed(2)}`)
      console.log(`Price Per Sheet: $${perSheet.toFixed(2)}`)
      setTotalPrice(`$${total.toFixed(2)}`)
      setCostPerSticker(`$${perSheet.toFixed(2)}/sheet`)
    } else {
      console.log("Invalid area or quantity, or quantity below minimum (15), pricing not calculated")
      setTotalPrice("")
      setCostPerSticker("")
    }
  }, [selectedSize, customWidth, customHeight, selectedQuantity, customQuantity, selectedKissOption, isRushOrder, vibrancyBoost])

  useEffect(() => {
    console.log("Recalculating price due to size or quantity change")
    updatePricing()
  }, [updatePricing])

  // Load reorder data from localStorage if available
  useEffect(() => {
    const loadReorderData = () => {
      try {
        const reorderDataString = localStorage.getItem('reorderData');
        if (reorderDataString) {
          console.log('🔄 Loading reorder data for sticker sheets...');
          const reorderData = JSON.parse(reorderDataString);
          
          if (reorderData.items && reorderData.items.length > 0) {
            const item = reorderData.items[0]; // Use first item
            const fullItemData = reorderData.items[0]; // In this case, items already contain full data
            
            console.log('📋 Reorder item data:', fullItemData);
            
            // Load calculator selections from the original order
            if (fullItemData._fullItemData?.calculatorSelections || fullItemData.calculatorSelections) {
              const selections = fullItemData._fullItemData?.calculatorSelections || fullItemData.calculatorSelections;
              
              // Set form fields based on original order
              if (selections.cut?.displayValue) {
                setSelectedCut(selections.cut.displayValue);
              }
              if (selections.material?.displayValue) {
                setSelectedMaterial(selections.material.displayValue);
              }
              if (selections.size?.displayValue) {
                setSelectedSize(selections.size.displayValue);
                
                // Handle custom size
                if (selections.size.displayValue === 'Custom size' || selections.size.value?.includes('x')) {
                  const customSize = selections.size.value || selections.size.displayValue;
                  if (customSize.includes('x')) {
                    const [width, height] = customSize.split('x').map((s: string) => s.replace(/['"]/g, '').trim());
                    setCustomWidth(width);
                    setCustomHeight(height);
                  }
                }
              }
              if (selections.whiteOption?.displayValue) {
                setSelectedKissOption(selections.whiteOption.displayValue);
              }
              if (selections.rush?.value === true) {
                updateAllItemsRushOrder(true);
              }
              if (selections.proof?.value === false) {
                setSendProof(false);
              }
            }
            
            // Set quantity
            if (fullItemData.quantity) {
              const qty = fullItemData.quantity.toString();
              if (['50', '100', '200', '300', '500', '750', '1000', '2500'].includes(qty)) {
                setSelectedQuantity(qty);
              } else {
                setSelectedQuantity('Custom');
                setCustomQuantity(qty);
              }
            }
            
            // Load uploaded file from original order
            const originalFiles = fullItemData._fullItemData?.customFiles || 
                                 fullItemData._fullItemData?.custom_files || 
                                 fullItemData.customFiles || 
                                 fullItemData.custom_files || 
                                 [fullItemData.image];
                                 
            if (originalFiles && originalFiles.length > 0 && originalFiles[0]) {
              console.log('🖼️ Preloading original image:', originalFiles[0]);
              
              // Create a mock CloudinaryUploadResult to display the original image
              const mockUploadResult: CloudinaryUploadResult = {
                secure_url: originalFiles[0],
                public_id: `reorder-${Date.now()}`,
                original_filename: 'reorder-image',
                width: 800, // Default values
                height: 600,
                format: 'png',
                bytes: 0
              };
              
              setUploadedFile(mockUploadResult);
              setUploadLater(false);
            }
            
            // Load notes
            if (fullItemData._fullItemData?.customerNotes || fullItemData._fullItemData?.customer_notes || fullItemData.notes) {
              setAdditionalNotes(fullItemData._fullItemData?.customerNotes || fullItemData._fullItemData?.customer_notes || fullItemData.notes || '');
            }
            
            console.log('✅ Reorder data loaded successfully');
          }
          
          // Clear the localStorage data after loading
          localStorage.removeItem('reorderData');
        }
      } catch (error) {
        console.error('❌ Error loading reorder data:', error);
        // Clear corrupted data
        localStorage.removeItem('reorderData');
      }
    };

    // Load reorder data on component mount
    loadReorderData();
  }, []); // Empty dependency array - only run once on mount

  // Calculate area based on size
  const calculateArea = (size: string, customW = "", customH = "") => {
    // Defensive check for SSR
    if (!size || typeof size !== 'string') {
      console.warn('calculateArea: size is undefined or not a string, using default 4" × 6"', size);
      return 24; // Default to 4" × 6" = 24 sq in
    }
    
    if (size === "Custom size") {
      const w = Number.parseFloat(customW) || 0
      const h = Number.parseFloat(customH) || 0
      const area = calculateSquareInches(w, h)
      console.log(`Custom size: ${w}" x ${h}", Area: ${area.toFixed(2)} sq inches`)
      return area
    }
    
    // Handle preset sheet sizes
    if (size === '2" × 4"') return 8 // 2 × 4 = 8 sq in
    if (size === '4" × 6"') return 24 // 4 × 6 = 24 sq in
    if (size === '5" × 7"') return 35 // 5 × 7 = 35 sq in  
    if (size === '8.5" × 11"') return 93.5 // 8.5 × 11 = 93.5 sq in
    
    // Fallback calculation
    console.log(`Unknown size: ${size}, using default area`)
    return 24 // Default to 4" × 6"
  }

  const calculatePrice = (qty: number, area: number, isRushOrderParam: boolean, vibrancyBoost: boolean = false) => {
    let totalPrice = 0
    let pricePerSticker = 0

    // Get kiss option pricing modifier
    const kissOptionModifiers = {
      '1-4': 1.0,
      '5-8': 1.05,
      '9-12': 1.1
    };
    const kissOptionMultiplier = kissOptionModifiers[selectedKissOption as keyof typeof kissOptionModifiers] || 1.0;

    // Try to use real pricing data first (same as vinyl stickers)
    if (realPricingData && realPricingData.basePricing && realPricingData.quantityDiscounts) {
      console.log('Using real pricing data for sticker sheets calculation');
      
      const realResult = calculateRealPrice(
        realPricingData.basePricing,
        realPricingData.quantityDiscounts,
        area,
        qty,
        isRushOrderParam
      );
      
      // Apply kiss option multiplier to the real pricing
      let finalTotalPrice = realResult.totalPrice * kissOptionMultiplier;
      let finalPricePerSticker = realResult.finalPricePerSticker * kissOptionMultiplier;
      
      // Apply 5% vibrancy boost if selected
      if (vibrancyBoost) {
        finalTotalPrice *= 1.05;
        finalPricePerSticker *= 1.05;
      }
      
      console.log(`Real Pricing (Sheets) - Quantity: ${qty}, Area: ${area}, Kiss Option: ${selectedKissOption} (${kissOptionMultiplier}x), Vibrancy: ${vibrancyBoost}, Total: $${finalTotalPrice.toFixed(2)}, Per sheet: $${finalPricePerSticker.toFixed(2)}`);
      
      return {
        total: finalTotalPrice,
        perSheet: finalPricePerSticker
      };
    }

    // Fallback to legacy pricing calculation (similar to vinyl stickers but for sheets)
    console.log('Using legacy pricing calculation for sticker sheets');
    
    // Use proportional pricing based on area (same base as vinyl stickers)
    const basePrice = 1.36 // Base price per sticker for 3" (9 sq inches) from vinyl pricing
    const baseArea = 9 // 3" x 3" = 9 sq inches

    // Scale base price by area
    const scaledBasePrice = basePrice * (area / baseArea)

    // Apply quantity discounts (same discount structure as vinyl stickers)
    const discountMap: { [key: number]: number } = {
      50: 1.0, // No discount
      100: 0.647, // 35.3% discount
      200: 0.463, // 53.7% discount
      300: 0.39, // 61% discount
      500: 0.324, // 67.6% discount
      750: 0.24, // 76% discount
      1000: 0.19, // 81% discount
      2500: 0.213, // 78.7% discount
    }

    // Find the appropriate quantity tier
    let applicableQuantity = 50;
    const quantityTiers = [50, 100, 200, 300, 500, 750, 1000, 2500];
    
    for (const tier of quantityTiers) {
      if (qty >= tier) {
        applicableQuantity = tier;
      } else {
        break;
      }
    }

    const discountMultiplier = discountMap[applicableQuantity] || 1.0
    pricePerSticker = scaledBasePrice * discountMultiplier * kissOptionMultiplier
    totalPrice = pricePerSticker * qty

    if (isRushOrderParam) {
      totalPrice *= 1.4 // Add 40% for rush orders
      pricePerSticker *= 1.4
    }

    // Apply 5% vibrancy boost if selected
    if (vibrancyBoost) {
      totalPrice *= 1.05
      pricePerSticker *= 1.05
    }

    console.log(
      `Legacy Pricing (Sheets) - Quantity: ${qty}, Area: ${area}, Kiss Option: ${selectedKissOption} (${kissOptionMultiplier}x), Vibrancy: ${vibrancyBoost}, Total price: $${totalPrice.toFixed(2)}, Price per sheet: $${pricePerSticker.toFixed(2)}`,
    )

    return {
      total: totalPrice,
      perSheet: pricePerSticker,
    }
  }

  const handleSizeChange = (size: string) => {
    setSelectedSize(size)
    if (size !== "Custom size") {
      setCustomWidth("")
      setCustomHeight("")
      setShowSizeWarning(false) // Reset warning when leaving custom size
    }
  }

  const handleCustomSizeChange = (dimension: "width" | "height", value: string) => {
    // Validate input - only allow numbers and decimal points
    const numericValue = value.replace(/[^0-9.]/g, '')
    
    // Check if value is below minimum or above maximum
    const numValue = parseFloat(numericValue)
    if (numValue < 3 && numericValue !== "") {
      // Show warning message for minimum size
      setShowSizeWarning(true)
      return
    }
    if (numValue > 14) {
      // Show warning message for maximum size
      setShowSizeWarning(true)
      return
    }
    
    // Reset warning if entering valid value
    if (showSizeWarning && numValue >= 3 && numValue <= 14) {
      setShowSizeWarning(false)
    }
    
    if (dimension === "width") {
      setCustomWidth(numericValue)
    } else {
      setCustomHeight(numericValue)
    }
  }

  const handleQuantityChange = (amount: string) => {
    setSelectedQuantity(amount)
    if (amount !== "Custom") {
      setCustomQuantity("")
    }
  }

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value)
    
    const qty = Number.parseInt(value) || 0
    
    // Check minimum quantity validation
    if (value && qty > 0 && qty < 15) {
      setShowMinQuantityError(true)
    } else {
      setShowMinQuantityError(false)
    }
    
    // Show gold message for quantities 1,000+
    if (qty >= 1000) {
      setShowCustomGoldMessage(true)
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setShowCustomGoldMessage(false)
      }, 3000)
    } else {
      setShowCustomGoldMessage(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    // Reset previous states
    setUploadError(null)
    setUploadProgress(null)
    
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file')
      return
    }

    setIsUploading(true)
    
    try {
      // Prepare metadata from current calculator state
      const area = calculateArea(selectedSize, customWidth, customHeight)
      const qty = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
      
      const metadata: CalculatorMetadata = {
        selectedCut,
        selectedMaterial,
        selectedSize,
        selectedQuantity,
        customQuantity: customQuantity || undefined,
        sendProof,
        uploadLater,
        rushOrder: isRushOrder,
        postToInstagram,
        instagramHandle: instagramHandle || undefined,
        totalPrice: totalPrice || undefined,
        costPerSticker: costPerSticker || undefined,
      }
      
      const result = await uploadToCloudinary(file, metadata, (progress: UploadProgress) => {
        setUploadProgress(progress)
      })
      
      setUploadedFile(result)
      setUploadLater(false) // Uncheck "upload later" since file is uploaded
      console.log('File uploaded successfully with metadata:', result)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    setUploadError(null)
  }

  // Get file type icon based on format
  const getFileTypeIcon = (format: string): string | null => {
    const lowerFormat = format.toLowerCase()
    
    if (lowerFormat === 'ai') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751503976/Adobe_Illustrator_.AI_File_Icon_v3wshr.png'
    }
    if (lowerFormat === 'psd') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504068/PSD_file_icon.svg_sbi8dh.png'
    }
    if (lowerFormat === 'eps') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504098/9034333_ykhb8f.png'
    }
    if (lowerFormat === 'pdf') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504123/PDF_file_icon.svg_uovjbk.png'
    }
    
    return null
  }

  const createCartItem = () => {
    const area = calculateArea(selectedSize, customWidth, customHeight);
    const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity);
    const { total, perSheet } = calculatePrice(quantity, area, isRushOrder, vibrancyBoost);

    return {
      id: generateCartItemId(),
      product: {
        id: "sticker-sheets",
        sku: "SS-SH-001",
        name: "Sticker Sheets",
        category: "sticker-sheets" as const,
        description: "Custom sticker sheets with multiple designs on one sheet",
        shortDescription: "Multiple stickers on one convenient sheet",
        basePrice: perSheet,
        pricingModel: "per-unit" as const,
        images: [],
        defaultImage: "",
        features: [],
        attributes: [],
        customizable: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      customization: {
        productId: "sticker-sheets",
        selections: {
          cut: { type: "shape" as const, value: selectedCut, displayValue: selectedCut, priceImpact: 0 },
          material: { type: "finish" as const, value: selectedMaterial, displayValue: selectedMaterial, priceImpact: 0 },
          size: { 
            type: "size-preset" as const, 
            value: selectedSize,
            displayValue: selectedSize,
            priceImpact: 0 
          },
          kissOption: {
            type: "finish" as const,
            value: selectedKissOption,
            displayValue: selectedKissOption === "1-4" ? "1-4 Cuts" :
                          selectedKissOption === "5-8" ? "5-8 Cuts" :
                          selectedKissOption === "9-12" ? "9-12 Cuts" : selectedKissOption,
            priceImpact: 0
          },
          vibrancy: { type: "addon" as const, value: vibrancyBoost, displayValue: vibrancyBoost ? "+25% Vibrancy" : "Standard", priceImpact: vibrancyBoost ? total * 0.05 : 0 },
          proof: { type: "finish" as const, value: sendProof, displayValue: sendProof ? "Send Proof" : "No Proof", priceImpact: 0 },
          rush: { type: "finish" as const, value: isRushOrder, displayValue: isRushOrder ? "Rush Order" : "Standard", priceImpact: isRushOrder ? total * 0.4 : 0 },
          ...(postToInstagram && {
            instagram: { 
              type: "finish" as const, 
              value: instagramHandle, 
              displayValue: instagramHandle ? `@${instagramHandle}` : "Instagram Opt-in", 
              priceImpact: 0 
            }
          })
        },
        totalPrice: total,
        customFiles: uploadedFile ? [uploadedFile.secure_url] : [],
        notes: additionalNotes.trim(),
        instagramOptIn: postToInstagram,
        additionalInfo: {
          instagramHandle: postToInstagram ? instagramHandle : undefined,
          uploadLater: uploadLater
        }
      },
      quantity: quantity,
      unitPrice: perSheet,
      totalPrice: total,
      addedAt: new Date().toISOString()
    };
  };

  const handleCheckout = () => {
    const cartItem = createCartItem();
    addToCart(cartItem);
    // Redirect to cart page for checkout
    router.push('/cart');
  };

  const handleAddToCartAndKeepShopping = () => {
    const cartItem = createCartItem();
    addToCart(cartItem);
    // Redirect to products page with success message
    router.push('/products?added=true');
  };

  return (
    <div className="transition-colors duration-200">
      <style jsx>{`
  @keyframes bounce-in {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(20px) scale(0.5);
    }
    60% {
      opacity: 1;
      transform: translateX(-50%) translateY(-10px) scale(1.1);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }
  
  @keyframes fade-out {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px) scale(0.8);
    }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  

  
  .animate-bounce-in {
    animation: bounce-in 0.4s ease-out;
  }
  
  .animate-fade-out {
    animation: fade-out 0.3s ease-in forwards;
  }
  
  .animate-glow-purple {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
  }
  
  .animate-glow-green {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
  }
  
  .animate-glow-yellow {
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.4), 0 0 25px rgba(234, 179, 8, 0.2);
  }
  
  .animate-glow-red {
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), 0 0 25px rgba(239, 68, 68, 0.2);
  }

  .animate-glow-blue {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 0 25px rgba(59, 130, 246, 0.2);
  }
  
  .animate-glow-orange {
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.4), 0 0 25px rgba(249, 115, 22, 0.2);
  }

  .container-style {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border-radius: 16px;
  }
  
  .button-interactive {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .button-interactive:hover {
    transform: translateY(-1px);
  }
  
  .button-interactive:active {
    transform: translateY(0) scale(0.98);
  }
  
  .button-selected {
    position: relative;
  }
  

`}</style>
              <div className="">
          {/* Main Container */}
        <div className="rounded-3xl">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-18 gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Cut Selection */}
            <div className="md:col-span-1 lg:col-span-4 container-style p-4 lg:p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-purple-400">✂️</span>
                Select a Cut
              </h2>
              <div className="space-y-3">
                {["Horizontal", "Vertical", "Custom Shape"].map((cut) => (
                  <button
                    key={cut}
                    onClick={() => setSelectedCut(cut)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md
                      ${
                        selectedCut === cut
                          ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {cut === "Horizontal" && (
                        <div className="w-6 h-4 bg-white/20 rounded-sm border border-white/40"></div>
                      )}
                      {cut === "Vertical" && (
                        <div className="w-4 h-6 bg-white/20 rounded-sm border border-white/40"></div>
                      )}
                      {cut === "Custom Shape" && (
                        <span className="text-lg">🧩</span>
                      )}
                      <span>{cut}</span>
                    </div>
                    {cut === "Vertical" && (
                      <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">Most Popular</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Selection */}
            <div className="md:col-span-1 lg:col-span-4 container-style p-4 lg:p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span role="img" aria-label="material" className="text-green-400">
                  🧻
                </span>
                Material
              </h2>
              <div className="space-y-3">
                {["Matte", "Gloss", "Shimmer Gloss"].map((material) => (
                  <button
                    key={material}
                    onClick={() => setSelectedMaterial(material)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md
                      ${
                        selectedMaterial === material
                          ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    {material}
                    {material === "Matte" && (
                      <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                        Most Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="md:col-span-1 lg:col-span-4 container-style p-4 lg:p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span role="img" aria-label="ruler" className="text-purple-400">
                  📏
                </span>
                Select a size
              </h2>
              <div className="space-y-3">
                {['2" × 4"', '4" × 6"', '5" × 7"', '8.5" × 11"', "Custom size"].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                      ${
                        selectedSize === size
                          ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    <span>{size}</span>
                    {size === '4" × 6"' && (
                      <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">
                        Most Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {selectedSize === "Custom size" && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="W"
                      value={customWidth}
                      onChange={(e) => handleCustomSizeChange("width", e.target.value)}
                      max="14"
                      step="0.1"
                      className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="number"
                      placeholder="H"
                      value={customHeight}
                      onChange={(e) => handleCustomSizeChange("height", e.target.value)}
                      max="14"
                      step="0.1"
                      className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  {showSizeWarning && (
                    <div className="text-xs text-orange-300 font-medium">
                      📏 Size must be between 0.5" and 14". Please enter a valid size.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Kiss Cut Options Section - Mobile Only */}
            <div className="md:hidden md:col-span-3 lg:col-span-6 container-style p-4 lg:p-6 transition-colors duration-200 mb-1">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-blue-400">✂️</span>
                Kiss Cut Total
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {/* 1-4 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("1-4")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "1-4"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      1-4 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Perfect for simple designs with just a few individual stickers per sheet.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-green-400 font-medium">✅ Standard Pricing</span>
                  </div>
                  {selectedKissOption === "1-4" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* 5-8 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("5-8")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "5-8"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      5-8 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Great for medium complexity sheets with multiple sticker designs.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+5% pricing</span>
                  </div>
                  {selectedKissOption === "5-8" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* 9-12 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("9-12")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "9-12"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      9-12 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Ideal for complex sheets with many individual stickers and detailed layouts.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+10% pricing</span>
                  </div>
                  {selectedKissOption === "9-12" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="md:col-span-3 lg:col-span-6 container-style p-4 lg:p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <span className="text-green-400">#️⃣</span>
                  Select a quantity
                </span>
              </h2>
              <div className="space-y-2 relative">
                {["50", "100", "200", "300", "500", "1,000", "2,500", "Custom"].map((amount) => {
                  const numericAmount = Number.parseInt(amount.replace(",", ""))
                  const area = calculateArea(selectedSize, customWidth, customHeight)

                  // Get pricing for current size
                  let pricePerEach = ""
                  let percentOff = ""

                  if (area > 0 && amount !== "Custom") {
                    const currentPricing = calculatePrice(numericAmount, area, false)
                    const { perSheet } = currentPricing
                    
                    // Get the actual discount percentage from CSV data
                    let discount = 0
                    if (realPricingData && realPricingData.quantityDiscounts && numericAmount > 50) {
                      // Find the appropriate quantity tier (use lower tier as per CSV note)
                      let applicableQuantity = 50;
                      for (const row of realPricingData.quantityDiscounts) {
                        if (numericAmount >= row.quantity) {
                          applicableQuantity = row.quantity;
                        } else {
                          break;
                        }
                      }
                      
                      const quantityRow = realPricingData.quantityDiscounts.find(row => row.quantity === applicableQuantity);
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
                        console.log(`Discount calc: Qty ${numericAmount} -> ${applicableQuantity}, Area ${area} -> ${applicableSqInches}sq, Discount: ${discount.toFixed(1)}%`);
                      }
                    }

                    pricePerEach = `$${perSheet.toFixed(2)}/sheet`
                    if (discount > 0.5) { // Only show if discount is meaningful (>0.5%)
                      percentOff = `${Math.round(discount)}% off`
                    }
                  }


                  const isSelected = (selectedQuantity === numericAmount.toString()) || (selectedQuantity === "Custom" && amount === "Custom")
                  const isGoldTier = numericAmount >= 1000 && amount !== "Custom"
                  const showGoldMessage = isGoldTier && hoveredGoldTier === numericAmount

                  return (
                    <div key={amount} className="relative">
                      <button
                        onClick={() => {
                          const quantityValue = amount === "Custom" ? "Custom" : numericAmount.toString()
                          handleQuantityChange(quantityValue)
                        }}
                        onMouseEnter={() => {
                          if (isGoldTier) {
                            setHoveredGoldTier(numericAmount)
                          }
                        }}
                        onMouseLeave={() => {
                          if (isGoldTier) {
                            setHoveredGoldTier(null)
                          }
                        }}
                        className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-500 border group backdrop-blur-md overflow-hidden
                          ${
                            isSelected
                              ? isGoldTier
                                ? "bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-yellow-600/30 text-yellow-100 font-medium border-yellow-400/60 button-selected shadow-lg shadow-yellow-500/20"
                                : "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                              : isGoldTier && hoveredGoldTier === numericAmount
                                ? "bg-gradient-to-r from-yellow-500/20 via-amber-400/20 to-yellow-600/20 text-yellow-100 border-yellow-400/40 shadow-lg shadow-yellow-500/10"
                                : "hover:bg-white/10 border-white/20 text-white/80"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{amount}</span>
                          
                          {isGoldTier && <span className="text-yellow-400">👑</span>}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {area > 0 && amount !== "Custom" && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-lg border relative
                                ${
                                  (selectedQuantity === numericAmount.toString()) ||
                                  (selectedQuantity === "Custom" && amount === "Custom")
                                    ? "text-white"
                                    : "text-green-200"
                                }`}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  backdropFilter: 'blur(12px)'
                                }}
                              >
                                ${calculatePrice(numericAmount, area, false).total.toFixed(2)}
                              </span>
                            )}
                            {pricePerEach && amount !== "Custom" && (
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-lg border text-purple-200 relative"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                                  border: '1px solid rgba(147, 51, 234, 0.4)',
                                  backdropFilter: 'blur(12px)'
                                }}
                              >
                                {pricePerEach}
                              </span>
                            )}
                          </div>
                          <div className="min-w-[60px] text-right">
                            {percentOff && (
                              <span
                                className={`text-sm font-medium
                                ${(selectedQuantity === numericAmount.toString()) || (selectedQuantity === "Custom" && amount === "Custom") ? "text-green-300" : "text-green-300"}`}
                              >
                                {percentOff}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Gold Tier Message - Animated Flip Overlay */}
                        {showGoldMessage && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-xl flex items-center justify-center backdrop-blur-md border border-yellow-400/60 z-50">
                            <div className="text-center px-1 sm:px-2 md:px-4 lg:px-6">
                              <div className="text-xs sm:text-sm font-bold text-yellow-100 flex items-center justify-center gap-1 sm:gap-2">
                                <span>🎉</span>
                                <span className="hidden sm:inline">FREE Overnight Shipping!</span>
                                <span className="sm:hidden">FREE Overnight!</span>
                                <span>🎉</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>


                    </div>
                  )
                })}
              </div>
              {selectedQuantity === "Custom" && (
                <div className="mt-3 space-y-2 relative">
                  <input
                    type="number"
                    placeholder="Enter custom quantity (min 15)"
                    value={customQuantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-yellow-400 backdrop-blur-md button-interactive [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  
                  {/* Minimum quantity error message */}
                  {showMinQuantityError && (
                    <div className="text-red-400 text-sm mt-1">
                      15 is the minimum order quantity
                    </div>
                  )}
                  
                  {/* Custom Quantity Gold Message */}
                  {showCustomGoldMessage && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-lg flex items-center justify-center backdrop-blur-md border border-yellow-400/60 z-50">
                      <div className="text-center px-1 sm:px-2 md:px-4 lg:px-6 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-yellow-100 flex items-center justify-center gap-1 sm:gap-2">
                          <span>🎉</span>
                          <span className="hidden sm:inline">FREE Overnight Shipping!</span>
                          <span className="sm:hidden">FREE Overnight!</span>
                          <span>🎉</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCustomGoldMessage(false)}
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-yellow-100 hover:text-white hover:bg-yellow-600/30 rounded-full transition-colors cursor-pointer text-xs sm:text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
              {totalPrice && (
                <div className={`mt-3 space-y-1 ${showSizeWarning ? 'opacity-40' : ''}`}>
                  {/* Wholesale pricing display */}
                  {isWholesaleApproved() && totalPrice && !showSizeWarning && (
                    <div className="mb-3 p-3 rounded-lg text-sm"
                         style={{
                           background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                           border: '1px solid rgba(34, 197, 94, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-white/80">
                          <span>Competitive Price:</span>
                          <span>{totalPrice}</span>
                        </div>
                        <div className="flex justify-between items-center text-orange-300 font-medium">
                          <span>Aggressive Price:</span>
                          <span>${(parseFloat(totalPrice.replace('$', '')) * 1.3).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-300 font-medium">
                          <span>Homerun Price:</span>
                          <span>${(parseFloat(totalPrice.replace('$', '')) * 1.5).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-300 font-medium">
                          <span>Your Price:</span>
                          <span>${calculateWholesaleDiscount(parseFloat(totalPrice.replace('$', ''))).finalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    {/* For wholesale accounts, flip the layout */}
                    {isWholesaleApproved() && !showSizeWarning ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-lg border text-purple-200 relative"
                            style={{
                              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                              border: '1px solid rgba(147, 51, 234, 0.4)',
                              backdropFilter: 'blur(12px)'
                            }}
                          >
                            {(() => {
                              const originalPrice = parseFloat(totalPrice.replace('$', ''));
                              const finalPrice = calculateWholesaleDiscount(originalPrice).finalPrice;
                              const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity);
                              return `$${(finalPrice / quantity).toFixed(2)}/ea.`;
                            })()}
                          </span>
                          {(() => {
                            const area = calculateArea(selectedSize, customWidth, customHeight)
                            const qty = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
                            
                            if (area > 0 && qty > 0) {
                              let discount = 0
                              if (realPricingData && realPricingData.quantityDiscounts && qty > 50) {
                                let applicableQuantity = 50;
                                for (const row of realPricingData.quantityDiscounts) {
                                  if (qty >= row.quantity) {
                                    applicableQuantity = row.quantity;
                                  } else {
                                    break;
                                  }
                                }
                                
                                const quantityRow = realPricingData.quantityDiscounts.find(row => row.quantity === applicableQuantity);
                                if (quantityRow) {
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
                                  discount = discountDecimal * 100;
                                }
                              }
                              
                              if (discount > 0.5) {
                                return (
                                  <span className="text-sm font-medium text-green-300">
                                    {Math.round(discount)}% off
                                  </span>
                                )
                              }
                            }
                            return null
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-white/80">Total:</span>
                          <span className="text-lg font-medium text-green-200">
                            ${calculateWholesaleDiscount(parseFloat(totalPrice.replace('$', ''))).finalPrice.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Regular customer layout */
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-white/80">Total:</span>
                          <span className={`text-lg font-medium ${
                            showSizeWarning 
                              ? 'text-blue-200' 
                              : 'text-green-200'
                          }`}>
                            {showSizeWarning ? 'Invalid custom size' : totalPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-lg border relative ${
                              showSizeWarning
                                ? 'text-blue-200'
                                : 'text-purple-200'
                            }`}
                            style={{
                              background: showSizeWarning 
                                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                              border: showSizeWarning
                                ? '1px solid rgba(59, 130, 246, 0.4)'
                                : '1px solid rgba(147, 51, 234, 0.4)',
                              backdropFilter: 'blur(12px)'
                            }}
                          >
                            {showSizeWarning ? 'Invalid size' : costPerSticker}
                          </span>
                          {(() => {
                            const area = calculateArea(selectedSize, customWidth, customHeight)
                            const qty = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
                            
                            if (area > 0 && qty > 0) {
                              let discount = 0
                              if (realPricingData && realPricingData.quantityDiscounts && qty > 50) {
                                let applicableQuantity = 50;
                                for (const row of realPricingData.quantityDiscounts) {
                                  if (qty >= row.quantity) {
                                    applicableQuantity = row.quantity;
                                  } else {
                                    break;
                                  }
                                }
                                
                                const quantityRow = realPricingData.quantityDiscounts.find(row => row.quantity === applicableQuantity);
                                if (quantityRow) {
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
                                  discount = discountDecimal * 100;
                                }
                              }
                              
                              if (discount > 0.5) {
                                return (
                                  <span className="text-sm font-medium text-green-300">
                                    {Math.round(discount)}% off
                                  </span>
                                )
                              }
                            }
                            return null
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Store Credit Notification */}
                  {totalPrice && !showSizeWarning && (
                    <div className="mt-2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left"
                         style={{
                           background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                           border: '1px solid rgba(255, 215, 0, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <span className="flex items-center justify-start gap-1.5 text-yellow-200">
                        <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                        alt="Credits" 
                        className="w-5 h-5 object-contain text-yellow-300"
                      />
                        You'll earn ${(() => {
                          const originalPrice = parseFloat(totalPrice.replace('$', ''));
                          const finalPrice = isWholesaleApproved() 
                            ? calculateWholesaleDiscount(originalPrice).finalPrice 
                            : originalPrice;
                          return (finalPrice * getCreditRate()).toFixed(2);
                        })()} in store credit on this order!
                      </span>
                    </div>
                  )}
                  {/* Reserve space for rush order fee text to prevent layout shift */}
                  <div className="h-4 mb-2">
                    {isRushOrder && (
                      <div className="text-xs text-red-300 font-medium transition-opacity duration-300">
                        *Rush Order Fee Applied
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kiss Cut Options Section */}
          <div className="mb-6 hidden md:block">
            <div className="container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-blue-400">✂️</span>
                Kiss Cut Total
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1-4 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("1-4")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "1-4"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      1-4 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Perfect for simple designs with just a few individual stickers per sheet.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-green-400 font-medium">✅ Standard Pricing</span>
                  </div>
                  {selectedKissOption === "1-4" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* 5-8 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("5-8")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "5-8"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      5-8 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Great for medium complexity sheets with multiple sticker designs.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+5% pricing</span>
                  </div>
                  {selectedKissOption === "5-8" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* 9-12 Cuts */}
                <button
                  onClick={() => setSelectedKissOption("9-12")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedKissOption === "9-12"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">✂️</div>
                    <h3 className="font-semibold text-white">
                      9-12 Cuts
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Ideal for complex sheets with many individual stickers and detailed layouts.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+10% pricing</span>
                  </div>
                  {selectedKissOption === "9-12" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>
              </div>

              
            </div>
          </div>

          {/* Vibrancy Enhancement Section */}
          <div className="mb-6">
            <div className="container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-purple-400">🎨</span>
                Vibrancy Enhancement
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard */}
                <button
                  onClick={() => setVibrancyBoost(false)}
                  className={`button-interactive relative text-left px-4 py-3 rounded-xl transition-all border backdrop-blur-md
                    ${
                      !vibrancyBoost
                        ? "bg-gray-500/20 text-gray-200 font-medium button-selected"
                        : "border-2 border-dashed border-gray-400/50 opacity-65 hover:border-gray-400/70 hover:bg-white/5 hover:opacity-80 text-white/70"
                    }`}
                  style={{
                    border: !vibrancyBoost ? '1.5px solid rgba(107, 114, 128, 0.5)' : undefined
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚪</span>
                    <span className="font-medium">Standard Colors</span>
                  </div>
                  {!vibrancyBoost && (
                    <span className="absolute top-1 right-2 text-[10px] text-gray-300 font-medium">Selected</span>
                  )}
                </button>

                {/* +25% Vibrancy */}
                <button
                  onClick={() => setVibrancyBoost(true)}
                  className={`button-interactive relative text-left px-4 py-3 rounded-xl transition-all border backdrop-blur-md
                    ${
                      vibrancyBoost
                        ? "bg-purple-500/20 text-purple-200 font-medium button-selected animate-glow-purple"
                        : "border-2 border-dashed border-purple-400/50 opacity-65 hover:border-purple-400/70 hover:bg-white/5 hover:opacity-80 text-white/70"
                    }`}
                  style={{
                    border: vibrancyBoost ? '1.5px solid rgba(168, 85, 247, 0.5)' : undefined
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎨</span>
                    <span className="font-medium">+25% Vibrancy (+5%)</span>
                  </div>
                  {vibrancyBoost && (
                    <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">Selected</span>
                  )}
                </button>
              </div>

              {/* Vibrancy Disclaimer */}
              {vibrancyBoost && (
                <div className="mt-3 p-3 rounded-lg text-xs text-white/70 leading-relaxed"
                     style={{
                       background: 'rgba(168, 85, 247, 0.1)',
                       border: '1px solid rgba(168, 85, 247, 0.2)'
                     }}>
                  <span className="text-purple-300 font-medium">🎨 Note:</span> Vibrancy enhancement uses advanced color saturation techniques. Returns due to color accuracy differences are not eligible when this option is selected.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mb-4 lg:mb-6">
            {/* Single Wide Container for Artwork Upload, Additional Instructions, and Proof Options */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Artwork Upload & Additional Instructions */}
                <div>
      
                  
                  {/* Hidden file input - always present */}
                  <input
                    id="file-input"
                    type="file"
                    accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.zip"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload artwork file"
                  />

                  {!uploadedFile ? (
                    <div 
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      
                      {isUploading ? (
                        <div className="mb-4">
                          <div className="text-4xl mb-3">⏳</div>
                          <p className="text-white font-medium text-base mb-2">Uploading...</p>
                          {uploadProgress && (
                            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                              <div 
                                className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.percentage}%` }}
                              ></div>
                            </div>
                          )}
                          {uploadProgress && (
                            <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                          )}
                        </div>
                      ) : (
                        <div className="mb-4">
                          <div className="mb-3 flex justify-center -ml-4">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                              alt="Upload file" 
                              className="w-20 h-20 object-contain"
                            />
                          </div>
                          <p className="text-white font-medium text-base mb-2 hidden md:block">Drag or click to upload your file</p>
                          <p className="text-white font-medium text-base mb-2 md:hidden">Tap to add file</p>
                          <p className="text-white/80 text-sm">All formats supported. Max file size: 25MB <span className="hidden sm:inline">|</span> 1 file per order</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-green-400/50 rounded-xl p-4 bg-green-500/10 backdrop-blur-md">
                      {/* Responsive Layout: Vertical on mobile, Horizontal on desktop */}
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Image Preview - Full width on mobile, fixed size on desktop */}
                        <div className="w-full h-48 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md p-3 flex items-center justify-center flex-shrink-0">
                          <AIFileImage
                            src={uploadedFile.secure_url}
                            filename={uploadedFile.original_filename}
                            alt={uploadedFile.original_filename}
                            className="w-full h-full object-contain"
                            size="preview"
                            showFileType={false}
                          />
                        </div>

                        {/* File Info - Below image on mobile, right side on desktop */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="text-green-400 text-xl">📎</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-green-200 font-medium break-words text-lg">{uploadedFile.original_filename}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => document.getElementById('file-input')?.click()}
                                className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Replace file"
                              >
                                🔄
                              </button>
                              <button
                                onClick={removeUploadedFile}
                                className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* File Details */}
                          <div className="space-y-2 mb-3">
                            <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-sm">
                              <span className="flex items-center gap-1">
                                <span className="text-green-400">📏</span>
                                {(uploadedFile.bytes / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-green-400">🎨</span>
                                {uploadedFile.format.toUpperCase()}
                              </span>
                              {uploadedFile.width && uploadedFile.height && (
                                <span className="flex items-center gap-1">
                                  <span className="text-green-400">📐</span>
                                  {uploadedFile.width}x{uploadedFile.height}px
                                </span>
                              )}
                            </div>
                            
                            {/* File Type Icon */}
                            {getFileTypeIcon(uploadedFile.format) && (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={getFileTypeIcon(uploadedFile.format)!} 
                                  alt={`${uploadedFile.format.toUpperCase()} file`}
                                  className="w-6 h-6 object-contain opacity-80"
                                />
                                <span className="text-xs text-green-300/60">
                                  Professional design file detected
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Upload Success Message */}
                          <div className="flex items-center gap-2 text-green-300 text-sm">
                            <span className="text-green-400">✅</span>
                            <span>File uploaded successfully!</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                      <p className="text-red-200 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        {uploadError}
                      </p>
                    </div>
                  )}
                  
                  {!uploadedFile && (
                    <div className="mt-4 flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                         style={{
                           background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                           border: '1px solid rgba(147, 51, 234, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <button
                        onClick={() => setUploadLater(!uploadLater)}
                        disabled={!!uploadedFile}
                        title={uploadLater ? "Disable upload later" : "Enable upload later"}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          uploadLater ? 'bg-purple-500' : 'bg-white/20'
                        } ${uploadedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          uploadLater ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <label className={`text-sm font-medium ${uploadedFile ? 'text-white/50' : 'text-purple-200'}`}>
                        Upload Artwork Later
                      </label>
                    </div>
                  )}
                  {uploadLater && !uploadedFile && (
                    <div className="mt-2 text-white/80 text-sm italic flex items-center">
                      <span role="img" aria-label="caution" className="mr-1">
                        ⚠️
                      </span>
                      Note: Please try to have your artwork submitted within 48hrs of placing an order.
                    </div>
                  )}
                </div>

                {/* Right Column - Options */}
                <div className="space-y-4">
                  {/* Proof Options */}
                  <div>

                    
                    {/* Proof Toggle */}
                    <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                         style={{
                           background: sendProof 
                             ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)'
                             : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 50%, rgba(239, 68, 68, 0.05) 100%)',
                           border: sendProof 
                             ? '1px solid rgba(34, 197, 94, 0.4)'
                             : '1px solid rgba(239, 68, 68, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <button
                        onClick={() => setSendProof(!sendProof)}
                        title={sendProof ? "Don't send proof" : "Send free proof"}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          sendProof ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          sendProof ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <label className={`text-sm font-medium ${sendProof ? 'text-green-200' : 'text-red-200'}`}>
                        {sendProof ? '✅ Send FREE Proof' : '❌ Don\'t Send Proof'}
                      </label>
                    </div>
                    
                    {!sendProof && (
                      <div className="mt-4 text-sm text-red-200/80">
                        <p>Your order will proceed directly to production without proof approval. This speeds up delivery time.</p>
                      </div>
                    )}
                  </div>

                  {/* Rush Order Toggle */}
                  <div>
                    <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium relative"
                         style={{
                           background: isRushOrder 
                             ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 50%, rgba(239, 68, 68, 0.05) 100%)'
                             : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.05) 100%)',
                           border: isRushOrder 
                             ? '1px solid rgba(239, 68, 68, 0.4)'
                             : '1px solid rgba(59, 130, 246, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <button
                        onClick={() => updateAllItemsRushOrder(!isRushOrder)}
                        title={isRushOrder ? "Disable rush order for all cart items" : "Enable rush order for all cart items"}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          isRushOrder ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          isRushOrder ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <div className="flex-1">
                        <label className={`text-sm font-medium ${isRushOrder ? 'text-red-200' : 'text-blue-200'}`}>
                          {isRushOrder ? '🚀 Rush Order (+40%)' : '🕒 Standard Production Time'}
                        </label>
                        {isRushOrder && (
                          <div className="text-xs text-orange-200 mt-1 font-medium">
                            🛒 Applied to entire cart
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Rush Order Disclaimer - right under rush order toggle */}
                    {isRushOrder && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-orange-300 font-medium flex items-center gap-2">
                          <span>⚡</span>
                          <span>Rush order is now active for ALL items in your cart (+40% to each item)</span>
                        </div>
                        <div className="text-xs text-white/70 leading-relaxed">
                          *Rush Orders are prioritized in our production queue and completed within 24 hours. Orders under 3,000 stickers are usually completed on time. If you have a tight deadline or specific concerns, feel free to contact us.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instagram Post Option */}
                  <div>
                    <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                         style={{
                           background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                           border: '1px solid rgba(147, 51, 234, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <button
                        onClick={() => setPostToInstagram(!postToInstagram)}
                        title={postToInstagram ? "Disable Instagram posting" : "Enable Instagram posting"}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          postToInstagram ? 'bg-purple-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          postToInstagram ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <Instagram className="h-5 w-5 text-purple-400" />
                      <label className="text-sm font-medium text-purple-200">
                        Post this order to Instagram
                      </label>
                      <div className="relative info-tooltip-container">
                        <span 
                          className="text-purple-300 cursor-pointer text-sm font-medium select-none hover:text-purple-200 transition-colors"
                          onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                        >
                          ⓘ
                        </span>
                        {showInfoTooltip && (
                          <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 z-50 w-72 sm:w-64">
                            <div className="text-white text-xs rounded-lg px-3 py-2 whitespace-normal" style={{
                              background: 'rgba(30, 41, 59, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                              backdropFilter: 'blur(12px)'
                            }}>
                              We may still post your order on Instagram even if not selected, put in the notes below if you explicitly don't want us to post your order.
                              <div className="absolute top-full right-4 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Instagram handle input - right under Instagram toggle */}
                    {postToInstagram && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xl">@</span>
                          <div className="flex-grow p-3 rounded-lg backdrop-blur-md"
                               style={{
                                 background: 'rgba(255, 255, 255, 0.05)',
                                 border: '1px solid rgba(255, 255, 255, 0.1)',
                                 boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                               }}>
                            <input
                              type="text"
                              placeholder="Enter your Instagram handle"
                              value={instagramHandle}
                              onChange={(e) => setInstagramHandle(e.target.value)}
                              className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all border-0"
                            />
                          </div>
                        </div>
                        <div className="text-xs text-white/70 italic">
                          You are opting in to let Sticker Shuttle post and tag you in the making of your stickers on their Instagram.
                        </div>
                        <div className="text-xs">
                          <a 
                            href="https://www.instagram.com/stickershuttle/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-300 hover:text-purple-200 underline"
                          >
                            Follow @stickershuttle • 24.9k followers
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Instructions Section - moved here */}
                  <div>
                    <div className="p-3 rounded-xl backdrop-blur-md"
                         style={{
                           background: 'rgba(255, 255, 255, 0.05)',
                           border: '1px solid rgba(255, 255, 255, 0.1)',
                           boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                         }}>
                      <textarea
                        value={additionalNotes}
                        onChange={(e) => {
                          setAdditionalNotes(e.target.value);
                          // Auto-expand functionality
                          setTimeout(() => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.max(50, e.target.scrollHeight) + 'px';
                          }, 0);
                        }}
                        className="w-full min-h-[50px] rounded-xl border-0 p-3 resize-none bg-transparent text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all appearance-none overflow-hidden"
                        placeholder={isMobile ? "Additional instructions here..." : "Enter any additional instructions here..."}
                        style={{ 
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          height: additionalNotes ? 'auto' : '50px',
                          minHeight: '50px',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Conditional Button Display */}
            {!totalPrice || (!uploadedFile && !uploadLater) ? (
              /* Single Upload Required Button */
              <button 
                disabled={true}
                className="w-full py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#666',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {!totalPrice ? "Please Configure Your Order Above" : "Please Upload Artwork or Select Upload Later"}
                </span>
              </button>
            ) : (
              /* Dual Buttons */
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Add to Cart & Keep Shopping Button - Full width on mobile, 80% on desktop */}
                <button 
                  onClick={handleAddToCartAndKeepShopping}
                  className="w-full sm:w-4/5 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.0025] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                    color: '#030140',
                    fontWeight: 'bold',
                    border: '0.03125rem solid #e6c211',
                    boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)'
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add & Keep Shopping</span>
                    <span className="sm:hidden">Add & Keep Shopping</span>
                  </span>
                </button>

                {/* Checkout Button - Full width on mobile, 20% on desktop */}
                <button 
                  onClick={handleCheckout}
                  className="w-full sm:w-1/5 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.025] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Checkout</span>
                  </span>
                </button>
              </div>
            )}

            {/* Helpful text */}
            <div className="text-center py-2">
              <p className="text-white/60 text-sm">
                {!totalPrice || (!uploadedFile && !uploadLater) 
                  ? "Complete your configuration to proceed"
                  : "Items will be added to your cart for review before checkout"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}