import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useCart } from "@/components/CartContext";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import Head from "next/head";
import MarketplaceStickerCalculator from "@/components/marketplace-sticker-calculator";
import { loadRealPricingData, BasePriceRow, QuantityDiscountRow } from "@/utils/real-pricing";

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price: number;
  original_price?: number;
  markup_percentage?: number;
  images: string[];
  default_image: string;
  category: string;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  sold_quantity: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export default function MarketplaceProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [realPricingData, setRealPricingData] = useState<{
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  const supabase = getSupabase();

  useEffect(() => {
    if (id) {
      fetchProduct();
      loadPricing();
    }
    checkUser();
  }, [id]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setUserLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      setPricingLoading(true);
      console.log('🔄 Starting CSV pricing data load...');
      const data = await loadRealPricingData();
      setRealPricingData(data);
      setPricingError(null);
      console.log('✅ Successfully loaded real pricing data:', data);
    } catch (error) {
      console.error('❌ Failed to load real pricing data:', error);
      setPricingError(error instanceof Error ? error.message : 'Failed to load real pricing data from CSV files');
      
      // Enhanced fallback data that matches CSV structure more closely
      const mockData = {
        basePricing: [
          { sqInches: 1, basePrice: 1.17 },
          { sqInches: 2, basePrice: 1.20 },
          { sqInches: 3, basePrice: 1.25 },
          { sqInches: 4, basePrice: 1.30 },
          { sqInches: 6, basePrice: 1.32 },
          { sqInches: 9, basePrice: 1.35 },
          { sqInches: 12, basePrice: 1.45 },
          { sqInches: 16, basePrice: 1.62 },
          { sqInches: 20, basePrice: 1.75 },
          { sqInches: 25, basePrice: 1.91 },
          { sqInches: 30, basePrice: 2.10 },
          { sqInches: 36, basePrice: 2.25 },
          { sqInches: 49, basePrice: 2.50 }
        ],
        quantityDiscounts: [
          { quantity: 50, discounts: { 1: 0.00, 4: 0.00, 9: 0.00, 16: 0.00, 25: 0.00, 36: 0.00, 49: 0.00 } },
          { quantity: 100, discounts: { 1: 0.35, 4: 0.35, 9: 0.35, 16: 0.25, 25: 0.25, 36: 0.20, 49: 0.20 } },
          { quantity: 200, discounts: { 1: 0.53, 4: 0.53, 9: 0.53, 16: 0.40, 25: 0.40, 36: 0.35, 49: 0.35 } },
          { quantity: 300, discounts: { 1: 0.61, 4: 0.61, 9: 0.61, 16: 0.50, 25: 0.50, 36: 0.45, 49: 0.45 } },
          { quantity: 500, discounts: { 1: 0.68, 4: 0.68, 9: 0.68, 16: 0.58, 25: 0.58, 36: 0.53, 49: 0.53 } },
          { quantity: 750, discounts: { 1: 0.76, 4: 0.76, 9: 0.76, 16: 0.65, 25: 0.65, 36: 0.60, 49: 0.60 } },
          { quantity: 1000, discounts: { 1: 0.81, 4: 0.81, 9: 0.81, 16: 0.70, 25: 0.70, 36: 0.65, 49: 0.65 } },
          { quantity: 2500, discounts: { 1: 0.79, 4: 0.79, 9: 0.79, 16: 0.68, 25: 0.68, 36: 0.63, 49: 0.63 } }
        ]
      };
      setRealPricingData(mockData);
      console.log('🔄 Using enhanced fallback pricing data');
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      if (data) {
        setProduct(data);
        setSelectedImage(data.default_image || data.images[0] || "");
        
        // Increment view count
        await supabase.rpc('increment_product_views', { product_uuid: data.id });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAddingToCart(true);
    
    try {
      const cartItem = {
        id: `marketplace-${product.id}-${Date.now()}`,
        product: {
          id: product.id,
          sku: `MP-${product.id}`,
          name: product.title,
          description: product.description,
          shortDescription: product.short_description,
          category: 'marketplace' as any,
          basePrice: product.price,
          images: product.images,
          defaultImage: product.default_image,
          features: product.tags,
          customizable: false,
          isActive: product.is_active,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        },
        customization: {
          productId: product.id,
          selections: {},
          totalPrice: product.price * quantity
        },
        quantity: quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
        addedAt: new Date().toISOString()
      };

      addToCart(cartItem);
      
      // Redirect to cart page
      router.push('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (userLoading || loading) {
    return (
      <Layout title="Loading... - Sticker Shuttle">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading product...</div>
        </div>
      </Layout>
    );
  }

  // Restrict access to justin@stickershuttle.com only
  if (!user || user.email !== 'justin@stickershuttle.com') {
    return (
      <Layout title="Marketplace - Coming Soon | Sticker Shuttle">
        <section className="pt-[20px] pb-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl py-12 px-8 md:px-12 relative overflow-hidden text-center"
              style={{
                background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4a 25%, #2d1b6b 50%, #4c1d95 75%, #7c3aed 100%)',
                backgroundImage: `
                  radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 60%),
                  radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 40%)
                `
              }}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                  Marketplace Coming Soon
                </h1>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  We're building an amazing marketplace for pre-made sticker designs. Stay tuned for the launch!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/products/vinyl-stickers">
                    <button className="px-8 py-3 font-semibold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                        color: 'white'
                      }}
                    >
                      Custom Vinyl Stickers
                    </button>
                  </Link>
                  
                  <Link href="/products">
                    <button className="px-8 py-3 font-semibold text-lg text-white hover:text-gray-200 transition-all duration-300 hover:scale-105 rounded-lg border border-gray-400 hover:border-gray-300">
                      View All Products
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <FloatingChatWidget />
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout title="Product Not Found - Sticker Shuttle">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Product not found</div>
        </div>
      </Layout>
    );
  }

  const discountPercentage = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <Layout 
      title={`${product.title} - Marketplace | Sticker Shuttle`}
      description={product.short_description || product.description || `Buy ${product.title} from our marketplace`}
      ogImage={product.default_image || product.images[0]}
    >
      <Head>
        <link rel="preload" href={product.default_image || product.images[0]} as="image" />
        <link rel="preload" href="/orbit/base-price.csv" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/orbit/qty-sq.csv" as="fetch" crossOrigin="anonymous" />
      </Head>
      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        .button-style {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(59, 130, 246, 0.4);
          box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
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
      `}</style>

      {/* Hero Section with Product Image */}
      <section className="pt-[20px] pb-2 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-4 px-8 md:px-12 md:p-12 relative overflow-hidden"
          >
            {/* Back Arrow - Top Left */}
            <Link 
              href="/marketplace"
              className="absolute top-4 left-4 z-20 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {/* Gradient background overlay */}
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4a 25%, #2d1b6b 50%, #4c1d95 75%, #7c3aed 100%)',
                backgroundImage: `
                  radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 60%),
                  radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
                  radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
                  radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
                  radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.18) 1px, transparent 1px)
                `,
                backgroundSize: '200% 200%, 200% 200%, 200% 200%, 100px 100px, 150px 150px, 80px 80px',
                animation: 'stellar-drift 8s ease-in-out infinite',
                backgroundPosition: '0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%'
              }}
            ></div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
              {/* Product Image - Left Side */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden relative">
                <img 
                  src={selectedImage || product.default_image || product.images[0]}
                  alt={product.title}
                    className="w-full h-full object-cover"
                />
                {product.is_featured && (
                    <div className="absolute top-1 left-1">
                      <span className="px-1.5 py-0.5 bg-yellow-500/90 text-yellow-900 rounded-full text-xs font-semibold">
                      Featured
                    </span>
                  </div>
                )}
                {discountPercentage > 0 && (
                    <div className="absolute top-1 right-1">
                      <span className="px-1.5 py-0.5 bg-red-500/90 text-white rounded-full text-xs font-semibold">
                      -{discountPercentage}%
                    </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info - Right Side */}
              <div className="flex-1 text-center md:text-left">
                {/* Stars and Rating */}
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
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
                  <span className="text-gray-300 text-sm">(5.0) • {product.sold_quantity} sold</span>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm">
                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl leading-tight mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  {product.title}
                </h1>

                {/* Description */}
                {product.short_description && (
                  <p className="text-gray-300 text-base mb-4">
                    {product.short_description}
                  </p>
                )}

                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-center md:justify-start gap-2 mb-2">
                    <span className="text-white text-2xl md:text-3xl font-bold">${product.price}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-gray-400 text-lg md:text-xl line-through">${product.original_price}</span>
                    )}
                  </div>
                  <div className="text-green-400 text-sm font-medium">Free Shipping • Ready to Ship</div>
                </div>

                {/* Pills Description */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span 
                    className="px-3 py-1 text-xs rounded-full font-medium"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      color: 'white'
                    }}
                  >
                    🎨 Pre-made Design
                  </span>
                  <span 
                    className="px-3 py-1 text-xs rounded-full font-medium"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      color: 'white'
                    }}
                  >
                    ⚡ Ready to Ship
                  </span>
                  <span 
                    className="px-3 py-1 text-xs rounded-full font-medium"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      color: 'white'
                    }}
                  >
                    ⭐ Premium Quality
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          {pricingError && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
              ⚠️ {pricingError} - Using fallback pricing data
            </div>
          )}
          {/* Show loading state while pricing data is being loaded */}
          {pricingLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
              <p className="text-gray-300 text-sm">Loading pricing calculator...</p>
            </div>
          ) : realPricingData ? (
            <MarketplaceStickerCalculator 
              initialBasePricing={[
                { sqInches: 4, price: 0.50 },
                { sqInches: 9, price: 0.75 },
                { sqInches: 16, price: 1.00 },
                { sqInches: 25, price: 1.25 }
              ]} 
              realPricingData={realPricingData}
              markupPercentage={product?.markup_percentage || 0}
              productTitle={product?.title || 'Marketplace Product'}
              productId={product?.id || 'unknown'}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-red-400 text-center">
                <p className="text-lg mb-2">⚠️ Unable to load pricing calculator</p>
                <p className="text-sm text-gray-300">Please refresh the page to try again</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Product Details Section */}
      <section className="py-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="container-style p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Product Images Gallery */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Product Gallery</h2>
                {/* Main Image */}
                <div className="relative w-full aspect-square mb-4">
                  <img 
                    src={selectedImage || product.default_image || product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
              </div>

              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === image 
                          ? 'border-blue-500 scale-105' 
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

              {/* Product Purchase Options */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Quick Purchase</h2>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-white/20 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 text-white min-w-[3rem] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-white">
                    Total: <span className="font-bold">${(product.price * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              {product.stock_quantity !== -1 && (
                <div className="mb-6">
                  <div className={`text-sm ${
                    product.stock_quantity > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {product.stock_quantity > 0 
                      ? `${product.stock_quantity} in stock` 
                      : 'Out of stock'
                    }
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || (product.stock_quantity !== -1 && product.stock_quantity === 0)}
                className="button-style w-full py-4 px-6 font-bold text-lg rounded-lg transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isAddingToCart ? 'Adding to Cart...' : 'Buy This Pre-made Design'}
              </button>

                <div className="text-center text-gray-400 text-sm mb-6">
                  Or use the calculator above to customize size and quantity
                </div>

                {/* Product Details */}
                {product.description && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">About This Design</h3>
                    <div className="text-gray-300 text-sm leading-relaxed">
                      {product.description}
                    </div>
                  </div>
                )}

              {/* Tags */}
              {product.tags.length > 0 && (
                  <div className="border-t border-white/10 pt-6 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="pt-4 pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Ready to Ship */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Ready to Ship</span>
                </h3>
              </div>
            </div>

            {/* No Design Time */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">No Design Time</span>
                </h3>
              </div>
                  </div>

            {/* Free Shipping */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div className="w-10 h-10 mr-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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

      {/* Four-Column Features Section */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Premium Materials */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden flex items-center justify-center bg-purple-600/20">
                  <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Premium Materials</h3>
                <p className="text-gray-300 text-sm">High-quality vinyl that lasts years outdoors.</p>
              </div>
            </div>

            {/* Professional Design */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden flex items-center justify-center bg-blue-600/20">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 3v18M17 21v-8a4 4 0 00-4-4V9a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Professional Design</h3>
                <p className="text-gray-300 text-sm">Created by professional graphic designers.</p>
              </div>
            </div>

            {/* Multiple Sizes */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden flex items-center justify-center bg-green-600/20">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h2M4 16v4a2 2 0 002 2h2M16 4h2a2 2 0 012 2v4M16 20h2a2 2 0 002-2v-4M8 12h.01M12 12h.01M16 12h.01" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Multiple Sizes</h3>
                <p className="text-gray-300 text-sm">Available in various sizes for any use case.</p>
              </div>
            </div>

            {/* Fast Processing */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden flex items-center justify-center bg-yellow-600/20">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Fast Processing</h3>
                <p className="text-gray-300 text-sm">Ships within 24-48 hours of order.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="container-style p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Need Custom Stickers?
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Don't see exactly what you need? We also offer custom sticker printing 
              with our advanced calculators for vinyl, holographic, chrome, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/products/vinyl-stickers')}
                className="button-style px-6 py-3 text-white font-medium rounded-lg transition-colors"
              >
                Custom Vinyl Stickers
              </button>
              <button
                onClick={() => router.push('/marketplace')}
                className="px-6 py-3 text-white font-medium rounded-lg transition-colors border border-white/20 hover:bg-white/10"
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </Layout>
  );
} 