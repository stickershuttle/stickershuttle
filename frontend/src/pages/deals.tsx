import Layout from "@/components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/components/CartContext";
import { useRouter } from "next/router";
import { PRESET_DEALS, DealProduct, getAllActiveDeals } from "@/data/deals/preset-deals";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";
import { useQuery } from "@apollo/client";
import { GET_USER_PROFILE } from "@/lib/profile-mutations";
import { getSupabase } from "@/lib/supabase";

// ImagePreview component for handling different file types
const ImagePreview = ({ fileUrl, fileName, format }: { 
  fileUrl: string; 
  fileName: string; 
  format: string; 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const extension = format.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
  const isDesignFile = ['ai', 'eps', 'psd', 'pdf'].includes(extension);
  
  // Helper function to get converted image URL for design files
  const getConvertedImageUrl = (url: string, format: string) => {
    if (!url.includes('cloudinary.com')) return url;
    
    // For AI, PSD, EPS, PDF files, convert to PNG with specific dimensions
    if (['ai', 'psd', 'eps', 'pdf'].includes(format.toLowerCase())) {
      // Insert conversion parameters before the version and filename
      return url.replace(
        /\/v\d+\//,
        '/c_fit,h_200,w_200,f_png/v1737598800/'
      );
    }
    
    return url;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Try to show image preview for regular images and converted design files
  if ((isImage || isDesignFile) && !imageError) {
    return (
      <img 
        src={isDesignFile ? getConvertedImageUrl(fileUrl, format) : fileUrl}
        alt="Uploaded artwork preview"
        className="image-preview object-contain max-h-full"
        onError={handleImageError}
      />
    );
  }

  // Fallback to file type icon
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

  const iconUrl = getFileTypeIcon(format);
  
  return iconUrl ? (
    <img 
      src={iconUrl} 
      alt={`${format.toUpperCase()} file`}
      className="max-w-16 max-h-16 object-contain opacity-80"
    />
  ) : (
    <div className="text-green-400 text-4xl opacity-50">📎</div>
  );
};

export default function Deals() {
  const [deals, setDeals] = useState<DealProduct[]>(PRESET_DEALS);
  const [user, setUser] = useState<any>(null);
  const [checkingUser, setCheckingUser] = useState<boolean>(true);
  const [uploadStates, setUploadStates] = useState<{[key: string]: {
    file: CloudinaryUploadResult | null;
    isUploading: boolean;
    progress: UploadProgress | null;
    error: string | null;
    showPreview: boolean;
  }}>({});
  
  const [shapeSelections, setShapeSelections] = useState<{[key: string]: string}>({});
  const [successMessages, setSuccessMessages] = useState<{[key: string]: boolean}>({});
  const [cartCounts, setCartCounts] = useState<{[key: string]: number}>({});
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  
  const { addToCart } = useCart();
  const router = useRouter();
  
  // Load user session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (e) {
        // no-op
      } finally {
        setCheckingUser(false);
      }
    };
    loadUser();
  }, []);

  // Query profile for wholesale status
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const isWholesale = !!profileData?.getUserProfile?.isWholesaleCustomer;

  // Redirect wholesale users away from deals page
  useEffect(() => {
    if (isWholesale) {
      router.replace('/products');
    }
  }, [isWholesale, router]);

  // Load deals from localStorage or use preset deals
  const loadDeals = () => {
    try {
      const savedDeals = localStorage.getItem('sticker-shuttle-admin-deals');
      if (savedDeals) {
        const parsedDeals = JSON.parse(savedDeals);
        setDeals(parsedDeals);
      } else {
        setDeals(PRESET_DEALS);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
      setDeals(PRESET_DEALS);
    }
  };

  // Load deals on component mount and listen for admin updates
  useEffect(() => {
    loadDeals();

    // Listen for deals updates from admin panel
    const handleDealsUpdated = (event: any) => {
      if (event.detail && event.detail.deals) {
        setDeals(event.detail.deals);
      } else {
        loadDeals(); // Fallback to loading from localStorage
      }
    };

    window.addEventListener('deals-updated', handleDealsUpdated);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('deals-updated', handleDealsUpdated);
    };
  }, []);

  const activeDeals = deals.filter(deal => deal.isActive);



  // Get or initialize upload state for a deal
  const getUploadState = (dealId: string) => {
    return uploadStates[dealId] || {
      file: null,
      isUploading: false,
      progress: null,
      error: null,
      showPreview: false
    };
  };

  // Get or initialize shape selection for a deal
  const getShapeSelection = (dealId: string): string => {
    return shapeSelections[dealId] || 'custom-shape';
  };


  
  // Update shape selection for a specific deal
  const updateShapeSelection = (dealId: string, shape: string) => {
    setShapeSelections(prev => ({
      ...prev,
      [dealId]: shape
    }));
  };

  // Get quantity for a deal (default to 1)
  const getQuantity = (dealId: string): number => {
    return quantities[dealId] || 1;
  };

  // Update quantity for a specific deal
  const updateQuantity = (dealId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [dealId]: Math.max(1, quantity) // Ensure minimum quantity of 1
    }));
  };

  // Get file type icon based on format (matching calculators)
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

  // Update upload state for a specific deal
  const updateUploadState = (dealId: string, updates: any) => {
    setUploadStates(prev => ({
      ...prev,
      [dealId]: { ...getUploadState(dealId), ...updates }
    }));
  };



  const handleFileUpload = async (dealId: string, file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      updateUploadState(dealId, { error: validation.error || 'Invalid file', showPreview: false });
      return;
    }

    updateUploadState(dealId, { 
      isUploading: true, 
      error: null, 
      progress: null,
      showPreview: false
    });

    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) return;
      
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: "Custom Shape",
          selectedMaterial: deal.name.includes('Chrome') ? 'Chrome' : deal.name.includes('Holographic') ? 'Holographic' : 'Matte',
          selectedSize: `${deal.dealSize} Max Width`,
          selectedQuantity: deal.dealQuantity.toString(),
          totalPrice: `$${deal.dealPrice.toFixed(2)}`,
          costPerSticker: `$${(deal.dealPrice / deal.dealQuantity).toFixed(2)}/ea.`
        },
        (progress) => updateUploadState(dealId, { progress }),
        'deals-orders'
      );

      // Keep uploading animation while preview loads
      updateUploadState(dealId, { 
        file: result, 
        progress: null,
        isUploading: true,
        showPreview: false // Don't show preview yet
      });

      // Wait for preview to fully load before showing it
      setTimeout(() => {
        updateUploadState(dealId, { 
          isUploading: false,
          showPreview: true,
          file: result
        });
      }, 1200);
    } catch (error) {
      updateUploadState(dealId, { 
        error: error instanceof Error ? error.message : 'Upload failed',
        isUploading: false,
        progress: null,
        showPreview: false
      });
    }
  };

  const handleAddToCart = (deal: DealProduct) => {
    const uploadState = getUploadState(deal.id);
    const selectedShape = getShapeSelection(deal.id);
    const selectedQuantity = getQuantity(deal.id);
    
    const shapeDisplayNames = {
      'custom-shape': 'Custom Shape',
      'circle': 'Circle',
      'square': 'Square', 
      'rectangle': 'Rectangle',
      'oval': 'Oval'
    };

    // Add multiple cart items based on selected quantity
    for (let i = 0; i < selectedQuantity; i++) {
      const cartItem = {
        id: `deal-${deal.id}-${Date.now()}-${i}`,
        product: deal,
        customization: {
          productId: deal.id,
      selections: {
        cut: {
          type: "shape" as const,
            value: selectedShape,
            displayValue: shapeDisplayNames[selectedShape as keyof typeof shapeDisplayNames] || 'Custom Shape',
          priceImpact: 0
        },
        material: {
          type: "finish" as const,
              value: deal.name.includes('Chrome') ? 'chrome' : deal.name.includes('Holographic') ? 'holographic' : 'matte',
              displayValue: deal.name.includes('Chrome') ? 'Chrome' : deal.name.includes('Holographic') ? 'Holographic' : 'Matte',
          priceImpact: 0
        },
        size: {
          type: "size-preset" as const,
              value: deal.dealSize.replace(/['"]/g, ''),
              displayValue: `${deal.dealSize} Max Width`,
          priceImpact: 0
        },
        quantity: {
          type: "quantity" as const,
              value: deal.dealQuantity,
              displayValue: deal.dealQuantity.toString(),
          priceImpact: 0
        }
      },
          totalPrice: deal.dealPrice,
          customFiles: uploadState.file ? [uploadState.file.secure_url] : undefined,
      isDeal: true,
          dealPrice: deal.dealPrice
        },
        quantity: deal.dealQuantity,
        unitPrice: deal.dealPrice / deal.dealQuantity,
        totalPrice: deal.dealPrice,
      addedAt: new Date().toISOString()
    };

    addToCart(cartItem);
    }
    
    // Update cart count for this deal
    setCartCounts(prev => ({
      ...prev,
      [deal.id]: (prev[deal.id] || 0) + selectedQuantity
    }));
    
    // Show success message
    setSuccessMessages(prev => ({ ...prev, [deal.id]: true }));
    
    // Reset upload state so they can add more
    updateUploadState(deal.id, { 
      file: null, 
      error: null, 
      isUploading: false,
      progress: null 
    });
    
    // Reset shape selection to default
    setShapeSelections(prev => ({ ...prev, [deal.id]: 'custom-shape' }));
    
    // Reset quantity to 1
    setQuantities(prev => ({ ...prev, [deal.id]: 1 }));
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessages(prev => ({ ...prev, [deal.id]: false }));
    }, 3000);
  };

  const DealCard = ({ deal }: { deal: DealProduct }) => {
    const uploadState = getUploadState(deal.id);
                          
                          return (
                            <div 
        className="rounded-xl p-6 h-full flex flex-col relative"
                              style={{
          background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
                            }}
                          >
                        {/* Cart Count Indicator - Top Left */}
        {cartCounts[deal.id] > 0 && (
          <div className="absolute -top-2 -left-2 px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-green-500 to-green-400 text-white shadow-lg z-10">
            {cartCounts[deal.id]} in cart
                            </div>
        )}

                        {/* Save Pill - Top Right */}
        {deal.savings && (
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-sm font-medium holographic-save-container z-10">
            <span className="holographic-save-text">Save ${deal.savings}</span>
                          </div>
        )}
        {/* Deal Image */}
        <div className="mb-4 flex justify-center">
          <img 
            src={deal.defaultImage} 
            alt={deal.name}
            className="w-24 h-24 object-contain"
          />
                          </div>

        {/* Deal Info */}
        <div className="text-center mb-4 flex-grow">
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>{deal.name}</h3>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span 
              className={`text-4xl font-bold ${
                deal.name.includes('Holographic') ? 'holographic-price-text' : 
                deal.name.includes('Chrome') ? 'chrome-price-text' : 
                'text-green-400 glow-price-text'
              }`}
              style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}
            >
              ${deal.dealPrice}
            </span>
            {deal.originalPrice && (
              <span className="text-lg text-gray-400 line-through glow-original-price" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>${deal.originalPrice}</span>
            )}
                          </div>
          <p className="text-gray-300 text-sm">{deal.shortDescription}</p>
                          </div>

        {/* Shape Selection Dropdown */}
        <div className="mb-4">
          <div className="relative">
            <select
              value={getShapeSelection(deal.id)}
              onChange={(e) => updateShapeSelection(deal.id, e.target.value)}
              className="w-full p-3 rounded-lg text-white text-sm font-medium appearance-none cursor-pointer pr-10 shape-dropdown"
              aria-label="Select sticker shape"
                            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)',
                outline: 'none'
              }}
            >
              <option value="custom-shape">Custom Shape</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
              <option value="oval">Oval</option>
            </select>
            <svg 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
                          </div>
                    </div>

        {/* Upload Section */}
        <div className="mb-4">
                    <input
            id={`file-input-${deal.id}`}
                      type="file"
                      accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(deal.id, file);
            }}
                      className="hidden"
                      aria-label="Upload artwork file"
                    />

          {uploadState.isUploading ? (
                        <div 
              className="border-2 border-dashed border-purple-400/50 rounded-xl p-6 text-center backdrop-blur-md relative"
                        >
                            <div className="mb-4">
                              <div className="mb-4 flex justify-center">
                                <div className="upload-spinner"></div>
                              </div>
                              <p className="text-white font-medium text-base mb-2">Uploading...</p>
                  {uploadState.progress && (
                                <div className="w-full bg-white/20 rounded-full h-3 mb-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-purple-400 to-blue-400 h-full rounded-full transition-all duration-300 relative"
                        style={{ width: `${uploadState.progress.percentage}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                  </div>
                                </div>
                              )}
                  {uploadState.progress && (
                    <p className="text-white/80 text-sm font-medium">{uploadState.progress.percentage}% complete</p>
                              )}
                            </div>
                              </div>
          ) : uploadState.showPreview && uploadState.file ? (
                        <div className="border border-green-400/50 rounded-xl p-4 bg-green-500/10 backdrop-blur-md">
              {/* Fixed Image Preview Section */}
              <div className="mb-4 h-32 flex items-center justify-center">
                {uploadState.file.secure_url ? (
                  <ImagePreview 
                    fileUrl={uploadState.file.secure_url}
                    fileName={uploadState.file.original_filename}
                    format={uploadState.file.format}
                  />
                ) : (
                  <div className="text-green-400 text-4xl opacity-50">📎</div>
                          )}
                        </div>

              <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-green-400 text-xl">
                    {uploadState.file.format === 'png' || uploadState.file.format === 'jpg' || uploadState.file.format === 'jpeg' ? '🖼️' : '📎'}
                              </div>
                              <div className="min-w-0 flex-1">
                    <p className="text-green-200 font-medium break-words text-sm">{uploadState.file.original_filename}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                    onClick={() => document.getElementById(`file-input-${deal.id}`)?.click()}
                                className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Replace file"
                              >
                                🔄
                              </button>
                              <button
                    onClick={() => updateUploadState(deal.id, { file: null, error: null, showPreview: false })}
                                className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
              
              {/* File Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-xs">
                                    <span className="flex items-center gap-1">
                                      <span className="text-green-400">📏</span>
                    {(uploadState.file.bytes / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-green-400">🎨</span>
                    {uploadState.file.format.toUpperCase()}
                                    </span>
                  {uploadState.file.width && uploadState.file.height && (
                                      <span className="flex items-center gap-1">
                                        <span className="text-green-400">📐</span>
                      {uploadState.file.width}x{uploadState.file.height}px
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* File Type Icon */}
                {getFileTypeIcon(uploadState.file.format) && (
                  <div className="flex items-center gap-2 mb-2">
                                      <img 
                      src={getFileTypeIcon(uploadState.file.format)!} 
                      alt={`${uploadState.file.format.toUpperCase()} file`}
                                        className="w-6 h-6 object-contain opacity-80"
                                      />
                                      <span className="text-xs text-green-300/60">
                                        Professional design file detected
                                      </span>
                                    </div>
                                  )}

                {/* Upload Success Message */}
                <div className="flex items-center gap-2 text-green-300 text-xs">
                            <span className="text-green-400">✅</span>
                            <span>File uploaded successfully!</span>
                                </div>
                              </div>
                            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative"
              onClick={() => document.getElementById(`file-input-${deal.id}`)?.click()}
            >
                            <div className="mb-4">
                              <div className="mb-3 flex justify-center -ml-4">
                                <img 
                                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                                  alt="Upload file" 
                      className="w-16 h-16 object-contain"
                                />
                            </div>
                  <p className="text-white font-medium text-sm mb-2 hidden md:block">Click to upload your file</p>
                  <p className="text-white font-medium text-sm mb-2 md:hidden">Tap to upload file</p>
                  <p className="text-white/80 text-xs">All formats supported. Max file size: 25MB</p>
                          </div>
                        </div>
                      )}

          {uploadState.error && (
                        <div className="mt-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                          <p className="text-red-200 text-sm flex items-center gap-2">
                            <span>⚠️</span>
                {uploadState.error}
                          </p>
                        </div>
                      )}
                    </div>

        {/* Add to Cart Button with Quantity Controls */}
        <div className="relative">
                          <button
            onClick={() => handleAddToCart(deal)}
            disabled={!uploadState.file}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all relative ${
              uploadState.file
                ? 'text-yellow-100 hover:text-white hover:scale-[1.01] cursor-pointer'
                : 'text-gray-500 cursor-not-allowed opacity-50'
            }`}
            style={
              uploadState.file ? {
                background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.6) 0%, rgba(255, 215, 0, 0.4) 25%, rgba(250, 204, 21, 0.25) 50%, rgba(255, 193, 7, 0.15) 75%, rgba(250, 204, 21, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(200%)',
                border: '1px solid rgba(255, 215, 0, 0.5)',
                boxShadow: 'rgba(250, 204, 21, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
              } : {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }
            }
          >
            Add to Cart - ${(deal.dealPrice * getQuantity(deal.id)).toFixed(2)}
                          </button>
          
          {/* Quantity Controls - Only show when file is uploaded */}
          {uploadState.file && (
            <>
              {/* Minus Button */}
              {getQuantity(deal.id) > 1 && (
                      <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(deal.id, getQuantity(deal.id) - 1);
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 text-white text-lg flex items-center justify-center cursor-pointer"
                >
                  -
                      </button>
              )}
              
              {/* Plus Button */}
                        <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(deal.id, getQuantity(deal.id) + 1);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 text-white text-lg flex items-center justify-center cursor-pointer"
              >
                +
                        </button>
            </>
          )}
        </div>
                          
        {/* Success Message */}
        {successMessages[deal.id] && (
          <div className="mt-3 p-3 bg-green-500/20 border border-green-400/50 rounded-lg animate-fadeIn">
            <div className="flex items-center gap-2 text-green-300 text-sm font-medium">
              <span className="text-green-400">🎉</span>
              <span>Added to cart! Upload another file to add more.</span>
                    </div>
                  </div>
                )}
              </div>
    );
  };

  // Prevent flash if redirecting
  if (isWholesale) return null;

  return (
    <Layout title="Special Deals - Premium Sticker Packages | Sticker Shuttle">
      {/* Hero Section */}
      <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white flex items-center justify-center gap-3 deals-title-underline" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
              Active Deals
            </h1>
                </div>
              </div>
        </section>

      {/* Deals Grid */}
      <section className="pb-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
                </div>
                </div>
        </section>



      {/* Need Custom Configuration? */}
      <section className="pb-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
              <div 
            className="rounded-xl p-6 text-center"
                  style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">Need Custom Configuration?</h3>
            <p className="text-gray-300 mb-6">
              Want different sizes, quantities, or materials? Check out our full product catalog for complete customization options.
            </p>
            <Link href="/products">
              <button 
                className="px-8 py-3 rounded-lg font-bold transition-all hover:scale-105"
                  style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Browse All Products
              </button>
            </Link>
                  </div>
                  </div>
        </section>

      {/* Holographic Save Pill Styles */}
      <style jsx global>{`
        .holographic-save-container {
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          backdrop-filter: blur(35px) !important;
          -webkit-backdrop-filter: blur(35px) !important;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 
                      inset 0 0 20px rgba(255, 255, 255, 0.1) !important;
          font-weight: normal !important;
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .holographic-save-text {
          background: linear-gradient(45deg, 
            #ff0080, #ff8000, #ffff00, #80ff00, 
            #00ff80, #0080ff, #8000ff, #ff0080) !important;
          background-size: 400% 400% !important;
          animation: holographic-shift-deals 3s ease-in-out infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

                @keyframes holographic-shift-deals {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Price Glow Effects */
        .glow-price-text {
          text-shadow: 0 0 10px rgba(124, 232, 105, 0.5), 
                       0 0 20px rgba(124, 232, 105, 0.3), 
                       0 0 30px rgba(124, 232, 105, 0.2) !important;
        }

        .glow-original-price {
          text-shadow: 0 0 5px rgba(156, 163, 175, 0.3) !important;
        }

        /* Holographic Price Effect */
        .holographic-price-text {
          background: linear-gradient(45deg, 
            #ff0080, #ff4000, #ff8000, #ffff00, #80ff00, 
            #00ff80, #00ffff, #0080ff, #8000ff, #ff0080, 
            #ff0080, #ff4000, #ff8000, #ffff00, #80ff00) !important;
          background-size: 400% 400% !important;
          -webkit-animation: holographic-shift-price 2s linear infinite !important;
          animation: holographic-shift-price 2s linear infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3) !important;
        }

        @-webkit-keyframes holographic-shift-price {
          0% { background-position: 0% 0%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }

        @keyframes holographic-shift-price {
          0% { background-position: 0% 0%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }

        /* Chrome Price Effect */
        .chrome-price-text {
          background: linear-gradient(45deg, 
            #c0c0c0, #ffffff, #e8e8e8, #d4d4d4, 
            #ffffff, #c0c0c0, #a8a8a8, #ffffff) !important;
          background-size: 400% 400% !important;
          animation: chrome-shift-price 3s ease-in-out infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          text-shadow: 0 0 10px rgba(192, 192, 192, 0.5), 
                       0 0 20px rgba(255, 255, 255, 0.3) !important;
        }

                @keyframes chrome-shift-price {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 25%; }
          50% { background-position: 0% 75%; }
          75% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Shape Dropdown Styles */
        .shape-dropdown:focus {
          outline: none !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset !important;
        }

        .shape-dropdown option {
          background: rgba(30, 30, 40, 0.95) !important;
          color: white !important;
          padding: 8px !important;
        }

        .shape-dropdown option:hover {
          background: rgba(59, 130, 246, 0.8) !important;
          color: white !important;
        }

        .shape-dropdown option:checked,
        .shape-dropdown option:selected {
          background: rgba(59, 130, 246, 0.9) !important;
          color: white !important;
        }

        /* Upload Spinner Animation */
        .upload-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-left: 4px solid rgba(147, 51, 234, 0.8);
          border-radius: 50%;
          animation: upload-spin 1s linear infinite;
          backdrop-filter: blur(8px);
          box-shadow: 0 0 20px rgba(147, 51, 234, 0.3), 
                      inset 0 0 20px rgba(255, 255, 255, 0.1);
        }

        @keyframes upload-spin {
          0% { 
            transform: rotate(0deg); 
            border-left-color: rgba(147, 51, 234, 0.8);
          }
          25% { 
            border-left-color: rgba(59, 130, 246, 0.8);
          }
          50% { 
            transform: rotate(180deg); 
            border-left-color: rgba(16, 185, 129, 0.8);
          }
          75% { 
            border-left-color: rgba(139, 92, 246, 0.8);
          }
          100% { 
            transform: rotate(360deg); 
            border-left-color: rgba(147, 51, 234, 0.8);
          }
        }

                /* Image Preview Styles */
        .image-preview {
          max-width: 120px;
          max-height: 120px;
          border-radius: 8px;
        }

        /* Success Message Animation */
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hand-drawn Underline for Active Deals Title - Matching "not" style */
        .deals-title-underline {
          position: relative;
          display: inline-block;
        }
        
        .deals-title-underline::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 4px;
          background: #fbbf24;
          transform: rotate(1deg);
          border-radius: 9999px;
        }
        `}</style>
    </Layout>
  );
}




