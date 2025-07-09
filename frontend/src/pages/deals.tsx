import Layout from "@/components/Layout";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";
import { useCart } from "@/components/CartContext";
import { useRouter } from "next/router";

interface Deal {
  id: string;
  name: string;
  headline: string;
  buttonText: string;
  pills: string[];
  isActive: boolean;
  orderDetails: {
    material: string;
    size: string;
    quantity: number;
    price: number;
  };
}

export default function Deals() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadLater, setUploadLater] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const { addToCart } = useCart();
  const router = useRouter();

  // Get file type icon based on format
  const getFileTypeIcon = (format: string) => {
    const icons: { [key: string]: string } = {
      'ai': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/ai-icon_hbqxvs.png',
      'psd': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/psd-icon_hbqxvs.png',
      'svg': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/svg-icon_hbqxvs.png',
      'eps': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/eps-icon_hbqxvs.png',
      'pdf': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/pdf-icon_hbqxvs.png'
    };
    return icons[format.toLowerCase()] || null;
  };

  // Load active deal from localStorage
  useEffect(() => {
    const savedDeals = localStorage.getItem('sticker-shuttle-deals');
    if (savedDeals) {
      const deals = JSON.parse(savedDeals);
      const active = deals.find((deal: Deal) => deal.isActive);
      if (active) {
        setActiveDeal(active);
      }
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(null);

    try {
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: "Custom Shape",
          selectedMaterial: "Matte",
          selectedSize: "3\" Max Width",
          selectedQuantity: "100",
          totalPrice: "$29.00",
          costPerSticker: "$0.29/ea."
        },
        (progress) => setUploadProgress(progress),
        'deals-orders'
      );

      setUploadedFile(result);
      console.log('✅ File uploaded successfully:', result);
    } catch (error) {
      console.error('💥 Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
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
    const file = event.dataTransfer.files[0];
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

  const handleAddToCart = () => {
    const dealDetails = activeDeal?.orderDetails || {
      material: 'Matte',
      size: '3"',
      quantity: 100,
      price: 29
    };

    const product = {
      id: activeDeal ? `deals-${activeDeal.id}` : "deals-vinyl-stickers-100",
      sku: activeDeal ? `SS-VS-${activeDeal.id.toUpperCase()}` : "SS-VS-DEAL100",
      name: activeDeal?.name || "100 Custom Stickers - Special Deal",
      description: activeDeal ? `${activeDeal.name} - ${activeDeal.headline.replace('\n', ' ')}` : "Limited time deal: 100 custom vinyl stickers for just $29",
      shortDescription: activeDeal?.name || "100 Custom Stickers Deal",
      category: "vinyl-stickers" as const,
      basePrice: dealDetails.price / dealDetails.quantity,
      pricingModel: "flat-rate" as const,
      images: [uploadedFile?.secure_url || "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591677/Alien_USA_Map_y6wkf4.png"],
      defaultImage: uploadedFile?.secure_url || "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591677/Alien_USA_Map_y6wkf4.png",
      features: activeDeal ? activeDeal.pills.map(pill => pill.replace(/[^\w\s]/g, '').trim()) : ["Matte Vinyl", "3\" Max Width", "Ships Next Day", "Custom Shape"],
      customizable: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calculatorConfig: {
        showPreview: true,
        allowFileUpload: true,
        requireProof: false,
        hasCustomSize: false
      }
    };

    const customization = {
      productId: product.id,
      selections: {
        cut: {
          type: "shape" as const,
          value: "custom-shape",
          displayValue: "Custom Shape",
          priceImpact: 0
        },
        material: {
          type: "finish" as const,
          value: dealDetails.material.toLowerCase(),
          displayValue: dealDetails.material,
          priceImpact: 0
        },
        size: {
          type: "size-preset" as const,
          value: dealDetails.size.replace(/['"]/g, ''),
          displayValue: `${dealDetails.size} Max Width`,
          priceImpact: 0
        },
        quantity: {
          type: "quantity" as const,
          value: dealDetails.quantity,
          displayValue: dealDetails.quantity.toString(),
          priceImpact: 0
        }
      },
      totalPrice: dealDetails.price,
      customFiles: uploadedFile ? [uploadedFile.secure_url] : undefined,
      notes: uploadLater ? "Artwork to be uploaded later" : undefined,
      isDeal: true,
      dealPrice: dealDetails.price
    };

    const cartItem = {
      id: `deals-${dealDetails.quantity}-stickers-${Date.now()}`,
      product: product,
      customization: customization,
      quantity: dealDetails.quantity,
      unitPrice: dealDetails.price / dealDetails.quantity,
      totalPrice: dealDetails.price,
      addedAt: new Date().toISOString()
    };

    addToCart(cartItem);
    router.push('/cart');
  };

  return (
    <Layout title="100 Custom Stickers for $29 - Sticker Shuttle Deals">
        {/* Hero Section */}
        <section className="py-4 -mt-4 md:mt-0">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="relative rounded-xl overflow-hidden pt-1 md:pt-1 pb-0"
              style={{
                backgroundImage: 'url("https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591677/Alien_USA_Map_y6wkf4.png")',
                backgroundSize: '150%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="text-center relative z-10" style={{ 
                  backdropFilter: 'blur(6px)', 
                  backgroundColor: 'rgba(3, 1, 64, 0.15)',
                  borderRadius: '24px',
                  padding: '2rem'
                }}>
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none -z-10">
                  <div 
                    className="w-full h-full opacity-20"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '30px 30px',
                      maskImage: `
                        radial-gradient(ellipse 70% 60% at center, 
                          rgba(0,0,0,1) 0%, 
                          rgba(0,0,0,0.6) 50%, 
                          rgba(0,0,0,0) 100%
                        )
                      `,
                      WebkitMaskImage: `
                        radial-gradient(ellipse 70% 60% at center, 
                          rgba(0,0,0,1) 0%, 
                          rgba(0,0,0,0.6) 50%, 
                          rgba(0,0,0,0) 100%
                        )
                      `
                    }}
                  ></div>
                </div>
                
                {!showUpload ? (
                  // Original promotional content
                  <>
                    <p className="text-lg text-orange-400 mb-4 mt-1 font-bold" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                      🔥 Limited Time Deal
                    </p>
                    
                    <h1 className="text-5xl sm:text-6xl md:text-7xl mb-4 md:mb-8 leading-none relative" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                      {activeDeal ? (
                        activeDeal.headline.split('\n').map((line, index) => (
                          <span key={index} className="block">{line}</span>
                        ))
                      ) : (
                        <>
                          <span className="block">100 custom</span>
                          <span className="block">stickers for <span className="whitespace-nowrap">$29</span></span>
                        </>
                      )}
                    </h1>
                    <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-10">
                      {activeDeal ? (
                        activeDeal.pills.map((pill, index) => {
                          // Determine pill color based on content
                          let bgColor = 'rgba(255, 255, 255, 0.05)';
                          let borderColor = 'rgba(255, 255, 255, 0.1)';
                          let textColor = '#d1d5db';
                          
                          if (pill.includes('Matte') || pill.includes('Material')) {
                            bgColor = 'rgba(168, 242, 106, 0.2)';
                            borderColor = 'rgba(168, 242, 106, 0.4)';
                            textColor = 'rgb(168, 242, 106)';
                          } else if (pill.includes('Size') || pill.includes('"')) {
                            bgColor = 'rgba(59, 130, 246, 0.2)';
                            borderColor = 'rgba(59, 130, 246, 0.4)';
                            textColor = 'rgb(59, 130, 246)';
                          } else if (pill.includes('Ship') || pill.includes('Fast')) {
                            bgColor = 'rgba(255, 215, 19, 0.2)';
                            borderColor = 'rgba(255, 215, 19, 0.4)';
                            textColor = 'rgb(255, 215, 19)';
                          }
                          
                          return (
                            <div 
                              key={index}
                              className="inline-flex items-center px-6 md:px-4 py-2 rounded-full text-sm font-medium"
                              style={{
                                backgroundColor: bgColor,
                                border: `1px solid ${borderColor}`,
                                color: textColor,
                                backdropFilter: 'blur(15px)'
                              }}
                            >
                              {pill}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div 
                            className="inline-flex items-center px-6 md:px-4 py-2 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: 'rgba(168, 242, 106, 0.2)',
                              border: '1px solid rgba(168, 242, 106, 0.4)',
                              color: 'rgb(168, 242, 106)',
                              backdropFilter: 'blur(15px)'
                            }}
                          >
                            🏷️ Matte Vinyl Stickers
                          </div>
                          <div 
                            className="inline-flex items-center px-6 md:px-4 py-2 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              color: 'rgb(59, 130, 246)',
                              backdropFilter: 'blur(15px)'
                            }}
                          >
                            📏 3" Max Width
                          </div>
                          <div 
                            className="inline-flex items-center px-6 md:px-4 py-2 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: 'rgba(255, 215, 19, 0.2)',
                              border: '1px solid rgba(255, 215, 19, 0.4)',
                              color: 'rgb(255, 215, 19)',
                              backdropFilter: 'blur(15px)'
                            }}
                          >
                            🚀 Ships Next Day
                          </div>
                          <div 
                            className="inline-flex items-center px-6 md:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              backdropFilter: 'blur(15px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#d1d5db'
                            }}
                          >
                            👽 Not a conspiracy theory, just great deals.
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-4 mb-4">
                      <button 
                        onClick={() => setShowUpload(true)}
                        className="primaryButton px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                        style={{
                          transform: 'scale(1.1)'
                        }}
                      >
                        {activeDeal?.buttonText || 'Order Now →'}
                      </button>
                    </div>
                  </>
                ) : (
                  // File upload area
                  <div className="min-h-[600px] flex flex-col justify-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                      Upload Your Artwork
                    </h2>
                    
                    {/* Hidden file input */}
                    <input
                      id="file-input"
                      type="file"
                      accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload artwork file"
                    />

                    {/* File Upload Area */}
                    <div className="max-w-lg mx-auto w-full mb-8">
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
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative z-10">
                                <img
                                  src={uploadedFile.secure_url}
                                  alt={uploadedFile.original_filename}
                                  className="w-full h-full object-cover rounded-lg relative z-10"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling!.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-full h-full flex items-center justify-center text-white/60 text-xl relative z-10">
                                  📄
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-green-200 font-medium break-words text-left">{uploadedFile.original_filename}</p>
                                
                                {/* File Information - matching calculator format */}
                                <div className="space-y-2 mt-2">
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
                          {/* Upload Success Message - matching calculator format */}
                          <div className="mt-2 flex items-center gap-2 text-green-300 text-sm">
                            <span className="text-green-400">✅</span>
                            <span>File uploaded successfully!</span>
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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-8 items-center justify-center">
                      <button
                        onClick={() => setShowUpload(false)}
                        className="px-6 py-3 border border-white/30 text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-md"
                      >
                        ← Back to Deal
                      </button>
                      {(uploadedFile || uploadLater) && (
                        <button 
                          onClick={handleAddToCart}
                          className="primaryButton px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                          style={{
                            transform: 'scale(1.1)'
                          }}
                        >
                          Add to Cart - $${activeDeal?.orderDetails.price || 29} →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-12">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-white mb-8">What customers say</h2>
            
            {/* Desktop Reviews Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Review 1 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                    alt="Certified Garbage Rat"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                </p>
              </div>

              {/* Review 2 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                    alt="Panda Reaper"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                </p>
              </div>

              {/* Review 3 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                    alt="Anita J"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Anita J</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                </p>
              </div>

              {/* Review 4 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                    alt="Rach Plants"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                </p>
              </div>
            </div>

            {/* Mobile Swipeable Reviews */}
            <div className="md:hidden overflow-x-auto pb-4 relative">
              
              <div className="flex space-x-4 w-max" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: 'calc(2.5vw + 1rem)', paddingRight: '50vw' }}>
                {/* Last review (positioned before first for endless scroll effect) */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                      alt="Rach Plants"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>

                {/* First review - Now centered */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                      alt="Certified Garbage Rat"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Second review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                      alt="Panda Reaper"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>

                {/* Third review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                      alt="Anita J"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Anita J</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                  </p>
                </div>

                {/* Fourth review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                      alt="Rach Plants"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>

                {/* Duplicate first review for seamless loop */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                      alt="Certified Garbage Rat"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Duplicate second review for seamless loop */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                      alt="Panda Reaper"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brands Section - Moved above footer */}
        <section className="pt-7 pb-4">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div className="flex justify-center mb-6">
              <div 
                className="px-6 py-2 rounded-full text-center text-lg text-gray-300"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                Brands we print for:
              </div>
            </div>
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-6 animate-scroll"
                style={{
                  animation: 'scroll 35s linear infinite',
                  width: 'max-content'
                }}
              >
                {/* First set of brands */}
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
                
                {/* Duplicate set for seamless loop */}
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
              </div>
              
              {/* Fade effects */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none"></div>
            </div>
          </div>
        </section>

        {/* Styles */}
        <style jsx>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .headerButton {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          }

          .headerButton:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
          }

          .logo-hover {
            transition: transform 0.3s ease;
          }

          .logo-hover:hover {
            transform: scale(1.05);
          }

          /* Hero Animation Keyframes */
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(12deg); }
            50% { transform: translateY(-20px) rotate(12deg); }
          }
          
          @keyframes sway {
            0%, 100% { transform: translateX(0px) rotate(6deg); }
            50% { transform: translateX(15px) rotate(-6deg); }
          }
          
          @keyframes drift {
            0% { transform: translateX(0px) translateY(0px); }
            25% { transform: translateX(20px) translateY(-10px); }
            50% { transform: translateX(0px) translateY(-20px); }
            75% { transform: translateX(-20px) translateY(-10px); }
            100% { transform: translateX(0px) translateY(0px); }
          }
          
          @keyframes bob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          /* Hide scrollbar on mobile reviews and product types */
          .md\\:hidden.overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
    </Layout>
  );
}




