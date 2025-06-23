import Layout from "@/components/Layout";
import ClearStickerCalculator from "@/components/clear-sticker-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";
import { loadRealPricingData, BasePriceRow, QuantityDiscountRow } from "@/utils/real-pricing";

export default function ClearStickers() {
  const [realPricingData, setRealPricingData] = useState<{
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

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
  }, []);

  // Legacy base pricing for backward compatibility (if needed)
  const basePricing = [
    { sqInches: 4, price: 0.50 },
    { sqInches: 9, price: 0.75 },
    { sqInches: 16, price: 1.00 },
    { sqInches: 25, price: 1.25 }
  ];

  return (
    <Layout title="Clear Stickers - Transparent & Professional | Sticker Shuttle">
      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
      {/* Hero Section with Banner Background */}
      <section className="pt-[20px] pb-2 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[70%] mx-auto px-6 md:px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-8 px-8 md:px-12 md:p-12 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652825/StickerShuttle_Banner_Clear_dvp0xk.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Mobile gradient overlay */}
            <div 
              className="absolute inset-0 md:hidden rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #6b21a8 25%, #7c3aed 50%, #8b5cf6 75%, #a855f7 100%)'
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

              {/* Divider */}
              <div className="w-1/2 h-px bg-gradient-to-r from-white/20 to-transparent my-6"></div>
              {/* Desktop Buttons */}
              <div className="hidden md:flex flex-col items-start gap-3 mb-4">
                <a 
                  href="/products"
                  className="px-6 py-2 font-medium text-sm transition-all duration-300 transform hover:scale-105 backdrop-blur-md inline-block"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  }}
                >
                  ← Back to Shop
                </a>
              </div>

              {/* Mobile Buttons */}
              <div className="md:hidden flex flex-col items-center mb-2">
                <a 
                  href="/products"
                  className="px-5 py-2 font-medium text-sm transition-all duration-300 transform hover:scale-105 backdrop-blur-md inline-block mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  }}
                >
                  ← Back to Shop
                </a>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="pt-7 pb-2 md:py-4">
        <div className="w-[95%] md:w-[90%] xl:w-[70%] mx-auto px-6 md:px-4">
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
      <section className="pt-7 pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[70%] mx-auto px-6 md:px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            
            {/* Transparent & Professional */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div 
                  className="text-4xl mr-4"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 242, 106, 0.5)) drop-shadow(0 0 20px rgba(168, 242, 106, 0.3))'
                  }}
                >
                  🔍
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Transparent & Professional</span>
                  <span className="text-gray-300">, see-through elegance.</span>
                </h3>
              </div>
            </div>

            {/* Premium Clear Material */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div 
                  className="text-4xl mr-4"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 242, 106, 0.5)) drop-shadow(0 0 20px rgba(168, 242, 106, 0.3))'
                  }}
                >
                  💎
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Premium Clear Vinyl</span>
                  <span className="text-gray-300">, crystal clear quality.</span>
                </h3>
              </div>
            </div>

            {/* Custom Sizes */}
            <div className="container-style p-4 lg:p-6 transition-colors duration-200">
              <div className="flex items-center">
                <div 
                  className="text-4xl mr-4"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 242, 106, 0.5)) drop-shadow(0 0 20px rgba(168, 242, 106, 0.3))'
                  }}
                >
                  📏
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Any Size, Any Shape</span>
                  <span className="text-gray-300">, custom cut to perfection.</span>
                </h3>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Four-Column Use Cases Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[70%] mx-auto px-6 md:px-4">
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

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </Layout>
  );
} 



