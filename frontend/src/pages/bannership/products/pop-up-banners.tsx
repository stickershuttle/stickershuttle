import Layout from "@/components/Layout";
import VinylBannerCalculator from "@/components/vinyl-banner-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useCart } from "@/components/CartContext";
import { useRouter } from "next/router";
import { generateCartItemId, ProductCategory } from "@/types/product";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress, CalculatorMetadata } from '@/utils/cloudinary';
import { Instagram } from 'lucide-react';
import AIFileImage from '@/components/AIFileImage';

export default function BannershipPopUpBanners() {
  const { addToCart } = useCart();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'economy' | 'premium' | 'luxury'>('economy');
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('small');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  
  // Upload states
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadLater, setUploadLater] = useState<boolean>(false);
  
  // Rush order and Instagram states
  const [rushOrder, setRushOrder] = useState<boolean>(false);
  const [postToInstagram, setPostToInstagram] = useState<boolean>(false);
  const [instagramUsername, setInstagramUsername] = useState<string>('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Type to image mapping
  const typeImages = {
    economy: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1760476156/economy_bg-removebg-preview_tzqpis.png',
    premium: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1760476156/premium_bg-removebg-preview_jntruv.png',
    luxury: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1760476156/luxury_bg-removebg-preview_b4owpx.png'
  };

  // Get size dimensions in inches
  const getSizeDimensions = () => {
    if (selectedType === 'premium') {
      return { width: 33.5, height: 82 }; // Premium only has one size
    } else {
      // Regular and Luxury have same size options
      if (selectedSize === 'small') return { width: 31.5, height: 78.75 };
      if (selectedSize === 'medium') return { width: 33.5, height: 78.75 };
      if (selectedSize === 'large') return { width: 39.5, height: 78.75 };
    }
    return { width: 0, height: 0 };
  };

  // Calculate square footage
  const calculateSquareFootage = () => {
    const { width, height } = getSizeDimensions();
    return (width * height) / 144; // Convert square inches to square feet
  };

  // Get tier pricing per square foot (from vinyl banner calculator)
  const getTierPricing = (sqFt: number): number => {
    if (sqFt <= 10) return 4.50;
    if (sqFt <= 25) return 3.75;
    if (sqFt <= 50) return 3.25;
    return 2.85;
  };

  // Calculate material cost based on square footage
  const getMaterialCost = () => {
    const sqFt = calculateSquareFootage();
    const pricePerSqFt = getTierPricing(sqFt);
    return sqFt * pricePerSqFt;
  };

  // Frame pricing based on type and size (before discount)
  const getBaseFrameCost = () => {
    if (selectedType === 'premium') {
      return 146.78; // Premium only has one size
    } else if (selectedType === 'economy') {
      if (selectedSize === 'small') return 35.80; // 31.5x78.75
      if (selectedSize === 'medium') return 42.39; // 33.5x78.75
      if (selectedSize === 'large') return 54.15; // 39.5x78.75
    } else if (selectedType === 'luxury') {
      if (selectedSize === 'small') return 103.90; // 31.5x78.75
      if (selectedSize === 'medium') return 111.09; // 33.5x78.75
      if (selectedSize === 'large') return 124.07; // 39.5x78.75
    }
    return 0;
  };

  // Apply 5% discount to Economy frames
  const getFrameCost = () => {
    const baseCost = getBaseFrameCost();
    if (selectedType === 'economy') {
      return baseCost * 0.95; // 5% off economy frames
    }
    return baseCost;
  };

  // Calculate quantity discount
  const getQuantityDiscount = (qty?: number) => {
    const quantity = qty !== undefined ? qty : selectedQuantity;
    if (quantity === 5) return 0.15; // 15% off
    if (quantity === 10) return 0.25; // 25% off
    if (quantity === 25) return 0.35; // 35% off
    return 0;
  };

  // Calculate total price
  const calculateTotal = (qty?: number) => {
    const quantity = qty !== undefined ? qty : selectedQuantity;
    const baseFrameCost = getBaseFrameCost();
    const frameCost = getFrameCost();
    const frameDiscount = selectedType === 'economy' ? baseFrameCost - frameCost : 0;
    const materialCost = getMaterialCost();
    const sqFt = calculateSquareFootage();
    const unitPrice = frameCost + materialCost;
    const discount = getQuantityDiscount(quantity);
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * discount;
    const afterDiscount = subtotal - discountAmount;
    const rushFee = rushOrder ? afterDiscount * 0.35 : 0;
    const total = afterDiscount + rushFee;
    return {
      baseFrameCost,
      frameCost,
      frameDiscount,
      materialCost,
      sqFt,
      unitPrice,
      subtotal,
      discount,
      discountAmount,
      rushFee,
      total
    };
  };

  const pricing = calculateTotal();

  // Create cart item for pop-up banners
  const createCartItem = () => {
    const { width, height } = getSizeDimensions();
    const sizeLabel = selectedType === 'premium' 
      ? `Premium (33.5" × 82")` 
      : selectedSize === 'small' 
        ? `Small (31.5" × 78.75")` 
        : selectedSize === 'medium' 
          ? `Medium (33.5" × 78.75")` 
          : `Large (39.5" × 78.75")`;

    return {
      id: generateCartItemId(),
      product: {
        id: "pop-up-banners",
        sku: "BS-PUB-CUSTOM",
        name: "Pop Up Banners",
        category: "pop-up-banners" as ProductCategory,
        description: "Professional portable pop-up banners perfect for trade shows, events, and business displays",
        shortDescription: "Portable display banners with easy setup",
        basePrice: pricing.unitPrice,
        pricingModel: "per-unit" as const,
        images: ['/popup-banner-icon.png'],
        defaultImage: '/popup-banner-icon.png',
        features: [],
        attributes: [],
        customizable: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      customization: {
        productId: "pop-up-banners",
        selections: {
          frameType: {
            type: "finish" as const,
            value: selectedType,
            displayValue: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Frame`,
            priceImpact: 0
          },
          size: {
            type: "size-preset" as const,
            value: sizeLabel,
            displayValue: sizeLabel,
            priceImpact: 0
          },
          rush: {
            type: "finish" as const,
            value: rushOrder,
            displayValue: rushOrder ? "Rush Order" : "Standard",
            priceImpact: rushOrder ? pricing.rushFee : 0
          },
          ...(postToInstagram && {
            instagram: {
              type: "finish" as const,
              value: instagramUsername,
              displayValue: instagramUsername ? `@${instagramUsername}` : "Instagram Opt-in",
              priceImpact: 0
            }
          }),
        },
        totalPrice: pricing.total,
        customFiles: uploadedFile ? [uploadedFile.secure_url] : [],
        notes: "",
        instagramOptIn: postToInstagram,
        additionalInfo: {
          instagramHandle: postToInstagram ? instagramUsername : undefined,
          uploadLater: uploadLater,
        }
      },
      quantity: selectedQuantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.total,
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
    // Redirect to bannership products page with success message
    router.push('/bannership/products?added=true');
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadProgress(null);
    
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    
    try {
      const { width, height } = getSizeDimensions();
      const metadata: CalculatorMetadata = {
        selectedSize: `${width}" × ${height}"`,
        selectedMaterial: selectedType,
        selectedQuantity: selectedQuantity.toString(),
        rushOrder,
        postToInstagram,
        totalPrice: pricing.total > 0 ? `$${pricing.total.toFixed(2)}` : undefined,
        calculatedArea: pricing.sqFt > 0 ? pricing.sqFt : undefined
      };
      
      const result = await uploadToCloudinary(file, metadata, (progress: UploadProgress) => {
        setUploadProgress(progress);
      });
      
      setUploadedFile(result);
      setUploadLater(false);
      console.log('File uploaded successfully with metadata:', result);
    } catch (error) {
      console.error('Upload failed:', error);
      
      let customerMessage = 'Upload failed. Please try again.'
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes('file size too large') || errorMessage.includes('maximum is')) {
          customerMessage = 'Your file is too large. Please compress your image or use a smaller file (max 25MB).';
        } else if (errorMessage.includes('network error') || errorMessage.includes('timeout')) {
          customerMessage = 'Connection issue. Please check your internet and try again.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          customerMessage = 'Invalid file format. Please use .AI, .EPS, .PSD, .SVG, .PNG, .JPG, or .PDF files.';
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

  useEffect(() => {
    checkUser();
    
    // Track Facebook Pixel ViewContent event for product page
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        window.fbq('track', 'ViewContent', {
          content_ids: ['pop-up-banners'],
          content_name: 'Pop Up Banners',
          content_category: 'Banners',
          content_type: 'product'
        });
        console.log('📊 Facebook Pixel: ViewContent tracked for Pop Up Banners');
      } catch (fbError) {
        console.error('📊 Facebook Pixel ViewContent tracking error:', fbError);
      }
    }
  }, []);

  const checkUser = async () => {
    try {
      if (typeof window !== 'undefined') {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout 
      title="Pop Up Banners - Professional Signage | Bannership"
      description="Portable pop-up banners perfect for trade shows, events, and business displays. Easy setup and professional appearance."
      canonical="https://bannership.stickershuttle.com/products/pop-up-banners"
      ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652827/StickerShuttle_VinylBanner_VinylBanner_chvbfs.png"
      customLogo="/bannership-logo.svg"
      customLogoAlt="Bannership Logo"
    >
      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        @keyframes stellar-drift {
          0%, 100% {
            background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
          }
          25% {
            background-position: 20% 30%, 40% 50%, 60% 80%, 80% 60%, 10% 10%, 30% 60%;
          }
          50% {
            background-position: 40% 60%, 60% 80%, 80% 10%, 10% 20%, 30% 40%, 50% 90%;
          }
          75% {
            background-position: 60% 90%, 80% 10%, 10% 40%, 30% 70%, 50% 50%, 70% 20%;
          }
        }
        
        .button-style {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(59, 130, 246, 0.4);
          box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
        }
        
        .button-interactive {
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
        
        .animate-glow-purple {
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
        }

        .animate-glow-blue {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 0 25px rgba(59, 130, 246, 0.2);
        }

        .animate-glow-green {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
        }

        .animate-float {
          animation: float 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-4px) rotate(2deg);
          }
          50% {
            transform: translateY(-8px) rotate(0deg);
          }
          75% {
            transform: translateY(-4px) rotate(-2deg);
          }
        }
        
        .mobile-container-bg {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
          border-radius: 0 0 16px 16px;
        }
        
        @media (min-width: 768px) {
          .mobile-container-bg {
            background: transparent;
            box-shadow: none;
            backdrop-filter: none;
            border-radius: 0;
          }
        }
      `}</style>

      {/* Product Configuration Section */}
      <section className="pt-8 md:pt-12 pb-2 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 md:gap-8 items-stretch">
            
            {/* Product Preview - Left Side */}
            <div 
              className="p-0 h-full relative mobile-container-bg"
              style={{ 
                border: 'none'
              }}
            >
              {/* Header Section - Above Preview */}
              <div className="mb-8">
                <div 
                  className="backdrop-blur-sm rounded-2xl p-6 md:p-8 relative overflow-hidden"
                  style={{
                    background: 'rgba(75, 85, 99, 0.3)'
                  }}
                >
                  <div className="text-center relative z-10">
                    {/* Stars and Reviews */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-4 h-4"
                            style={{
                              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                              backgroundColor: '#fbbf24',
                              boxShadow: '0 0 8px rgba(251, 191, 36, 0.6), 0 0 16px rgba(251, 191, 36, 0.3)'
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <img 
                          src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" 
                          alt="Google" 
                          className="h-4 w-4 opacity-80"
                        />
                        <div 
                          className="w-4 h-4 opacity-80"
                          style={{
                            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                            backgroundColor: '#00b67a'
                          }}
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl leading-tight mb-2 text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                      Pop Up Banners
                    </h1>
                    
                    {/* Subtitle */}
                    <p className="text-gray-300 text-sm">
                      Portable display banners. Perfect for trade shows and events.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Preview - Back to Square */}
              <div className="relative w-full aspect-square md:rounded-lg overflow-hidden p-4 md:p-0">
                {/* Background Image */}
                <img
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761074207/product-background_l717op.png"
                  alt="Background"
                  className="w-full h-full object-cover absolute inset-0"
                  style={{
                    transform: 'scale(1.15)'
                  }}
                />
                
                {/* Product Image Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img 
                    src={typeImages[selectedType]}
                    alt={`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Pop Up Banner Preview`}
                    className="animate-float"
                    style={{
                      width: '90%',
                      height: '90%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(8px 8px 16px rgba(0, 0, 0, 0.4)) drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.3))'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Configuration Options - Right Side */}
            <div className="container-style p-4 md:p-6 lg:p-8 mt-4 md:mt-0">
              
              {/* Frame Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span role="img" aria-label="frame" className="text-purple-400">
                    🎯
                  </span>
                  Select Frame
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => setSelectedType('economy')}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedType === 'economy'
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple'
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    {/* 5% OFF Pill - Desktop only (top right) */}
                    <div className="hidden md:block absolute top-2 right-2 bg-green-500/90 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      5% OFF
                    </div>
                    <div className="text-sm font-medium mb-1">Economy</div>
                    {/* Subtext on desktop, 5% OFF pill on mobile */}
                    <div className="text-xs text-gray-300">
                      <span className="hidden md:inline">Standard Quality</span>
                      <span className="md:hidden inline-block bg-green-500/90 text-white font-bold px-2 py-0.5 rounded-full">5% OFF</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedType('luxury')}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedType === 'luxury'
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple'
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">Luxury</div>
                    <div className="text-xs text-gray-300 hidden md:block">High Quality</div>
                  </button>
                  <button
                    onClick={() => setSelectedType('premium')}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedType === 'premium'
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple'
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">Premium</div>
                    <div className="text-xs text-gray-300 hidden md:block">Enhanced Quality</div>
                  </button>
                </div>
              </div>

              {/* Size Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span role="img" aria-label="size" className="text-blue-400">
                    📏
                  </span>
                  Select Size
                </h3>
                {selectedType === 'premium' ? (
                  // Premium only has one size
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <button
                      className="button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue"
                    >
                      <div className="text-sm font-medium mb-1">Standard</div>
                      <div className="text-xs text-gray-300">33.5" x 82"</div>
                    </button>
                  </div>
                ) : (
                  // Regular and Luxury have 3 sizes
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <button
                      onClick={() => setSelectedSize('small')}
                      className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                        selectedSize === 'small'
                          ? 'bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue'
                          : 'hover:bg-white/10 border-white/20 text-white/80'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">Small</div>
                      <div className="text-xs text-gray-300">31.5" x 78.75"</div>
                    </button>
                    <button
                      onClick={() => setSelectedSize('medium')}
                      className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                        selectedSize === 'medium'
                          ? 'bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue'
                          : 'hover:bg-white/10 border-white/20 text-white/80'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">Medium</div>
                      <div className="text-xs text-gray-300">33.5" x 78.75"</div>
                    </button>
                    <button
                      onClick={() => setSelectedSize('large')}
                      className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                        selectedSize === 'large'
                          ? 'bg-blue-500/20 text-blue-200 font-medium border-blue-400/50 button-selected animate-glow-blue'
                          : 'hover:bg-white/10 border-white/20 text-white/80'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">Large</div>
                      <div className="text-xs text-gray-300">39.5" x 78.75"</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span className="text-green-400">#️⃣</span>
                  Select Quantity
                </h3>
                <div className="space-y-3 mb-3">
                  {[1, 5, 10, 25].map(qty => {
                    const qtyPricing = calculateTotal(qty);
                    const percentOff = qty === 5 ? '15% OFF' : qty === 10 ? '25% OFF' : qty === 25 ? '35% OFF' : null;
                    
                    return (
                      <button
                        key={qty}
                        onClick={() => setSelectedQuantity(qty)}
                        className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl transition-all border backdrop-blur-md ${
                          selectedQuantity === qty
                            ? 'bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green'
                            : 'hover:bg-white/10 border-white/20 text-white/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{qty}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-lg border ${
                                selectedQuantity === qty ? 'text-white' : 'text-green-200'
                              }`}
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(34, 197, 94, 0.05) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                backdropFilter: 'blur(12px)'
                              }}
                            >
                              ${qtyPricing.total.toFixed(2)}
                            </span>
                            {percentOff ? (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">{percentOff}</span>
                            ) : (
                              <span className="text-xs text-gray-400">Full Price</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload and Options Section - Two Column on Desktop, Stacked on Mobile */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:items-center">
                {/* File Upload Area - Left Column on Desktop, Full Width on Mobile */}
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".ai,.eps,.psd,.svg,.png,.jpg,.jpeg,.pdf"
                    aria-label="Upload artwork file"
                  />

                  {!uploadedFile ? (
                    <div className="container-style p-4">
                      {isUploading ? (
                        <div>
                          <div className="text-4xl mb-3 text-center">⏳</div>
                          <p className="text-white font-medium text-base mb-2 text-center">Uploading...</p>
                          {uploadProgress && (
                            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                              <div 
                                className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.percentage}%` }}
                              ></div>
                            </div>
                          )}
                          {uploadProgress && (
                            <p className="text-white/80 text-sm text-center">{uploadProgress.percentage}% complete</p>
                          )}
                        </div>
                      ) : (
                        <div 
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 transition-colors"
                        >
                          <label htmlFor="file-upload" className="cursor-pointer">
                            {/* Desktop Upload Text */}
                            <div className="hidden md:block text-white/80 text-sm">
                              <p className="font-medium mb-1">📤 Upload Your Design</p>
                              <p className="text-xs text-white/60">Drag & drop or click to browse</p>
                              <p className="text-xs text-white/40 mt-2">.AI, .EPS, .PSD, .SVG, .PNG, .JPG, .PDF</p>
                            </div>
                            {/* Mobile Upload Text */}
                            <div className="md:hidden text-white/80 text-sm">
                              <p className="font-medium">📤 Tap to upload</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-8 bg-green-500/20 backdrop-blur-md animate-glow-green"
                         style={{
                           border: '1.5px solid rgba(34, 197, 94, 0.5)'
                         }}>
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
                          {/* Filename and Buttons */}
                          <div className="mb-3">
                            <div className="flex items-center gap-3 min-w-0 mb-2">
                              <div className="text-green-400 text-xl">📎</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-green-200 font-medium break-words text-lg">{uploadedFile.original_filename}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Replace file"
                              >
                                🔄 Replace
                              </button>
                              <button
                                onClick={removeUploadedFile}
                                className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>

                          {/* File Details */}
                          <div className="space-y-2">
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
                </div>

                {/* Rush Order and Instagram - Right Column (50% width) */}
                <div className="space-y-4">
                  {/* Rush Order Toggle */}
                  <div>
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
                  </div>

                  {/* Instagram Toggle */}
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
                        Post to Instagram
                      </label>
                    </div>
                    
                    {postToInstagram && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-white text-xl">@</span>
                        <input
                          type="text"
                          value={instagramUsername}
                          onChange={(e) => setInstagramUsername(e.target.value)}
                          placeholder="your_instagram_handle"
                          className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm"
                          style={{
                            backdropFilter: 'blur(12px)'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="container-style p-6 transition-colors duration-200">
                <h3 className="text-white font-semibold mb-3">Pricing Breakdown</h3>
            
                {pricing.total > 0 ? (
                  <div className="space-y-2 text-sm">
                    {/* Frame Cost */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-300">
                        Frame Cost ({selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}){selectedQuantity > 1 ? ` (×${selectedQuantity})` : ''}
                      </span>
                      <span className="text-white font-medium">${(pricing.frameCost * selectedQuantity).toFixed(2)}</span>
                    </div>

                    {/* Economy Frame Discount */}
                    {pricing.frameDiscount > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-green-400">Economy Frame Discount (5%){selectedQuantity > 1 ? ` (×${selectedQuantity})` : ''}</span>
                        <span className="text-green-400 font-medium">-${(pricing.frameDiscount * selectedQuantity).toFixed(2)}</span>
                      </div>
                    )}

                    {/* Material Cost */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-300">
                        Material Cost ({pricing.sqFt.toFixed(2)} sq ft){selectedQuantity > 1 ? ` (×${selectedQuantity})` : ''}
                      </span>
                      <span className="text-white font-medium">${(pricing.materialCost * selectedQuantity).toFixed(2)}</span>
                    </div>

                    {/* Quantity Discount */}
                    {pricing.discount > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-green-400">Quantity Discount ({Math.round(pricing.discount * 100)}%)</span>
                        <span className="text-green-400 font-medium">-${pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Rush Order Fee */}
                    {pricing.rushFee > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-orange-400">Rush Order (35%)</span>
                        <span className="text-orange-400 font-medium">+${pricing.rushFee.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Spacer before total */}
                    <div className="py-2"></div>

                    {/* Total */}
                    <div className="border-t border-white/20 pt-2 mt-2">
                      <div className="flex justify-between text-white font-semibold text-xl">
                        <span>Total:</span>
                        <span className="text-green-200">${pricing.total.toFixed(2)}</span>
                      </div>
                      <div className="text-right text-gray-300 text-sm">
                        ${(pricing.total / selectedQuantity).toFixed(2)} per banner
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 mt-6">
                      {!pricing.total || pricing.total === 0 ? (
                        /* Disabled Button */
                        <button 
                          disabled
                          className="w-full py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 opacity-50 cursor-not-allowed"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>Select Options</span>
                          </span>
                        </button>
                      ) : (
                        /* Dual Buttons */
                        <div className="flex flex-col sm:flex-row gap-3">
                          {/* Add to Cart & Keep Shopping Button */}
                          <button 
                            onClick={handleAddToCartAndKeepShopping}
                            className="w-full sm:w-1/2 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.0025] cursor-pointer"
                            style={{
                              background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                              color: '#030140',
                              fontWeight: 'bold',
                              boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                              border: 'solid',
                              borderWidth: '0.03125rem',
                              borderColor: '#8d9912'
                            }}
                          >
                            <span className="relative z-10">
                              <span className="hidden sm:inline">Add & Keep Shopping</span>
                              <span className="sm:hidden">Add & Keep Shopping</span>
                            </span>
                          </button>

                          {/* Checkout Button */}
                          <button 
                            onClick={handleCheckout}
                            className="w-full sm:w-1/2 py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 relative overflow-hidden group hover:scale-[1.025] cursor-pointer"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                ) : (
                  <div className="text-center py-4">
                    <p className="text-white/60 text-sm">
                      Select your options to see pricing
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="pt-2 md:pt-4 pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Free Online Proof */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Free Online Proof</span>
                </h3>
              </div>
            </div>

            {/* Printed in 24-48 hours */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Printed in 24-48 hours</span>
                </h3>
              </div>
            </div>

            {/* Free Shipping, always */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Free Shipping, always.</span>
                </h3>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Login/Signup Section - Only show when user is logged out */}
      {!loading && !user && (
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="text-center p-8 md:p-12 rounded-2xl relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              {/* Background decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Floating shapes */}
                <div className="absolute top-8 left-8 w-3 h-3 bg-yellow-400 rounded-full opacity-60"></div>
                <div className="absolute bottom-8 right-8 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
                <div className="absolute top-16 right-16 w-4 h-4 bg-blue-400 rounded-full opacity-40"></div>
                <div className="absolute bottom-16 left-16 w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
                
                {/* Corner stars */}
                <div className="absolute top-12 left-1/2 text-green-400 text-xs">⭐</div>
                <div className="absolute bottom-12 left-1/2 text-pink-400 text-sm">✨</div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Already a customer?
                </h2>
                <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
                  Quick login to track your orders, reorder favorites, and access exclusive customer perks.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/login">
                    <button 
                      className="px-8 py-3 font-semibold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                      style={{
                        backgroundColor: '#ffd713',
                        color: '#030140',
                        boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: '#8d9912'
                      }}
                    >
                      Login
                    </button>
                  </Link>
                  
                  <Link href="/signup">
                    <button className="px-8 py-3 font-semibold text-lg text-white hover:text-gray-200 transition-all duration-300 hover:scale-105 rounded-lg border border-gray-400 hover:border-gray-300">
                      New Customer? <span className="text-yellow-400">Sign Up</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </Layout>
  );
}
