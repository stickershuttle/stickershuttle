import Layout from "@/components/Layout";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { useRouter } from "next/router";
import { PRESET_DEALS, DealProduct, getAllActiveDeals } from "@/data/deals/preset-deals";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";

export default function Deals() {
  const [uploadStates, setUploadStates] = useState<{[key: string]: {
    file: CloudinaryUploadResult | null;
    isUploading: boolean;
    progress: UploadProgress | null;
    error: string | null;
    uploadLater: boolean;
  }}>({});
  
  const { addToCart } = useCart();
  const router = useRouter();
  const activeDeals = getAllActiveDeals();

  // Get or initialize upload state for a deal
  const getUploadState = (dealId: string) => {
    return uploadStates[dealId] || {
      file: null,
      isUploading: false,
      progress: null,
      error: null,
      uploadLater: false
    };
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
      updateUploadState(dealId, { error: validation.error || 'Invalid file' });
      return;
    }

    updateUploadState(dealId, { 
      isUploading: true, 
      error: null, 
      progress: null 
    });

    try {
      const deal = PRESET_DEALS.find(d => d.id === dealId);
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

      updateUploadState(dealId, { 
        file: result, 
        isUploading: false, 
        progress: null 
      });
    } catch (error) {
      updateUploadState(dealId, { 
        error: error instanceof Error ? error.message : 'Upload failed',
        isUploading: false,
        progress: null
      });
    }
  };

  const handleAddToCart = (deal: DealProduct) => {
    const uploadState = getUploadState(deal.id);
    
    const cartItem = {
      id: `deal-${deal.id}-${Date.now()}`,
      product: deal,
      customization: {
        productId: deal.id,
        selections: {
          cut: {
            type: "shape" as const,
            value: "custom-shape",
            displayValue: "Custom Shape",
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
        notes: uploadState.uploadLater ? "Artwork to be uploaded later" : undefined,
        isDeal: true,
        dealPrice: deal.dealPrice
      },
      quantity: deal.dealQuantity,
      unitPrice: deal.dealPrice / deal.dealQuantity,
      totalPrice: deal.dealPrice,
      addedAt: new Date().toISOString()
    };

    addToCart(cartItem);
    router.push('/cart');
  };

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

  const DealCard = ({ deal }: { deal: DealProduct }) => {
    const uploadState = getUploadState(deal.id);
    
    return (
      <div 
        className="rounded-xl p-6 h-full flex flex-col"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
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
          <h3 className="text-xl font-bold text-white mb-2">{deal.name}</h3>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-bold text-green-400">${deal.dealPrice}</span>
            {deal.originalPrice && (
              <span className="text-lg text-gray-400 line-through">${deal.originalPrice}</span>
            )}
          </div>
          {deal.savings && (
            <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30 mb-3">
              Save ${deal.savings}
            </div>
          )}
          <p className="text-gray-300 text-sm mb-4">{deal.shortDescription}</p>
          
          {/* Features */}
          <div className="space-y-1 mb-4">
            {deal.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <span>•</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-4">
          {!uploadState.file ? (
            <div>
              <input
                id={`file-input-${deal.id}`}
                type="file"
                accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(deal.id, file);
                }}
                className="hidden"
              />
              
              <div 
                className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer mb-3"
                onClick={() => document.getElementById(`file-input-${deal.id}`)?.click()}
              >
                {uploadState.isUploading ? (
                  <div>
                    <div className="text-2xl mb-2">⏳</div>
                    <p className="text-white text-sm mb-2">Uploading...</p>
                    {uploadState.progress && (
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadState.progress.percentage}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl mb-2">📁</div>
                    <p className="text-white text-xs">Upload Artwork</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs">
                <button
                  onClick={() => updateUploadState(deal.id, { uploadLater: !uploadState.uploadLater })}
                  className={`w-8 h-4 rounded-full transition-colors ${
                    uploadState.uploadLater ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                    uploadState.uploadLater ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className="text-purple-200">Upload Later</span>
              </div>
            </div>
          ) : (
            <div className="border border-green-400/50 rounded-lg p-3 bg-green-500/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={uploadState.file.secure_url}
                      alt={uploadState.file.original_filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-green-200 text-xs truncate">{uploadState.file.original_filename}</p>
                    <p className="text-green-300/80 text-xs">
                      {(uploadState.file.bytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updateUploadState(deal.id, { file: null, error: null })}
                  className="text-red-300 hover:text-red-200 text-sm ml-2"
                >
                  🗑️
                </button>
              </div>
            </div>
          )}
          
          {uploadState.error && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-400/50 rounded text-red-200 text-xs">
              {uploadState.error}
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={() => handleAddToCart(deal)}
          disabled={!uploadState.file && !uploadState.uploadLater}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
            (uploadState.file || uploadState.uploadLater)
              ? 'text-white hover:scale-105'
              : 'text-gray-500 cursor-not-allowed opacity-50'
          }`}
          style={
            (uploadState.file || uploadState.uploadLater) ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            } : {
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }
          }
        >
          Add to Cart - ${deal.dealPrice}
        </button>
      </div>
    );
  };

  return (
    <Layout title="Special Deals - Premium Sticker Packages | Sticker Shuttle">
      {/* Hero Section */}
      <section className="py-12">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
              Special Deals
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              Pre-set sticker packages at unbeatable prices
            </p>
            <div className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
              🔥 Limited Time Offers
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="pb-12">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Our Deals Section */}
      <section className="py-12">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="rounded-xl p-8 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">Why Choose Our Deal Packages?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl mb-3">💰</div>
                <h3 className="text-xl font-semibold text-white mb-2">Best Value</h3>
                <p className="text-gray-300">Save up to $29 compared to regular pricing with our bulk deal packages.</p>
              </div>
              <div>
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Configuration</h3>
                <p className="text-gray-300">Pre-set quantities and sizes mean faster ordering and quicker checkout.</p>
              </div>
              <div>
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="text-xl font-semibold text-white mb-2">Premium Quality</h3>
                <p className="text-gray-300">All deals include our premium materials with 7-year laminate protection.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Need Custom Configuration? */}
      <section className="pb-12">
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
    </Layout>
  );
}




