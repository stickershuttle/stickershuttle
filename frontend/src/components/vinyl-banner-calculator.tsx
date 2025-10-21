import React, { useState, useEffect } from 'react';
import { ShoppingCart, Upload, Instagram, Clock } from 'lucide-react';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress, CalculatorMetadata } from '@/utils/cloudinary';
import AIFileImage from './AIFileImage';
import { getSupabase } from '@/lib/supabase';
import { useCart } from '@/components/CartContext';
import { useRouter } from 'next/navigation';
import { generateCartItemId } from '@/types/product';

interface VinylBannerCalculatorProps {
  initialBasePricing: {
    basePrice: number;
    finishingPrice: number;
    subtotal: number;
    quantityDiscount: number;
    rushFee: number;
    instagramFee: number;
    total: number;
    perUnit: number;
    sqFt: number;
  };
  realPricingData: {
    basePrice: number;
    finishingPrice: number;
    subtotal: number;
    quantityDiscount: number;
    rushFee: number;
    instagramFee: number;
    total: number;
    perUnit: number;
    sqFt: number;
  };
}

export default function VinylBannerCalculator({ initialBasePricing, realPricingData }: VinylBannerCalculatorProps) {
  const { addToCart, isRushOrder, updateAllItemsRushOrder } = useCart();
  const router = useRouter();
  // Use global rush order state from cart instead of local state
  const [totalPrice, setTotalPrice] = useState("")

  const [selectedSize, setSelectedSize] = useState<string>('3x5');
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<string>('1');
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [showSizeWarning, setShowSizeWarning] = useState<boolean>(false);

  const [selectedFinishing, setSelectedFinishing] = useState<string>('hemmed-grommeted');
  const [rushOrder, setRushOrder] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [postToInstagram, setPostToInstagram] = useState<boolean>(false);
  const [instagramUsername, setInstagramUsername] = useState<string>('');
  const [customSizeError, setCustomSizeError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadLater, setUploadLater] = useState<boolean>(false);

  // User and profile states
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Info tooltip state
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  const bannerSizes = [
    { value: '2x4', label: '2\' × 4\'', sqFt: 8, popular: false },
    { value: '3x5', label: '3\' × 5\'', sqFt: 15, popular: true },
    { value: '4x8', label: '4\' × 8\'', sqFt: 32, popular: false },
    { value: 'custom', label: 'Custom Size', sqFt: 0 }
  ];

  const finishingOptions = [
    { value: 'hemmed-grommeted', label: 'Hemmed & Grommeted (Standard)', priceMultiplier: 1.0 },
    { value: 'no-finishing', label: 'No Finishing (Raw Edges)', priceMultiplier: 0.85 }
  ];

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

  const getTierPricing = (sqFt: number): number => {
    if (sqFt <= 10) return 4.50;
    if (sqFt <= 25) return 3.75;
    if (sqFt <= 50) return 3.25;
    return 2.85;
  };

  const getQuantityDiscount = (qty: number): number => {
    if (qty >= 25) return 0.25;
    if (qty >= 15) return 0.15;
    if (qty >= 10) return 0.10;
    if (qty >= 5) return 0.05;
    return 0;
  };

  const calculateSquareFootage = (): number => {
    if (selectedSize === 'custom') {
      const width = parseFloat(customWidth) || 0;
      const height = parseFloat(customHeight) || 0;
      return width * height;
    }
    
    const sizeOption = bannerSizes.find(size => size.value === selectedSize);
    return sizeOption?.sqFt || 0;
  };

  const validateCustomSize = (width: string, height: string) => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    
    if (width && height) {
      if (w < 1 || h < 1) {
        setCustomSizeError('Minimum size is 1\' × 1\'');
        return false;
      }
      if (w > 20 || h > 20) {
        setCustomSizeError('Maximum size is 20\' × 20\'');
        return false;
      }
      if (w * h < 2) {
        setCustomSizeError('Minimum area must be 2 sq ft');
        return false;
      }
    }
    
    setCustomSizeError('');
    return true;
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    if (size !== 'custom') {
      setCustomWidth('');
      setCustomHeight('');
      setCustomSizeError('');
    }
  };

  const handleCustomSizeChange = (dimension: "width" | "height", value: string) => {
    // Validate input - only allow numbers and decimal points
    const numericValue = value.replace(/[^0-9.]/g, '')
    
    // Check if value is below minimum or above maximum
    const numValue = parseFloat(numericValue)
    if (numValue < 0.5 && numericValue !== "") {
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
    if (showSizeWarning && numValue >= 0.5 && numValue <= 14) {
      setShowSizeWarning(false)
    }
    
    if (dimension === "width") {
      setCustomWidth(numericValue)
    } else {
      setCustomHeight(numericValue)
    }
  }

  const calculatePricing = (qty?: string) => {
    const sqFt = calculateSquareFootage();
    const qtyParam = qty !== undefined ? qty : selectedQuantity;
    const quantity = qtyParam === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(qtyParam);
    
    if (sqFt === 0 || (selectedSize === 'custom' && customSizeError) || quantity <= 0) {
      return {
        basePrice: 0,
        materialPrice: 0,
        finishingPrice: 0,
        subtotal: 0,
        quantityDiscount: 0,
        rushFee: 0,
        instagramFee: 0,
        total: 0,
        perUnit: 0,
        sqFt
      };
    }

    const basePricePerSqFt = getTierPricing(sqFt);
    const basePrice = sqFt * basePricePerSqFt;

    const finishingMultiplier = finishingOptions.find(f => f.value === selectedFinishing)?.priceMultiplier || 1.0;

    const unitPrice = basePrice * finishingMultiplier;
    const subtotal = unitPrice * quantity;
    
    const discountRate = getQuantityDiscount(quantity);
    const quantityDiscount = subtotal * discountRate;
    
    const rushFee = rushOrder ? subtotal * 0.35 : 0;
    const instagramFee = 0; // No charge for Instagram tagging
    
    const total = subtotal - quantityDiscount + rushFee + instagramFee;

    return {
      basePrice,
      finishingPrice: basePrice * (finishingMultiplier - 1),
      subtotal,
      quantityDiscount,
      rushFee,
      instagramFee,
      total,
      perUnit: total / quantity,
      sqFt
    };
  };

  const pricing = calculatePricing();

  const handleFileUpload = async (file: File) => {
    // Reset previous states
    setUploadError(null);
    setUploadProgress(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    
    try {
      // Prepare metadata from current calculator state
      const sqFt = calculateSquareFootage();
      
      const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
      
      const metadata: CalculatorMetadata = {
        selectedSize,
        customWidth: customWidth || undefined,
        customHeight: customHeight || undefined,
        selectedMaterial: selectedFinishing, // Banner finishing options (using selectedMaterial field)
        selectedQuantity,
        customQuantity: customQuantity || undefined,
        rushOrder,
        postToInstagram,
        totalPrice: pricing.total > 0 ? `$${pricing.total.toFixed(2)}` : undefined,
        calculatedArea: sqFt > 0 ? sqFt : undefined
      };
      
      const result = await uploadToCloudinary(file, metadata, (progress: UploadProgress) => {
        setUploadProgress(progress);
      });
      
      setUploadedFile(result);
      setUploadLater(false); // Uncheck "upload later" since file is uploaded
      console.log('File uploaded successfully with metadata:', result);
    } catch (error) {
      console.error('Upload failed:', error);
      
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
      
      setUploadError(customerMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  // Get file type icon based on format
  const getFileTypeIcon = (format: string): string | null => {
    const lowerFormat = format.toLowerCase();
    
    if (lowerFormat === 'ai') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751503976/Adobe_Illustrator_.AI_File_Icon_v3wshr.png';
    }
    if (lowerFormat === 'psd') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504068/PSD_file_icon.svg_sbi8dh.png';
    }
    if (lowerFormat === 'eps') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504098/9034333_ykhb8f.png';
    }
    if (lowerFormat === 'pdf') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504123/PDF_file_icon.svg_uovjbk.png';
    }
    
    return null;
  };

  const createCartItem = () => {
    const sqFt = calculateSquareFootage();
    const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
    
    // Apply wholesale discount if applicable
    const { discountAmount, finalPrice } = calculateWholesaleDiscount(pricing.total);
    const finalUnitPrice = isWholesaleApproved() ? finalPrice / quantity : pricing.perUnit;
    const finalTotalPrice = isWholesaleApproved() ? finalPrice : pricing.total;

    return {
      id: generateCartItemId(),
      product: {
        id: "vinyl-banners",
        sku: "SS-VB-CUSTOM",
        name: "Vinyl Banners",
        category: "vinyl-banners" as const,
        description: "Heavy-duty vinyl banners perfect for outdoor advertising, events, and business signage",
        shortDescription: "Professional outdoor signage, durable and weather-resistant",
        basePrice: finalUnitPrice,
        pricingModel: "per-unit" as const,
        images: ['/vinyl-banner-icon.png'],
        defaultImage: '/vinyl-banner-icon.png',
        features: [],
        attributes: [],
        customizable: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      customization: {
        productId: "vinyl-banners",
        selections: {
          size: { 
            type: "size-preset" as const, 
            value: selectedSize === 'custom' ? `${customWidth}' × ${customHeight}'` : selectedSize,
            displayValue: selectedSize === 'custom' ? `${customWidth}' × ${customHeight}'` : selectedSize,
            priceImpact: 0 
          },
          material: { 
            type: "finish" as const, 
            value: selectedFinishing, 
            displayValue: finishingOptions.find(f => f.value === selectedFinishing)?.label || selectedFinishing, 
            priceImpact: 0 
          },
          rush: { 
            type: "finish" as const, 
            value: rushOrder, 
            displayValue: rushOrder ? "Rush Order" : "Standard", 
            priceImpact: rushOrder ? finalTotalPrice * 0.35 : 0 
          },
          ...(postToInstagram && !isWholesaleApproved() && {
            instagram: { 
              type: "finish" as const, 
              value: instagramUsername, 
              displayValue: instagramUsername ? `@${instagramUsername}` : "Instagram Opt-in", 
              priceImpact: 0 
            }
          }),
        },
        totalPrice: finalTotalPrice,
        customFiles: uploadedFile ? [uploadedFile.secure_url] : [],
        notes: "",
        instagramOptIn: postToInstagram && !isWholesaleApproved(),
        additionalInfo: {
          instagramHandle: (postToInstagram && !isWholesaleApproved()) ? instagramUsername : undefined,
          uploadLater: uploadLater,
          sqFt: sqFt,
          ...(isWholesaleApproved() && {
            originalPrice: pricing.total,
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
    if (pricing.total === 0) return;
    
    // Validate file upload requirement
    if (!uploadedFile && !uploadLater) {
      alert('Please upload your artwork or select "Upload artwork later"');
      return;
    }
    
    const cartItem = createCartItem();
    addToCart(cartItem);
    // Redirect to cart page for checkout
    router.push('/cart');
  };

  const handleAddToCartAndKeepShopping = () => {
    if (pricing.total === 0) return;
    
    // Validate file upload requirement
    if (!uploadedFile && !uploadLater) {
      alert('Please upload your artwork or select "Upload artwork later"');
      return;
    }
    
    const cartItem = createCartItem();
    addToCart(cartItem);
    // Redirect to products page with success message
    router.push('/products?added=true');
  };

  const handleQuantityChange = (amount: string) => {
    setSelectedQuantity(amount);
    if (amount !== 'Custom') {
      setCustomQuantity('');
    }
  };

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value);
  };

  return (
    <>
      <style jsx>{`
        .animate-glow-purple {
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
        }
        
        .animate-glow-green {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
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
        
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
      
      
      <div 
        className="rounded-2xl p-4 md:p-8 shadow-2xl container-style"
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6 flex flex-col">
          {/* Size Selection */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span role="img" aria-label="ruler" className="text-purple-400">
                📏
              </span>
              Banner Size
            </h2>
            <div className="space-y-3">
              {bannerSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => handleSizeChange(size.value)}
                  aria-label={`Select ${size.label} banner size`}
                  className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                    ${
                      selectedSize === size.value
                        ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <span>{size.label}</span>
                  {size.popular && (
                    <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">
                      Most Popular
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Size Inputs */}
            {selectedSize === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Width (feet)</label>
                    <input
                      type="number" 
                      title="Banner width in feet"
                      value={customWidth}
                      onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                      placeholder="e.g. 5'"
                      min="1"
                      max="20"
                      step="0.5"
                      className={`w-full p-2 rounded-lg bg-white/10 border-2 text-white placeholder-gray-400 ${
                        customSizeError ? 'border-red-400' : 'border-white/20'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Height (feet)</label>
                    <input
                      type="number"
                      title="Banner height in feet"
                      value={customHeight}
                      onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                      placeholder="e.g. 3'"
                      min="1"
                      max="20"
                      step="0.5"
                      className={`w-full p-2 rounded-lg bg-white/10 border-2 text-white placeholder-gray-400 ${
                        customSizeError ? 'border-red-400' : 'border-white/20'
                      }`}
                    />
                  </div>
                </div>
                {customSizeError && (
                  <p className="text-red-400 text-sm">{customSizeError}</p>
                )}
                {!customSizeError && customWidth && customHeight && (
                  <p className="text-green-400 text-sm">
                    Total: {calculateSquareFootage()} sq ft
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Finishing Options */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="text-green-400">🏁</span>
              Finishing
            </h2>
            <div className="space-y-3">
              {finishingOptions.map((finishing) => (
                <button
                  key={finishing.value}
                  onClick={() => setSelectedFinishing(finishing.value)}
                  aria-label={`Select ${finishing.label} finishing option`}
                  className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                    ${
                      selectedFinishing === finishing.value
                        ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div>
                    <div className="font-medium">{finishing.label}</div>
                    {finishing.priceMultiplier !== 1.0 && (
                      <div className="text-xs text-gray-300 mt-1">
                        {finishing.priceMultiplier > 1.0 ? '+' : ''}
                        {Math.round((finishing.priceMultiplier - 1) * 100)}%
                      </div>
                    )}
                  </div>
                  {finishing.value === 'hemmed-grommeted' && (
                    <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                      Standard
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="text-green-400">#️⃣</span>
              Select Quantity
            </h2>
            <div className="space-y-3">
              {['1', '5', '10', '25', 'Custom'].map((amount) => {
                const qtyPricing = amount !== 'Custom' ? calculatePricing(amount) : null;
                const discountText = amount === '5' ? '5% OFF' : amount === '10' ? '10% OFF' : amount === '25' ? '25% OFF' : null;
                
                return (
                  <button
                    key={amount}
                    onClick={() => handleQuantityChange(amount)}
                    aria-label={`Select ${amount} banners`}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl transition-all border backdrop-blur-md
                      ${
                        selectedQuantity === amount
                          ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{amount === 'Custom' ? 'Custom Quantity' : `${amount} Banner${amount === '1' ? '' : 's'}`}</span>
                      {qtyPricing && qtyPricing.total > 0 && (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-lg border ${
                              selectedQuantity === amount ? 'text-white' : 'text-green-200'
                            }`}
                            style={{
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              backdropFilter: 'blur(12px)'
                            }}
                          >
                            ${qtyPricing.total.toFixed(2)}
                          </span>
                          {discountText && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">{discountText}</span>
                          )}
                        </div>
                      )}
                      {amount === 'Custom' && (
                        <span className="text-xs text-gray-400">Enter amount</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 flex flex-col justify-end">
              {selectedQuantity === 'Custom' && (
                <div className="mt-3">
                  <input
                    type="number"
                    placeholder="Enter quantity (1-25)"
                    value={customQuantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    min="1"
                    max="25"
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-green-400 backdrop-blur-md button-interactive"
                  />
                </div>
              )}
              {(() => {
                const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 0 : parseInt(selectedQuantity);
                if (quantity >= 5) {
                  return (
                    <p className="text-green-400 text-sm mt-2">
                      {Math.round(getQuantityDiscount(quantity) * 100)}% quantity discount applied!
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Right Column - Upload, Options, and Pricing */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="container-style p-6 transition-colors duration-200">

            
            {/* Hidden file input - always present */}
            <input
              id="file-input"
              type="file"
              accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.pdf,.zip"
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
                <span role="img" aria-label="caution" className="mr-1">⚠️</span>
                You can upload your artwork after placing the order
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            {/* Rush Order Toggle */}
            <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                 style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                   backdropFilter: 'blur(12px)'
                 }}>
                <button
                  onClick={() => setRushOrder(!rushOrder)}
                  title={rushOrder ? "Disable rush order" : "Enable rush order"}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    rushOrder ? 'bg-orange-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    rushOrder ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
                <div className="flex-1">
                  <label className="text-sm font-medium text-white">
                    ⚡ Rush Order (+35%)
                  </label>
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
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value)}
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

              {/* Pricing Breakdown */}
              <div className="container-style p-6 transition-colors duration-200 mt-6">
                <h3 className="text-white font-semibold mb-3">Pricing Breakdown</h3>
            
            {pricing.total > 0 ? (
              <div className="space-y-2 text-sm">
                {/* Wholesale pricing display */}
                {isWholesaleApproved() && pricing.total > 0 && (
                  <div className="mb-3 p-3 rounded-lg text-sm"
                       style={{
                         background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                         border: '1px solid rgba(34, 197, 94, 0.4)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-white/80">
                        <span>Competitive Price:</span>
                        <span>${pricing.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-orange-300 font-medium">
                        <span>Aggressive Price:</span>
                        <span>${(pricing.total * 1.3).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-300 font-medium">
                        <span>Homerun Price:</span>
                        <span>${(pricing.total * 1.5).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-green-300 font-medium">
                                                  <span>Your Price:</span>
                        <span>${calculateWholesaleDiscount(pricing.total).finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-300">
                  <span>Base ({pricing.sqFt} sq ft × ${getTierPricing(pricing.sqFt).toFixed(2)}/sq ft)</span>
                  <span>${pricing.basePrice.toFixed(2)}</span>
                </div>
                
                {pricing.finishingPrice !== 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Finishing {pricing.finishingPrice > 0 ? 'Upgrade' : 'Discount'}</span>
                    <span>{pricing.finishingPrice > 0 ? '+' : ''}${pricing.finishingPrice.toFixed(2)}</span>
                  </div>
                )}
                
                {(() => {
                  const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
                  return (
                    <>
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal (× {quantity})</span>
                        <span>${pricing.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {pricing.quantityDiscount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Quantity Discount ({Math.round(getQuantityDiscount(quantity) * 100)}%)</span>
                          <span>-${pricing.quantityDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {pricing.rushFee > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Rush Order (35%)</span>
                    <span>+${pricing.rushFee.toFixed(2)}</span>
                  </div>
                )}
                
                {pricing.instagramFee > 0 && (
                  <div className="flex justify-between text-pink-400">
                    <span>Instagram Posting</span>
                    <span>+${pricing.instagramFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-white/20 pt-2 mt-3">
                  <div className="flex justify-between text-white font-semibold text-xl">
                    <span>Total:</span>
                    <span className="text-green-200">
                      ${isWholesaleApproved() ? calculateWholesaleDiscount(pricing.total).finalPrice.toFixed(2) : pricing.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right text-gray-300 text-sm">
                    ${(isWholesaleApproved() ? calculateWholesaleDiscount(pricing.total).finalPrice / (selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity)) : pricing.perUnit).toFixed(2)} per banner
                  </div>
                  {/* Store Credit Notification */}
                  <div className="mt-3 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left"
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
                      You'll earn ${((isWholesaleApproved() ? calculateWholesaleDiscount(pricing.total).finalPrice : pricing.total) * getCreditRate()).toFixed(2)} in store credit on this order!
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                {selectedSize === 'custom' && customSizeError ? (
                  <p className="text-red-400">Please fix size requirements</p>
                ) : (
                  <p className="text-gray-400">Configure your banner to see pricing</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              {/* Conditional Button Display */}
              {!pricing.total || pricing.total === 0 ? (
                /* Single Configuration Required Button */
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Please Configure Your Banner Above
                  </span>
                </button>
              ) : (
                /* Dual Buttons */
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Add to Cart & Keep Shopping Button - Full width on mobile, 50% on desktop */}
                  <button 
                    onClick={handleAddToCartAndKeepShopping}
                    className="w-full sm:w-1/2 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.0025] cursor-pointer"
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

                  {/* Checkout Button - Full width on mobile, 50% on desktop */}
                  <button 
                    onClick={handleCheckout}
                    className="w-full sm:w-1/2 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.025] cursor-pointer"
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
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  {!pricing.total || pricing.total === 0
                    ? "Complete your banner configuration to proceed"
                    : "Items will be added to your cart for review before checkout"
                  }
                </p>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 