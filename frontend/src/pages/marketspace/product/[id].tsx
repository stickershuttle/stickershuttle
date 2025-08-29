import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import PageTransition from "@/components/PageTransition";
import { useCart } from "@/components/CartContext";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import Head from "next/head";
import MarketplaceStickerCalculator from "@/components/marketspace-sticker-calculator";
import { loadRealPricingData, BasePriceRow, QuantityDiscountRow } from "@/utils/real-pricing";
import { useQuery } from "@apollo/client";
import { GET_CREATOR_BY_USER_ID } from "@/lib/profile-mutations";

// Helper function to calculate creator earnings
function calculateCreatorEarnings(price: number): number {
  return price * 0.05; // 5% of the price as store credit
}

// Helper function to calculate store credit based on discounted order value (after quantity discounts)
function calculateStoreCredit(basePrice: number, quantity: number): number {
  // Calculate quantity-based discount
  let discountMultiplier = 1;
  if (quantity === 5) discountMultiplier = 0.5; // 50% off
  else if (quantity === 10) discountMultiplier = 0.4; // 60% off
  else if (quantity === 25) discountMultiplier = 0.3; // 70% off
  
  const discountedOrderValue = basePrice * discountMultiplier * quantity;
  return discountedOrderValue * 0.05; // 5% of discounted order value
}

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price: number;
  original_price?: number;
  markup_percentage?: number;
  size_pricing?: {
    "3": number;
    "4": number;
    "5": number;
  };
  size_compare_pricing?: {
    "3": number;
    "4": number;
    "5": number;
  };
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
  creator?: {
    id: string;
    creator_name: string;
    user_id: string;
    profile_photo_url?: string;
    user_profiles?: {
      first_name?: string;
      last_name?: string;
      profile_photo_url?: string;
    };
  };
}

export default function MarketplaceProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<"3" | "4" | "5">("3");
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

  // Admin emails list - same as in marketspace page
  const ADMIN_EMAILS = ['justin@stickershuttle.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // Check if user is a creator
  const { data: creatorData } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const isCreator = creatorData?.getCreatorByUserId?.isActive || false;

  useEffect(() => {
    if (id) {
      fetchProduct();
      loadPricing();
    }
    checkUser();
  }, [id]);



  // Listen for profile updates to sync profile photos
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      const { profile_photo_url } = event.detail;
      
      // Update product creator profile photo if it matches the current user
      if (user?.id && profile_photo_url && product?.creator?.user_id === user.id) {
        setProduct(prevProduct => {
          if (!prevProduct || !prevProduct.creator) return prevProduct;

          return {
            ...prevProduct,
            creator: {
              ...prevProduct.creator,
              user_profiles: {
                ...(prevProduct.creator.user_profiles || {}),
                profile_photo_url
              }
            }
          };
        });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, product?.creator?.user_id]);

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
        .select(`
          *,
          creators (
            id,
            creator_name,
            user_id,
            profile_photo_url
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      if (data) {
        // Fetch user profile data for creator if exists
        if (data.creators?.user_id) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, profile_photo_url')
              .eq('user_id', data.creators.user_id)
              .single();
            
            if (profileError) {
              console.warn('Profile fetch error for user_id:', data.creators.user_id, profileError);
            } else {
              console.log('✅ Profile loaded for creator:', data.creators.creator_name, 'photo:', profileData?.profile_photo_url);
            }
            
            setProduct({
              ...data,
              creator: {
                ...data.creators,
                user_profiles: profileData
              }
            });
          } catch (profileError) {
            console.warn('Error fetching profile for creator:', profileError);
            setProduct({
              ...data,
              creator: data.creators
            });
          }
        } else {
          setProduct({
            ...data,
            creator: data.creators
          });
        }
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
      const basePrice = product.size_pricing?.[selectedSize] || product.price;
      
      // Calculate quantity-based discount
      let discountMultiplier = 1;
      if (quantity === 5) {
        discountMultiplier = 0.5; // 50% off
      } else if (quantity === 10) {
        discountMultiplier = 0.4; // 60% off
      } else if (quantity === 25) {
        discountMultiplier = 0.3; // 70% off
      }
      
      const discountedUnitPrice = basePrice * discountMultiplier;
      const totalPrice = discountedUnitPrice * quantity;
      
      const cartItem = {
        id: `marketplace-${product.id}-${selectedSize}-${Date.now()}`,
        product: {
          id: product.id,
          sku: `MP-${product.id}-${selectedSize}"`,
          name: `${product.title} (${selectedSize}")${discountMultiplier < 1 ? ` - ${quantity === 5 ? '50% OFF' : quantity === 10 ? '60% OFF' : '70% OFF'}` : ''}`,
          description: product.description,
          shortDescription: product.short_description,
          category: 'marketplace' as any,
          basePrice: discountedUnitPrice,
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
          selections: {
            size: {
              type: 'size-preset' as const,
              value: `${selectedSize}\"`,
              displayValue: `${selectedSize}\"`,
              priceImpact: 0
            }
          },
          totalPrice: totalPrice,
          customFiles: [selectedImage || product.default_image].filter(Boolean) as string[],
          // Keep additionalInfo type-compatible
          additionalInfo: {
            uploadLater: false
          }
        },
        quantity: quantity,
        unitPrice: discountedUnitPrice,
        totalPrice: totalPrice,
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

  // Allow access for admin or active creators
  const hasAccess = user && (user.email === 'justin@stickershuttle.com' || isCreator);
  
  if (!hasAccess) {
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
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
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
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-glow-purple {
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
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

        .total-pill {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 100%);
          border: 2px solid rgba(34, 197, 94, 0.4);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(15px);
        }
        
        #mobile-sticky-cart {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          width: 100% !important;
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



      <PageTransition>
        {/* Product Section */}
        <section className="pt-0 md:pt-[20px] pb-8">
        <div className="w-full md:w-[95%] lg:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto md:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 md:gap-8 items-stretch">
            
            {/* Product Image */}
            <div 
              className="p-0 h-full relative mobile-container-bg"
              style={{ 
                border: 'none'
              }}
            >
              {/* Back Arrow - Top Left */}
              <Link 
                href="/marketspace"
                className="absolute top-4 left-4 md:top-4 md:left-4 z-20 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110"
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
              
              <div className="relative w-full aspect-square md:rounded-lg overflow-hidden p-4 md:p-0">
                {/* Background Image */}
                <img
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1754091658/BGSquare_eai516.png"
                  alt="Background"
                  className="w-full h-full object-cover absolute inset-0"
                />
                
                {/* Product Image Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-16">
                  <img 
                    src={selectedImage || product.default_image || product.images[0]}
                    alt={product.title}
                    className="max-w-full max-h-full object-contain drop-shadow-lg animate-float"
                  />
                </div>
                {/* Featured pill hidden */}
                {product.is_featured && (
                  <div className="absolute top-2 left-2 hidden">
                    <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  </div>
                )}
                {discountPercentage > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-red-500/90 text-white rounded-full text-sm font-semibold">
                      -{discountPercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-4 mx-4 md:mx-0">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center p-4 ${
                        selectedImage === image 
                          ? 'border-blue-500 scale-105' 
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: '#cae0ff' }}
                    >
                      <img
                        src={image}
                        alt={`${product.title} - Image ${index + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="container-style p-4 md:p-6 lg:p-8 mx-4 md:mx-0 mt-4 md:mt-0">
              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                {product.title}
              </h1>

              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center">
                  {(product.creator?.profile_photo_url || product.creator?.user_profiles?.profile_photo_url) ? (
                    <img 
                      src={(product.creator?.profile_photo_url || product.creator?.user_profiles?.profile_photo_url) as string}
                      alt={`${product.creator.creator_name} avatar`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Created by</div>
                  <div className="text-gray-300 text-sm">
                    {(() => {
                      const c = product.creator;
                      if (!c) return 'Sticker Shuttle';
                      if (c.creator_name) return c.creator_name;
                      if (c.user_profiles?.first_name && c.user_profiles?.last_name) {
                        return `${c.user_profiles.first_name} ${c.user_profiles.last_name}`;
                      }
                      return 'Sticker Shuttle';
                    })()}
                  </div>
                </div>
              </div>

              {/* Category & Features */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm">
                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                  </span>
                  <span className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-sm">
                    Waterproof
                  </span>
                  <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm">
                    UV Resistant
                  </span>
                  <span className="px-3 py-1 bg-orange-600/20 text-orange-300 rounded-full text-sm">
                    Durable
                  </span>
                </div>
              </div>

              {/* Description - Hidden for now */}
              {/* {product.short_description && (
                <p className="text-gray-300 text-lg mb-4">
                  {product.short_description}
                </p>
              )} */}



                            {/* Size Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span role="img" aria-label="ruler" className="text-purple-400">
                    📏
                  </span>
                  Select a size
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => setSelectedSize("3")}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedSize === "3" 
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden">
                      <img
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628951/StickerShuttle_Bottle_m6rxb5.webp"
                        alt="Water bottle"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs font-medium mb-2">Medium (3")</div>
                    <div className="text-xs text-gray-300 leading-tight px-1 hidden sm:block">
                      Best for water bottles, laptops, and small areas.
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedSize("4")}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedSize === "4" 
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden">
                      <img
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628956/StickerShuttle_Board_150b2de5-5194-4773-b983-0a4f746602a4_cox6gj.webp"
                        alt="Skateboard"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs font-medium mb-2">Large (4")</div>
                    <div className="text-xs text-gray-300 leading-tight px-1 hidden sm:block">
                      Best for vehicles, skateboards, desks, and alike.
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedSize("5")}
                    className={`button-interactive relative text-center px-4 py-4 rounded-xl flex flex-col items-center justify-center transition-all border backdrop-blur-md ${
                      selectedSize === "5" 
                        ? 'bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden">
                      <img
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628960/StickerShuttle_VisitMars_jhm6al.webp"
                        alt="Cooler"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs font-medium mb-2">X-Large (5")</div>
                    <div className="text-xs text-gray-300 leading-tight px-1 hidden sm:block">
                      Best for coolers, fridges, vehicles, and alike.
                    </div>
                  </button>
                </div>

                {/* Quantity Selector */}
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span className="text-green-400">#️⃣</span>
                  Select a quantity
                </h3>
                <div className="space-y-3 mb-3">
                                    <button
                    onClick={() => setQuantity(1)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md ${
                      quantity === 1 
                        ? 'bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <span>1</span>
                    <span className="text-xs text-gray-400">Full Price</span>
                  </button>
                  <button
                    onClick={() => setQuantity(5)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md ${
                      quantity === 5 
                        ? 'bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <span>5</span>
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">50% OFF</span>
                  </button>
                  <button
                    onClick={() => setQuantity(10)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md ${
                      quantity === 10 
                        ? 'bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <span>10</span>
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">60% OFF</span>
                  </button>
                  <button
                    onClick={() => setQuantity(25)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md ${
                      quantity === 25 
                        ? 'bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green' 
                        : 'hover:bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    <span>25</span>
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">70% OFF</span>
                  </button>
                  </div>
                {/* Selected Size Pricing Display */}
                <div className="mb-4 p-3 rounded-lg" style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {(() => {
                    const basePrice = product.size_pricing?.[selectedSize] || product.price;
                    const comparePrice = product.size_compare_pricing?.[selectedSize] || product.original_price;
                    
                    // Calculate quantity-based discount
                    let discountMultiplier = 1;
                    let discountText = '';
                    
                    if (quantity === 5) {
                      discountMultiplier = 0.5; // 50% off
                      discountText = '50% OFF';
                    } else if (quantity === 10) {
                      discountMultiplier = 0.4; // 60% off
                      discountText = '60% OFF';
                    } else if (quantity === 25) {
                      discountMultiplier = 0.3; // 70% off
                      discountText = '70% OFF';
                    }
                    
                    const discountedPrice = basePrice * discountMultiplier;
                    const totalPrice = discountedPrice * quantity;
                    
                    return (
                      <>
                        {/* Total Price - Left Aligned */}
                        <div className="text-left">
                          <div className="text-gray-300 text-sm font-medium mb-2">Total Price</div>
                          <div className="text-white text-3xl font-bold mb-1">
                            ${totalPrice.toFixed(2)}
                          </div>
                          {discountMultiplier < 1 && (
                            <div className="text-gray-300 text-lg line-through">
                              ${(basePrice * quantity).toFixed(2)}
                            </div>
                          )}
                          {/* Show discount badge */}
                          {discountText && (
                            <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-medium">
                              {discountText}
                            </span>
                          )}
                          {/* Creator earnings message */}
                          <div className="flex items-center text-yellow-200 text-sm mt-2">
                            <span>+</span>
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                              alt="Credits" 
                              className="w-4 h-4 object-contain ml-0.5 mr-1.5"
                            />
                            <span>${(totalPrice * 0.05).toFixed(2)} in store credit</span>
                          </div>
                        </div>
                        
                        {/* Show savings amount */}
                        {discountMultiplier < 1 && (
                          <div className="text-green-400 text-xs mt-1">
                            You save ${((basePrice * quantity) - totalPrice).toFixed(2)}!
                          </div>
                        )}
                      </>
                    );
                  })()}
                  </div>
                <div className="text-left">
                  <Link 
                    href={`/products/vinyl-stickers?preloadImage=${encodeURIComponent(selectedImage || product.default_image || product.images[0])}#upload`}
                    className="text-purple-300 text-sm hover:text-purple-200 transition-colors inline-flex items-center gap-1"
                  >
                    Order stickers in bulk <span className="text-lg">→</span>
                  </Link>
                </div>
              </div>



              {/* Add to Cart Button - Desktop/Tablet */}
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || (product.stock_quantity !== -1 && product.stock_quantity === 0)}
                className="hidden md:block button-style w-full py-4 px-6 font-bold text-lg rounded-lg transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(() => {
                  const basePrice = product.size_pricing?.[selectedSize] || product.price;
                  let discountMultiplier = 1;
                  if (quantity === 5) discountMultiplier = 0.5;
                  else if (quantity === 10) discountMultiplier = 0.4;
                  else if (quantity === 25) discountMultiplier = 0.3;
                  const totalPrice = (basePrice * discountMultiplier * quantity);
                  
                  return isAddingToCart 
                    ? 'Adding to Cart...' 
                    : `Add to cart • $${totalPrice.toFixed(2)}`;
                })()}
              </button>



                {/* Product Details - Hidden for now */}
                {/* {product.description && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-lg font-bold text-white mb-4">
                    About This Design
                  </h3>
                    <div className="text-gray-300 text-sm leading-relaxed">
                      {product.description}
                    </div>
                  </div>
                )} */}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="border-t border-white/10 pt-4 mt-4">
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
      </section>
      {/* Spacer so content isn't hidden behind mobile sticky bar */}
      <div className="h-24 md:hidden" />



      {/* Brands Section */}
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
              Quality trusted by these brands:
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
      </PageTransition>

      {/* Access Control Check */}
      {(() => {
        if (userLoading || (user && !creatorData)) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading Creators Space Product...</p>
              </div>
            </div>
          );
        }

        // Check if user has access
        const hasAccess = user && (ADMIN_EMAILS.includes(user.email || '') || creatorData?.getCreatorByUserId?.isActive);
        
        if (!hasAccess) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
                <p className="text-gray-300 text-lg mb-8">You don't have permission to view this page.</p>
                <button 
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          );
        }

        return null; // Continue with normal render
      })()}

      {/* Floating Chat Widget */}
      <FloatingChatWidget />

      {/* Mobile Sticky Add to Cart Bar */}
      <div 
        id="mobile-sticky-cart"
        className="md:hidden"
        style={{ 
          backgroundColor: '#100e4a',
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          zIndex: '9999',
          width: '100%'
        }}
      >
        <div className="w-[95%] mx-auto px-4 py-7">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || (product.stock_quantity !== -1 && product.stock_quantity === 0)}
            className="button-style w-full py-4 px-6 font-bold text-lg rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(() => {
              const basePrice = product.size_pricing?.[selectedSize] || product.price;
              let discountMultiplier = 1;
              if (quantity === 5) discountMultiplier = 0.5;
              else if (quantity === 10) discountMultiplier = 0.4;
              else if (quantity === 25) discountMultiplier = 0.3;
              const totalPrice = (basePrice * discountMultiplier * quantity);
              
              return isAddingToCart 
                ? 'Adding to Cart...'
                : `Add to cart • $${totalPrice.toFixed(2)}`;
            })()}
          </button>
        </div>
      </div>
    </Layout>
  );
} 