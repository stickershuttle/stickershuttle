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

interface MarketplaceStickerCalculatorProps {
  initialBasePricing: BasePricing[]
  realPricingData?: {
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null
  markupPercentage?: number; // New prop for markup percentage
  productTitle: string; // New prop for product title
  productId: string; // New prop for product ID
}

export default function MarketplaceStickerCalculator({ 
  initialBasePricing, 
  realPricingData, 
  markupPercentage = 0,
  productTitle,
  productId
}: MarketplaceStickerCalculatorProps) {
  const { addToCart, isRushOrder, updateAllItemsRushOrder } = useCart();
  const router = useRouter();
  const [basePricing, setBasePricing] = useState<BasePricing[]>(initialBasePricing)
  // Remove cut options entirely - no selectedCut state
  const [selectedMaterial, setSelectedMaterial] = useState("Matte")
  const [selectedSize, setSelectedSize] = useState('Medium (3")')
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState("100")
  const [customQuantity, setCustomQuantity] = useState("")
  const [sendProof, setSendProof] = useState(true)
  const [uploadLater, setUploadLater] = useState(false)
  // Use global rush order state from cart instead of local state
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

  // Size limit warning state
  const [showSizeWarning, setShowSizeWarning] = useState(false)

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

  // Calculate area based on selected size
  const calculateArea = (size: string, customW?: string, customH?: string): number => {
    if (size === "Custom size") {
      const width = parseFloat(customW || "0")
      const height = parseFloat(customH || "0")
      return width > 0 && height > 0 ? width * height : 0
    }

    // Parse preset sizes
    const match = size.match(/(\d+(?:\.\d+)?)"/)
    if (match) {
      const dimension = parseFloat(match[1])
      return dimension * dimension // Assuming square for simplicity
    }

    return 0
  }

  // Apply markup to pricing
  const applyMarkup = (basePrice: number): number => {
    return basePrice * (1 + markupPercentage / 100)
  }

  // Calculate price with markup
  const calculatePrice = (quantity: number, area: number, rushOrder: boolean = false) => {
    if (!realPricingData || area <= 0 || quantity <= 0) {
      return { total: 0, perSticker: 0 }
    }

    try {
      const pricingResult = calculateRealPrice(
        realPricingData.basePricing,
        realPricingData.quantityDiscounts,
        area,
        quantity,
        rushOrder
      )

      // Apply marketplace markup to the final price
      const markedUpPrice = applyMarkup(pricingResult.finalPricePerSticker)
      const total = markedUpPrice * quantity

      return {
        total: total,
        perSticker: markedUpPrice
      }
    } catch (error) {
      console.error("Pricing calculation error:", error)
      return { total: 0, perSticker: 0 }
    }
  }

  // Update pricing when dependencies change  
  useEffect(() => {
    const area = calculateArea(selectedSize, customWidth, customHeight)
    const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
    
    if (area > 0 && quantity > 0) {
      const { total, perSticker } = calculatePrice(quantity, area, isRushOrder)
      setTotalPrice(`$${total.toFixed(2)}`)
      setCostPerSticker(`$${perSticker.toFixed(2)}`)
    } else {
      setTotalPrice("")
      setCostPerSticker("")
    }
  }, [selectedSize, customWidth, customHeight, selectedQuantity, customQuantity, isRushOrder, realPricingData, markupPercentage])

  const handleQuantityChange = (newQuantity: string) => {
    setSelectedQuantity(newQuantity)
    setShowMinQuantityError(false)
    setShowCustomGoldMessage(false)
    
    // Handle custom quantity validation and gold tier messaging
    if (newQuantity === "Custom") {
      // Reset custom quantity when switching to custom
      setCustomQuantity("")
    }
  }

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value)
    
    const numValue = Number.parseInt(value) || 0
    
    // Check minimum quantity
    if (value && numValue > 0 && numValue < 15) {
      setShowMinQuantityError(true)
    } else {
      setShowMinQuantityError(false)
    }
    
    // Check for gold tier (1000+)
    if (numValue >= 1000) {
      setShowCustomGoldMessage(true)
    } else {
      setShowCustomGoldMessage(false)
    }
  }

  const handleCustomSizeChange = (dimension: "width" | "height", value: string) => {
    const numValue = parseFloat(value) || 0
    const maxSize = user?.email === 'justin@stickershuttle.com' ? 50 : 14
    
    if (value && (numValue < 0.5 || numValue > maxSize)) {
      setShowSizeWarning(true)
    } else {
      setShowSizeWarning(false)
    }
    
    if (dimension === "width") {
      setCustomWidth(value)
    } else {
      setCustomHeight(value)
    }
  }

  // Pre-validation before upload
  const preValidateFile = (file: File) => {
    return validateFile(file)
  }

  const handleFileUpload = async (file: File) => {
    setUploadError(null)
    setIsUploading(true)
    
    try {
      // Prepare metadata from current calculator state
      const area = calculateArea(selectedSize, customWidth, customHeight)
      const qty = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
      
      const metadata: CalculatorMetadata = {
        // Remove selectedCut from metadata since we don't have cut options
        selectedMaterial,
        selectedSize,
        customWidth: customWidth || undefined,
        customHeight: customHeight || undefined,
        selectedQuantity,
        customQuantity: customQuantity || undefined,
        sendProof,
        uploadLater,
        rushOrder: isRushOrder,
        postToInstagram,
        instagramHandle: instagramHandle || undefined,
        totalPrice: totalPrice || undefined,
        costPerSticker: costPerSticker || undefined,
        calculatedArea: area > 0 ? area : undefined,
        marketplaceProduct: {
          productId,
          productTitle,
          markupPercentage
        }
      }
      
      const result = await uploadToCloudinary(file, metadata, (progress: UploadProgress) => {
        setUploadProgress(progress)
      })
      
      setUploadedFile(result)
      setUploadLater(false) // Uncheck "upload later" since file is uploaded
      console.log('File uploaded successfully with metadata:', result)
    } catch (error) {
      console.error('Upload failed:', error)
      
      // Provide customer-friendly error messages
      let customerMessage = 'Upload failed. Please try again.'
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes('file size too large') || errorMessage.includes('maximum is')) {
          customerMessage = 'Your file is too large. Please compress your image or use a smaller file (max 25MB).'
        } else if (errorMessage.includes('network error') || errorMessage.includes('timeout')) {
          customerMessage = 'Connection issue. Please check your internet and try again.'
        } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          customerMessage = 'Invalid file format. Please use .AI, .EPS, .PSD, .SVG, .PNG, .JPG, or .PDF files.'
        } else if (errorMessage.includes('400') || errorMessage.includes('413')) {
          customerMessage = 'File upload failed. Please try a different file or contact support.'
        }
      }
      
      setUploadError(customerMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Pre-validate before upload
      const preValidation = preValidateFile(file)
      if (!preValidation.valid) {
        setUploadError(preValidation.error || 'Invalid file')
        return
      }
      handleFileUpload(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      // Pre-validate before upload
      const preValidation = preValidateFile(file)
      if (!preValidation.valid) {
        setUploadError(preValidation.error || 'Invalid file')
        return
      }
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
    const { total, perSticker } = calculatePrice(quantity, area, isRushOrder);

    // Apply wholesale discount if applicable
    const { discountAmount, finalPrice } = calculateWholesaleDiscount(total);
    const finalUnitPrice = isWholesaleApproved() ? finalPrice / quantity : perSticker;
    const finalTotalPrice = isWholesaleApproved() ? finalPrice : total;

    return {
      id: generateCartItemId(),
      product: {
        id: productId,
        sku: `MP-${productId}`,
        name: productTitle,
        category: "marketplace-stickers" as const,
        description: `Premium custom vinyl stickers - ${productTitle}`,
        shortDescription: productTitle,
        basePrice: finalUnitPrice,
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
        productId: productId,
        selections: {
          // Remove cut selection since we don't have cut options
          material: { type: "finish" as const, value: selectedMaterial, displayValue: selectedMaterial, priceImpact: 0 },
          size: { 
            type: "size-preset" as const, 
            value: selectedSize,
            displayValue: selectedSize,
            priceImpact: 0 
          },
          proof: { type: "finish" as const, value: sendProof, displayValue: sendProof ? "Send Proof" : "No Proof", priceImpact: 0 },
          rush: { type: "finish" as const, value: isRushOrder, displayValue: isRushOrder ? "Rush Order" : "Standard", priceImpact: isRushOrder ? finalTotalPrice * 0.4 : 0 },
          ...(postToInstagram && !isWholesaleApproved() && {
            instagram: { 
              type: "finish" as const, 
              value: instagramHandle, 
              displayValue: instagramHandle ? `@${instagramHandle}` : "Instagram Opt-in", 
              priceImpact: 0 
            }
          }),
        },
        totalPrice: finalTotalPrice,
        customFiles: uploadedFile ? [uploadedFile.secure_url] : [],
        notes: additionalNotes.trim(),
        instagramOptIn: postToInstagram && !isWholesaleApproved(),
        additionalInfo: {
          instagramHandle: (postToInstagram && !isWholesaleApproved()) ? instagramHandle : undefined,
          uploadLater: uploadLater,
          markupPercentage: markupPercentage,
          ...(isWholesaleApproved() && {
            originalPrice: total,
            wholesaleDiscount: discountAmount
          })
        }
      },
      quantity: quantity,
      unitPrice: finalUnitPrice,
      totalPrice: finalTotalPrice,
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
    // Redirect to marketplace with success message
    router.push('/marketspace?added=true');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Honeymoon Alert Banner */}
      <div className="mb-4">
        <div 
          className="px-4 py-3 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-[1.002] flex items-center justify-center gap-2 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="text-red-300 text-sm md:text-base">
            🚨<b>ATTN: We will be temporarily closed from Sept. 3rd-18th</b>...<u> <a href="/blog/ciao-bella-were-off-to-italy" className="text-red-300 hover:text-red-200 transition-colors duration-200">Read more 🡒 </a></u>
          </span>
        </div>
      </div>
      
      {/* Pricing Header */}
      <div className="text-center mb-8">
        <div className="container-style p-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            Customize Your Stickers
          </h2>
          <p className="text-xl text-green-300 font-semibold">
            As low as $0.15 per sticker
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Price varies by size and quantity
          </p>
        </div>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Material Selection (Remove cut options entirely) */}
        <div className="container-style p-4 lg:p-6 transition-colors duration-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-white">
            <span className="text-blue-400 mr-2">✨</span>
            Select finish
          </h2>
          <div className="space-y-2">
            {/* Remove "Shimmer Gloss" option */}
            {["Matte", "Gloss"].map((material) => (
              <button
                key={material}
                onClick={() => setSelectedMaterial(material)}
                className={`button-interactive w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-300 border backdrop-blur-md
                  ${
                    selectedMaterial === material
                      ? "bg-blue-500/20 text-blue-200 border-blue-400/50 button-selected"
                      : "hover:bg-white/10 border-white/20 text-white/80"
                  }
                `}
              >
                <span className="font-medium">{material}</span>
                {selectedMaterial === material && (
                  <span className="text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div className="container-style p-4 lg:p-6 transition-colors duration-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-white">
            <span className="text-purple-400 mr-2">📏</span>
            Select a size
          </h2>
          <div className="space-y-2">
            {/* Remove "Custom size" option */}
            {['Small (2")', 'Medium (3")', 'Large (4")', 'X-Large (5")'].map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`button-interactive w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-300 border backdrop-blur-md
                  ${
                    selectedSize === size
                      ? "bg-purple-500/20 text-purple-200 border-purple-400/50 button-selected"
                      : "hover:bg-white/10 border-white/20 text-white/80"
                  }
                `}
              >
                <span className="font-medium">{size}</span>
                {selectedSize === size && (
                  <span className="text-purple-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="container-style p-4 lg:p-6 transition-colors duration-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <span className="text-green-400">#️⃣</span>
              Select a quantity
            </span>
          </h2>
          <div className="space-y-2 relative">
            {/* Updated quantity presets: 25, 50, 100, 300, 1,000, Custom */}
            {["25", "50", "100", "300", "1,000", "Custom"].map((amount) => {
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
                if (realPricingData && realPricingData.quantityDiscounts && numericAmount > 25) {
                  // Find the appropriate quantity tier (use lower tier as per CSV note)
                  let applicableQuantity = 25;
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
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-300">
                        ${calculateWholesaleDiscount(parseFloat(totalPrice.replace('$', ''))).finalPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-400">
                        Save ${calculateWholesaleDiscount(parseFloat(totalPrice.replace('$', ''))).discountAmount.toFixed(2)} (15% off)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-300">{totalPrice}</div>
                      <div className="text-xs text-green-400">
                        {costPerSticker}/each
                      </div>
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
                        {(() => {
                          const area = calculateArea(selectedSize, customWidth, customHeight)
                          const qty = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)
                          
                          if (area > 0 && qty > 0) {
                            let discount = 0
                            if (realPricingData && realPricingData.quantityDiscounts && qty > 25) {
                              let applicableQuantity = 25;
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
                              return `${Math.round(discount)}% off!`
                            }
                          }
                          
                          return `${costPerSticker}/ea.`
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Show markup information if there's a markup */}
              {markupPercentage > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Includes {markupPercentage}% marketplace markup
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Upload Section */}
      <div className="container-style p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Upload Your Design</h2>
        
        {uploadError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
            {uploadError}
          </div>
        )}

        {uploadedFile ? (
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                {uploadedFile.format && getFileTypeIcon(uploadedFile.format) ? (
                  <img 
                    src={getFileTypeIcon(uploadedFile.format)!} 
                    alt={uploadedFile.format.toUpperCase()} 
                    className="w-8 h-8"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-500/30 rounded flex items-center justify-center">
                    <span className="text-blue-300 text-xs font-bold">
                      {uploadedFile.format?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">{uploadedFile.original_filename}</div>
                  <div className="text-green-300 text-sm">✓ Uploaded successfully</div>
                </div>
              </div>
              <button
                onClick={removeUploadedFile}
                className="text-red-400 hover:text-red-300 transition-colors p-1"
                title="Remove file"
              >
                ✕
              </button>
            </div>
            
            {uploadedFile.secure_url && (
              <div className="mt-4">
                <AIFileImage 
                  fileUrl={uploadedFile.secure_url} 
                  fileName={uploadedFile.original_filename} 
                  fileFormat={uploadedFile.format}
                />
              </div>
            )}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md mb-6 relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-upload')?.click()}
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
                {uploadProgress && uploadProgress.percentage !== undefined && (
                  <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <div className="mb-3 flex justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                    alt="Upload file" 
                    className="w-20 h-20 object-contain"
                  />
                </div>
                <p className="text-white font-medium text-base mb-2">
                  Drop your design here or click to upload
                </p>
                <p className="text-white/60 text-sm">
                  .AI, .EPS, .PSD, .SVG, .PNG, .JPG, .PDF • Max 25MB
                </p>
              </div>
            )}
          </div>
        )}

        <input
          id="file-upload"
          type="file"
          accept=".ai,.eps,.psd,.svg,.png,.jpg,.jpeg,.pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          aria-label="Upload design file"
        />

        {/* Upload Later Option */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="upload-later"
            checked={uploadLater}
            onChange={(e) => setUploadLater(e.target.checked)}
            className="w-4 h-4 text-purple-400 bg-white/10 border-white/20 rounded focus:ring-purple-400 focus:ring-2"
          />
          <label htmlFor="upload-later" className="text-white text-sm">
            I'll upload my design later (via email)
          </label>
        </div>

        {/* Proof Option */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="send-proof"
            checked={sendProof}
            onChange={(e) => setSendProof(e.target.checked)}
            className="w-4 h-4 text-blue-400 bg-white/10 border-white/20 rounded focus:ring-blue-400 focus:ring-2"
          />
          <label htmlFor="send-proof" className="text-white text-sm">
            Send me a proof before printing (recommended)
          </label>
        </div>
      </div>

      {/* Additional Options */}
      <div className="container-style p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Additional Options</h2>
        
        {/* Instagram Opt-in (only for non-wholesale users) */}
        {!isWholesaleApproved() && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="instagram-opt-in"
                checked={postToInstagram}
                onChange={(e) => setPostToInstagram(e.target.checked)}
                className="w-4 h-4 text-pink-400 bg-white/10 border-white/20 rounded focus:ring-pink-400 focus:ring-2"
              />
              <label htmlFor="instagram-opt-in" className="text-white text-sm flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Post my stickers on Instagram for 5% credit back
              </label>
            </div>
            
            {postToInstagram && (
              <div className="ml-7">
                <input
                  type="text"
                  placeholder="Your Instagram handle (optional)"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-pink-400 backdrop-blur-md text-sm"
                />
                <p className="text-pink-300 text-xs mt-1">
                  We'll tag you when we post! Get {(getCreditRate() * 100).toFixed(1)}% back as store credit.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional-notes" className="block text-white text-sm font-medium mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            id="additional-notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any special instructions or requests..."
            className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-blue-400 backdrop-blur-md text-sm resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Checkout Buttons */}
      {totalPrice && (
        <div className="container-style p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCheckout}
              disabled={!uploadedFile && !uploadLater}
              className="flex-1 button-style py-4 px-6 font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart & Checkout
            </button>
            
            <button
              onClick={handleAddToCartAndKeepShopping}
              disabled={!uploadedFile && !uploadLater}
              className="flex-1 py-4 px-6 font-bold text-lg rounded-lg transition-colors border border-white/20 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart & Keep Shopping
            </button>
          </div>
          
          {(!uploadedFile && !uploadLater) && (
            <p className="text-center text-orange-300 text-sm mt-3">
              Please upload your design or check "I'll upload later" to continue
            </p>
          )}
        </div>
      )}
      
    </div>
  )
}