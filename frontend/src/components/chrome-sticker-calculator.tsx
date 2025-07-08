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

interface ChromeStickerCalculatorProps {
  initialBasePricing: BasePricing[]
  realPricingData?: {
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null
}

export default function ChromeStickerCalculator({ initialBasePricing, realPricingData }: ChromeStickerCalculatorProps) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [basePricing, setBasePricing] = useState<BasePricing[]>(initialBasePricing)
  const [selectedCut, setSelectedCut] = useState("Custom Shape")
  const [selectedMaterial, setSelectedMaterial] = useState("Matte")
  const [selectedSize, setSelectedSize] = useState('Medium (3")')
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState("100")
  const [customQuantity, setCustomQuantity] = useState("")
  const [selectedWhiteOption, setSelectedWhiteOption] = useState("color-only")
  const [sendProof, setSendProof] = useState(true)
  const [uploadLater, setUploadLater] = useState(false)
  const [rushOrder, setRushOrder] = useState(false)
  const [totalPrice, setTotalPrice] = useState("")
  const [costPerSticker, setCostPerSticker] = useState("")

  const [postToInstagram, setPostToInstagram] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [hoveredGoldTier, setHoveredGoldTier] = useState<number | null>(null)
  const [showCustomGoldMessage, setShowCustomGoldMessage] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // User and profile states
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Check for mobile on component mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    if (!profile) return 0.05; // Default 5% for non-logged in users
    
    // Check if user is wholesale and approved
    if (profile.is_wholesale_customer && profile.wholesale_status === 'approved') {
      return profile.wholesale_credit_rate || 0.025; // Use profile rate or default 2.5%
    }
    
    return 0.05; // Default 5% for regular users
  }

  // Check if user is wholesale approved
  const isWholesaleApproved = () => {
    if (!profile) return false;
    return profile.is_wholesale_customer && profile.wholesale_status === 'approved';
  }

  // Calculate wholesale discount (15% off)
  const calculateWholesaleDiscount = (originalPrice: number) => {
    if (!isWholesaleApproved()) return { discountAmount: 0, finalPrice: originalPrice };
    
    const discountAmount = originalPrice * 0.15; // 15% discount
    const finalPrice = originalPrice - discountAmount;
    
    return { discountAmount, finalPrice };
  }

  // Auto-expand textarea when additionalNotes changes
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder*="instructions"]') as HTMLTextAreaElement;
    if (textarea && additionalNotes) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(50, textarea.scrollHeight) + 'px';
    }
  }, [additionalNotes])

  // Reset Instagram options for wholesale users
  useEffect(() => {
    if (isWholesaleApproved() && postToInstagram) {
      setPostToInstagram(false);
      setInstagramHandle('');
    }
  }, [profile, postToInstagram])

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

  // Extract size in inches from size string
  const getSizeInInches = (sizeString: string) => {
    // Defensive check for undefined or null sizeString
    if (!sizeString) {
      console.warn('getSizeInInches: sizeString is undefined, using default 3 inches');
      return 3;
    }
    
    if (sizeString === "Custom size") return 0
    
    // Handle new format: "Small (2″ × 2″)"
    if (sizeString.includes('Small')) return 2
    if (sizeString.includes('Medium')) return 3
    if (sizeString.includes('Large') && !sizeString.includes('X-Large')) return 4
    if (sizeString.includes('X-Large')) return 5
    
    // Fallback to old format
    try {
      const match = sizeString.match(/(\d+)"/)
      return match ? Number.parseInt(match[1]) : 3
    } catch (error) {
      console.warn('getSizeInInches: Error parsing size string:', error);
      return 3
    }
  }

  const updatePricing = useCallback(() => {
    // Skip if component not mounted or during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    const area = calculateArea(selectedSize, customWidth, customHeight)
    const quantity =
      selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)

    console.log(`\n--- Pricing Update ---`)
    console.log(`Size: ${selectedSize}, Custom Width: ${customWidth}, Custom Height: ${customHeight}`)
    console.log(`Calculated Area: ${area.toFixed(2)} sq inches`)
    console.log(`Quantity: ${quantity}`)

    if (area > 0 && quantity > 0) {
      const { total, perSticker } = calculatePrice(quantity, area, rushOrder)
      console.log(`Total Price: $${total.toFixed(2)}`)
      console.log(`Price Per Sticker: $${perSticker.toFixed(2)}`)
      setTotalPrice(`$${total.toFixed(2)}`)
      setCostPerSticker(`$${perSticker.toFixed(2)}/ea.`)
    } else {
      console.log("Invalid area or quantity, pricing not calculated")
      setTotalPrice("")
      setCostPerSticker("")
    }
  }, [selectedSize, customWidth, customHeight, selectedQuantity, customQuantity, selectedWhiteOption, rushOrder])

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
          console.log('🔄 Loading reorder data for chrome stickers...');
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
                setSelectedWhiteOption(selections.whiteOption.displayValue);
              }
              if (selections.rush?.value === true) {
                setRushOrder(true);
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
      console.warn('calculateArea: size is undefined or not a string, using default Medium', size);
      return PRESET_SIZES.medium.sqInches; // Default to 9 sq in
    }
    
    if (size === "Custom size") {
      const w = Number.parseFloat(customW) || 0
      const h = Number.parseFloat(customH) || 0
      const area = calculateSquareInches(w, h)
      console.log(`Custom size: ${w}" x ${h}", Area: ${area.toFixed(2)} sq inches`)
      return area
    }
    
    // Use preset sizes for accurate square inch calculation
    if (size.includes('Small')) return PRESET_SIZES.small.sqInches // 4 sq in (2" × 2")
    if (size.includes('Medium')) return PRESET_SIZES.medium.sqInches // 9 sq in (3" × 3")
    if (size.includes('Large') && !size.includes('X-Large')) return PRESET_SIZES.large.sqInches // 16 sq in (4" × 4")
    if (size.includes('X-Large')) return PRESET_SIZES.xlarge.sqInches // 25 sq in (5" × 5")
    
    // Fallback calculation
    const sizeInches = getSizeInInches(size)
    const area = sizeInches * sizeInches
    console.log(`Standard size: ${sizeInches}", Area: ${area.toFixed(2)} sq inches`)
    return area
  }

  const calculatePrice = (qty: number, area: number, rushOrder: boolean) => {
    let totalPrice = 0
    let pricePerSticker = 0

    // Get white option pricing modifier
    const whiteOptionModifiers = {
      'color-only': 1.0,
      'partial-white': 1.05,
      'full-white': 1.1
    };
    const whiteOptionMultiplier = whiteOptionModifiers[selectedWhiteOption as keyof typeof whiteOptionModifiers] || 1.0;

    // Try to use real pricing data first
    if (realPricingData && realPricingData.basePricing && realPricingData.quantityDiscounts) {
      console.log('Using real pricing data for calculation');
      
      const realResult = calculateRealPrice(
        realPricingData.basePricing,
        realPricingData.quantityDiscounts,
        area,
        qty,
        rushOrder
      );
      
      // Apply 15% price increase for chrome stickers
      const chromeMultiplier = 1.15;
      const adjustedTotal = realResult.totalPrice * whiteOptionMultiplier * chromeMultiplier;
      const adjustedPerSticker = realResult.finalPricePerSticker * whiteOptionMultiplier * chromeMultiplier;
      
      console.log(`Real Pricing - Quantity: ${qty}, Area: ${area}, White Option: ${selectedWhiteOption} (${whiteOptionMultiplier}x), Total: $${adjustedTotal.toFixed(2)}, Per sticker: $${adjustedPerSticker.toFixed(2)}`);
      
      return {
        total: adjustedTotal,
        perSticker: adjustedPerSticker
      };
    }

    // Fallback to legacy pricing calculation
    console.log('Using legacy pricing calculation');
    
    // Use proportional pricing based on area
    const basePrice = 1.36 // Base price per sticker for 3" (9 sq inches)
    const baseArea = 9 // 3" x 3" = 9 sq inches

    // Scale base price by area
    const scaledBasePrice = basePrice * (area / baseArea)

    // Apply quantity discounts (same discount structure for all sizes)
    const discountMap: { [key: number]: number } = {
      50: 1.0, // No discount
      100: 0.647, // 35.3% discount
      200: 0.463, // 53.7% discount
      300: 0.39, // 61% discount
      500: 0.324, // 67.6% discount
      750: 0.24, // 76% discount (uses 500 tier from CSV)
      1000: 0.19, // 81% discount (uses 1000 tier from CSV)
      2500: 0.213, // 78.7% discount
    }

    // Find the appropriate quantity tier (use lower tier as per CSV note)
    // "Any quantities or square inches between these values default to the lowest displayed value"
    let applicableQuantity = 50; // Default to lowest tier
    const quantityTiers = [50, 100, 200, 300, 500, 750, 1000, 2500];
    
    for (const tier of quantityTiers) {
      if (qty >= tier) {
        applicableQuantity = tier;
      } else {
        break;
      }
    }

    const discountMultiplier = discountMap[applicableQuantity] || 1.0
    pricePerSticker = scaledBasePrice * discountMultiplier * whiteOptionMultiplier
    totalPrice = pricePerSticker * qty

    if (rushOrder) {
      totalPrice *= 1.4 // Add 40% for rush orders
      pricePerSticker *= 1.4
    }

    console.log(
      `Legacy Pricing - Quantity: ${qty}, Area: ${area}, White Option: ${selectedWhiteOption} (${whiteOptionMultiplier}x), Total price: $${totalPrice.toFixed(2)}, Price per sticker: $${pricePerSticker.toFixed(2)}`,
    )

    return {
      total: totalPrice,
      perSticker: pricePerSticker,
    }
  }

  const handleSizeChange = (size: string) => {
    setSelectedSize(size)
    if (size !== "Custom size") {
      setCustomWidth("")
      setCustomHeight("")
    }
  }

  const handleCustomSizeChange = (dimension: "width" | "height", value: string) => {
    if (dimension === "width") {
      setCustomWidth(value)
    } else {
      setCustomHeight(value)
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
    
    // Show gold message for quantities 1,000+
    const qty = Number.parseInt(value) || 0
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
        customWidth: customWidth || undefined,
        customHeight: customHeight || undefined,
        selectedQuantity,
        customQuantity: customQuantity || undefined,
        sendProof,
        uploadLater,
        rushOrder,
        postToInstagram,
        instagramHandle: instagramHandle || undefined,
        totalPrice: totalPrice || undefined,
        costPerSticker: costPerSticker || undefined,
        calculatedArea: area > 0 ? area : undefined
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
    const { total, perSticker } = calculatePrice(quantity, area, rushOrder);

    return {
      id: generateCartItemId(),
      product: {
        id: "chrome-stickers",
        sku: "SS-CS-001",
        name: "Chrome Stickers",
        category: "chrome-stickers" as const,
        description: "Custom chrome stickers with reflective metallic finish",
        shortDescription: "Chrome stickers with mirror-like brilliance",
        basePrice: perSticker,
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
        productId: "chrome-stickers",
        selections: {
          cut: { type: "shape" as const, value: selectedCut, displayValue: selectedCut, priceImpact: 0 },
          material: { type: "finish" as const, value: selectedMaterial, displayValue: selectedMaterial, priceImpact: 0 },
          size: { 
            type: "size-preset" as const, 
            value: selectedSize === "Custom size" ? `${customWidth}"x${customHeight}"` : selectedSize,
            displayValue: selectedSize === "Custom size" ? `${customWidth}"x${customHeight}"` : selectedSize,
            priceImpact: 0 
          },
          whiteOption: { 
            type: "white-base" as const, 
            value: selectedWhiteOption, 
            displayValue: selectedWhiteOption === "color-only" ? "Color Only" : 
                         selectedWhiteOption === "partial-white" ? "Partial White Ink" : 
                         selectedWhiteOption === "full-white" ? "Full White Ink" : selectedWhiteOption, 
            priceImpact: 0 
          },
          proof: { type: "finish" as const, value: sendProof, displayValue: sendProof ? "Send Proof" : "No Proof", priceImpact: 0 },
          rush: { type: "finish" as const, value: rushOrder, displayValue: rushOrder ? "Rush Order" : "Standard", priceImpact: rushOrder ? total * 0.4 : 0 },
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
      unitPrice: perSticker,
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
                {["Custom Shape", "Circle", "Oval", "Rectangle", "Square"].map((cut) => (
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
                    {cut}
                    {cut === "Custom Shape" && (
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
                {['Small (2")', 'Medium (3")', 'Large (4")', 'X-Large (5")', "Custom size"].map((size) => (
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
                    {size === 'Medium (3")' && (
                      <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">
                        Most Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {selectedSize === "Custom size" && (
                <div className="mt-3 flex gap-3">
                  <input
                    type="text"
                    placeholder="W"
                    value={customWidth}
                    onChange={(e) => handleCustomSizeChange("width", e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive"
                  />
                  <input
                    type="text"
                    placeholder="H"
                    value={customHeight}
                    onChange={(e) => handleCustomSizeChange("height", e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive"
                  />
                </div>
              )}
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
                {["50", "100", "200", "300", "500", "750", "1,000", "2,500", "Custom"].map((amount) => {
                  const numericAmount = Number.parseInt(amount.replace(",", ""))
                  const area = calculateArea(selectedSize, customWidth, customHeight)

                  // Get pricing for current size
                  let pricePerEach = ""
                  let percentOff = ""

                  if (area > 0 && amount !== "Custom") {
                    const currentPricing = calculatePrice(numericAmount, area, false)
                    const { perSticker } = currentPricing
                    
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

                    pricePerEach = `$${perSticker.toFixed(2)}/ea.`
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
                    placeholder="Enter custom quantity"
                    value={customQuantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-yellow-400 backdrop-blur-md button-interactive [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  
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
                <div className="mt-3 space-y-1">
                  {/* Wholesale pricing display */}
                  {isWholesaleApproved() && totalPrice && (
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
                    {isWholesaleApproved() ? (
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
                          <span className="text-lg font-medium text-green-200">
                            {totalPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-lg border text-purple-200 relative"
                            style={{
                              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                              border: '1px solid rgba(147, 51, 234, 0.4)',
                              backdropFilter: 'blur(12px)'
                            }}
                          >
                            {costPerSticker}
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
                  {totalPrice && (
                    <div className="mt-2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left"
                         style={{
                           background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                           border: '1px solid rgba(255, 215, 0, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <span className="flex items-center justify-start gap-1.5 text-yellow-200">
                        <i className="fas fa-coins text-yellow-300"></i>
                        You'll earn ${(parseFloat(totalPrice.replace('$', '')) * getCreditRate()).toFixed(2)} in store credit on this order!
                      </span>
                    </div>
                  )}
                  {/* Reserve space for rush order fee text to prevent layout shift */}
                  <div className="h-4 mb-2">
                    {rushOrder && (
                      <div className="text-xs text-red-300 font-medium transition-opacity duration-300">
                        *Rush Order Fee Applied
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* White Options Section */}
          <div className="mb-6">
            <div className="container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-blue-400">⚪</span>
                White Options
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Color Only */}
                <button
                  onClick={() => setSelectedWhiteOption("color-only")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedWhiteOption === "color-only"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">🎨</div>
                    <h3 className="font-semibold text-white">
                      Color Only
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Default option. We will only print the colors your provided, minus white.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-green-400 font-medium">✅ Standard Pricing</span>
                  </div>
                  {selectedWhiteOption === "color-only" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* Partial White Ink */}
                <button
                  onClick={() => setSelectedWhiteOption("partial-white")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedWhiteOption === "partial-white"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">👩‍🦳</div>
                    <h3 className="font-semibold text-white">
                      Partial White Ink
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Also a great option when adding specific white elements to your design.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+5% pricing</span>
                  </div>
                  {selectedWhiteOption === "partial-white" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>

                {/* Full White Ink */}
                <button
                  onClick={() => setSelectedWhiteOption("full-white")}
                  className={`button-interactive relative text-left px-4 py-4 rounded-xl transition-all border backdrop-blur-md
                    ${
                      selectedWhiteOption === "full-white"
                        ? "bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="text-2xl mr-3">⚪</div>
                    <h3 className="font-semibold text-white">
                      Full White Ink
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    <strong>Caution:</strong> This is best if you only want the offset border to be holographic.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-400 font-medium">+10% pricing</span>
                  </div>
                  {selectedWhiteOption === "full-white" && (
                    <span className="absolute top-1 right-2 text-[10px] text-blue-300 font-medium">Selected</span>
                  )}
                </button>
              </div>

              
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
                    accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
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
                          <p className="text-white/80 text-sm">All formats supported. Max file size: 25MB | 1 file per order</p>
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
                    <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                         style={{
                           background: rushOrder 
                             ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 50%, rgba(239, 68, 68, 0.05) 100%)'
                             : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.05) 100%)',
                           border: rushOrder 
                             ? '1px solid rgba(239, 68, 68, 0.4)'
                             : '1px solid rgba(59, 130, 246, 0.4)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <button
                        onClick={() => setRushOrder(!rushOrder)}
                        title={rushOrder ? "Switch to standard production" : "Enable rush order"}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          rushOrder ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          rushOrder ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <label className={`text-sm font-medium ${rushOrder ? 'text-red-200' : 'text-blue-200'}`}>
                        {rushOrder ? '🚀 Rush Order (+40%)' : '🕒 Standard Production Time'}
                      </label>
                    </div>
                    
                    {/* Rush Order Disclaimer - right under rush order toggle */}
                    {rushOrder && (
                      <div className="mt-3 text-xs text-white/70 leading-relaxed">
                        *Rush Orders are prioritized in our production queue and completed within 24 hours. Orders under 3,000 stickers are usually completed on time. If you have a tight deadline or specific concerns, feel free to contact us.
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
          <div className="space-y-3 mb-4">
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
                {/* Add to Cart & Keep Shopping Button - 80% width */}
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

                {/* Checkout Button - 20% width */}
                <button 
                  onClick={handleCheckout}
                  className="w-full sm:w-1/5 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.0025] cursor-pointer"
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


