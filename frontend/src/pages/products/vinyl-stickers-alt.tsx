import Layout from "@/components/Layout";
import StickerCalculator from "@/components/vinyl-sticker-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";
import { loadRealPricingData, BasePriceRow, QuantityDiscountRow } from "@/utils/real-pricing";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import Head from "next/head";

export default function VinylStickersAlt() {
  const [realPricingData, setRealPricingData] = useState<{
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(true);

  // Load real CSV pricing data on component mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        setPricingLoading(true);
        console.log('🔄 Starting CSV pricing data load...');
        const data = await loadRealPricingData();
        setRealPricingData(data);
        setPricingError(null); // Clear any previous errors
        console.log('✅ Successfully loaded real pricing data:', data);
        
        // Track Facebook Pixel ViewContent event for product page
        if (typeof window !== 'undefined' && window.fbq) {
          try {
            window.fbq('track', 'ViewContent', {
              content_ids: ['vinyl-stickers'],
              content_name: 'Vinyl Stickers',
              content_category: 'Stickers',
              content_type: 'product'
            });
            console.log('📊 Facebook Pixel: ViewContent tracked for Vinyl Stickers');
          } catch (fbError) {
            console.error('📊 Facebook Pixel ViewContent tracking error:', fbError);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load real pricing data:', error);
        setPricingError(error instanceof Error ? error.message : 'Failed to load real pricing data from CSV files');
        
        // Enhanced fallback data that matches CSV structure more closely
        const mockData = {
          basePricing: [
            // Small sizes
            { sqInches: 1, basePrice: 1.17 },
            { sqInches: 2, basePrice: 1.20 },
            { sqInches: 3, basePrice: 1.25 },
            { sqInches: 4, basePrice: 1.30 }, // Small (2" x 2")
            { sqInches: 6, basePrice: 1.32 },
            { sqInches: 9, basePrice: 1.35 }, // Medium (3" x 3")
            { sqInches: 12, basePrice: 1.45 },
            { sqInches: 16, basePrice: 1.62 }, // Large (4" x 4")
            { sqInches: 20, basePrice: 1.75 },
            { sqInches: 25, basePrice: 1.91 }, // X-Large (5" x 5")
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

    loadPricing();
    checkUser();
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

  // Legacy base pricing for backward compatibility (if needed)
  const basePricing = [
    { sqInches: 4, price: 0.50 },
    { sqInches: 9, price: 0.75 },
    { sqInches: 16, price: 1.00 },
    { sqInches: 25, price: 1.25 }
  ];

  return (
    <Layout 
      title="Vinyl Stickers (Alt) - Waterproof & UV Resistant | Sticker Shuttle"
      description="Premium vinyl stickers perfect for laptops, water bottles, and outdoor use - waterproof, scratch-resistant, and dishwasher safe. (Alternative version)"
      ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp"
    >
      <Head>
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
        .rocket-shake {
          animation: rocketShake 2s ease-in-out infinite;
        }
        @keyframes rocketShake {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-1px) translateY(-1px); }
          50% { transform: translateX(1px) translateY(1px); }
          75% { transform: translateX(-1px) translateY(1px); }
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
      {/* Hero Section with Banner Background */}
      <section className="pt-[20px] pb-2 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-4 px-8 md:px-12 md:p-12 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Back Arrow - Top Left */}
            <Link 
              href="/products"
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

            {/* Mobile gradient overlay */}
            <div 
              className="absolute inset-0 md:hidden rounded-2xl"
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
            <div className="text-left md:text-left text-center relative z-10 md:pl-8">
              {/* Desktop Stars - Above Title */}
              <div className="hidden md:flex items-center gap-2 mb-4">
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

              {/* Desktop Title and Subtitle */}
              <div className="hidden md:block mb-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl leading-none mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Vinyl Stickers Alt
                </h1>
                <p className="text-gray-300 text-base">
                  Perfect for any application. The perfect sticker.
                </p>
              </div>

              {/* Mobile Stars and Google - Above Title */}
              <div className="md:hidden flex items-center justify-center gap-2 mb-4">
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

              {/* Mobile Title and Subtitle */}
              <div className="md:hidden mb-4 text-center">
                <h1 className="text-4xl leading-none whitespace-nowrap mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Vinyl Stickers Alt
                </h1>
                <p className="text-gray-300 text-sm">
                  Perfect for any application. The perfect sticker.
                </p>
              </div>
              {/* Desktop Description */}
              <p className="hidden md:block text-base sm:text-lg mb-6 text-purple-100 max-w-3xl">
                Premium vinyl stickers perfect for laptops, water bottles, and outdoor use - waterproof, scratch-resistant, and dishwasher safe.
              </p>
              
              {/* Mobile Pills Description */}
              <div className="md:hidden flex flex-wrap justify-center gap-2 mb-4">
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
                  💧 Waterproof
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
                  ☀️ UV Resistant
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
                  🏠 Dishwasher Safe
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
                  ⭐ Premium Vinyl
                </span>
              </div>


            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          
          {/* Honeymoon Closure Warning - Hidden */}
          {false && (
          <div className="mb-6 p-4 rounded-lg border" style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.8))',
            borderColor: 'rgba(239, 68, 68, 0.6)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
          }}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-1">Important Notice</h3>
                <p className="text-white text-sm leading-relaxed">
                  All orders in August will be fulfilled. We will be closed from <strong>Sept. 4th-17th</strong>. Any orders during that time will be fulfilled when we return. For emergency orders, please text us (303) 219-0518.{' '}
                  <Link href="/blog/ciao-bella-were-off-to-italy" className="underline hover:no-underline transition-all duration-200 font-medium">
                    Read more →
                  </Link>
                </p>
              </div>
            </div>
          </div>
          )}

          {pricingError && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
              ⚠️ {pricingError} - Using fallback pricing data
            </div>
          )}
          {/* Show loading state while pricing data is being loaded */}
          {pricingLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
              <p className="text-gray-300 text-sm">Loading pricing data...</p>
            </div>
          ) : realPricingData ? (
            <StickerCalculator 
              initialBasePricing={basePricing} 
              realPricingData={realPricingData}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-red-400 text-center">
                <p className="text-lg mb-2">⚠️ Unable to load pricing data</p>
                <p className="text-sm text-gray-300">Please refresh the page to try again</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="pt-4 pb-8">
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

      {/* Four-Column Use Cases Section */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Helmet - Small (2") */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628948/StickerShuttle_Helmet_atrvi7.webp"
                    alt="Helmet with custom stickers"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Small (2")</h3>
                <p className="text-gray-300 text-sm">Best for phone cases, helmets, or tight spots.</p>
              </div>
            </div>

            {/* Bottle - Medium (3") */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628951/StickerShuttle_Bottle_m6rxb5.webp"
                    alt="Water bottle with custom stickers"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Medium (3")</h3>
                <p className="text-gray-300 text-sm">Great for water bottles, laptops, or notebooks.</p>
              </div>
            </div>

            {/* Skateboard - Large (4") */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628956/StickerShuttle_Board_150b2de5-5194-4773-b983-0a4f746602a4_cox6gj.webp"
                    alt="Skateboard with custom stickers"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">Large (4")</h3>
                <p className="text-gray-300 text-sm">Commonly used for skateboards, tumblers, or tablets.</p>
              </div>
            </div>

            {/* Cooler - X-Large (5") */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628960/StickerShuttle_VisitMars_jhm6al.webp"
                    alt="Cooler with custom stickers"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">X-Large (5")</h3>
                <p className="text-gray-300 text-sm">Most seen on cars, coolers, fridges, or toolboxes.</p>
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


