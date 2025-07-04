import Layout from "@/components/Layout";
import ClearStickerCalculator from "@/components/clear-sticker-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";
import { loadRealPricingData, BasePriceRow, QuantityDiscountRow } from "@/utils/real-pricing";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function ClearStickers() {
  const [realPricingData, setRealPricingData] = useState<{
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load real CSV pricing data on component mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await loadRealPricingData();
        setRealPricingData(data);
        console.log('Loaded real pricing data:', data);
      } catch (error) {
        console.error('Failed to load real pricing data:', error);
        setPricingError('Failed to load real pricing data from CSV files');
        
        // Fallback to basic mock data if CSV fails
        const mockData = {
          basePricing: [
            { sqInches: 4, basePrice: 1.17 },
            { sqInches: 9, basePrice: 1.35 },
            { sqInches: 16, basePrice: 1.62 },
            { sqInches: 25, basePrice: 1.91 }
          ],
          quantityDiscounts: [
            { quantity: 100, discounts: { 1: 0.35, 9: 0.35, 16: 0.25, 25: 0.25 } },
            { quantity: 500, discounts: { 1: 0.68, 9: 0.68, 16: 0.53, 25: 0.53 } }
          ]
        };
        setRealPricingData(mockData);
      }
    };

    loadPricing();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      if (typeof window !== 'undefined') {
        const supabase = await getSupabase();
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
      title="Clear Stickers - Transparent & Professional | Sticker Shuttle"
      description="Premium clear stickers with transparent backgrounds that blend seamlessly with any surface - perfect for professional applications and subtle branding."
      ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652825/StickerShuttle_Banner_Clear_dvp0xk.jpg"
    >
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
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652825/StickerShuttle_Banner_Clear_dvp0xk.jpg)',
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
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
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
                  Clear Stickers
                </h1>
                <p className="text-gray-300 text-base">
                  Crystal transparency. Professional clarity.
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
                  Clear Stickers
                </h1>
                <p className="text-gray-300 text-sm">
                  Crystal transparency. Professional clarity.
                </p>
              </div>
              {/* Desktop Description */}
              <p className="hidden md:block text-base sm:text-lg mb-6 text-purple-100 max-w-3xl">
                Premium clear stickers with transparent backgrounds that blend seamlessly with any surface - perfect for professional applications and subtle branding.
              </p>
              
              {/* Mobile Pills Description */}
              <div className="md:hidden flex flex-wrap justify-center gap-2 mb-4">
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  🔍 Transparent
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  💎 Crystal Clear
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  💧 Waterproof
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  ⭐ Premium Quality
                </span>
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
          {/* Only render calculator after pricing data is loaded to prevent SSR issues */}
          {realPricingData ? (
            <ClearStickerCalculator 
              initialBasePricing={basePricing} 
              realPricingData={realPricingData}
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
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



