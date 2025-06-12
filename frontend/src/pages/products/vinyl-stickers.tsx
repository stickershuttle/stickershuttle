import Layout from "@/components/Layout";
import StickerCalculator from "@/components/vinyl-sticker-calculator";

export default function VinylStickers() {
  // Mock base pricing data for the calculator
  const basePricing = [
    { sqInches: 4, price: 0.50 },
    { sqInches: 9, price: 0.75 },
    { sqInches: 16, price: 1.00 },
    { sqInches: 25, price: 1.25 }
  ];

  return (
    <Layout title="Vinyl Stickers - Waterproof & UV Resistant | Sticker Shuttle">
      {/* Hero Section with Banner Background */}
      <section className="py-2 md:py-4">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-8 px-4 md:p-12 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="text-left md:text-left text-center relative z-10">
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
                  Vinyl Stickers
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
                  Vinyl Stickers
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
                  ☀️ UV Resistant
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  🏠 Dishwasher Safe
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  ⭐ Premium Vinyl
                </span>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6"></div>
              {/* Desktop Buttons */}
              <div className="hidden md:flex flex-col items-start gap-3 mb-4">
                <a 
                  href="/products"
                  className="px-6 py-2 font-semibold text-sm transition-all duration-300 transform hover:scale-105 backdrop-blur-md inline-block"
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
                  className="px-5 py-2 font-semibold text-sm transition-all duration-300 transform hover:scale-105 backdrop-blur-md inline-block mb-3"
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
      <section className="py-2 md:py-4">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <StickerCalculator initialBasePricing={basePricing} />
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            
            {/* Waterproof & UV Resistant */}
            <div 
              className="rounded-xl p-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="flex items-center">
                <div 
                  className="text-4xl mr-4"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 242, 106, 0.5)) drop-shadow(0 0 20px rgba(168, 242, 106, 0.3))'
                  }}
                >
                  💧
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Waterproof & UV Resistant</span>
                  <span className="text-gray-300">, indoor & outdoor use.</span>
                </h3>
              </div>
            </div>

            {/* Premium Vinyl Material */}
            <div 
              className="rounded-xl p-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="flex items-center">
                <div 
                  className="text-4xl mr-4"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 242, 106, 0.5)) drop-shadow(0 0 20px rgba(168, 242, 106, 0.3))'
                  }}
                >
                  ⭐
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Premium 70lb Vinyl</span>
                  <span className="text-gray-300">, thick & durable.</span>
                </h3>
              </div>
            </div>

            {/* Custom Sizes */}
            <div 
              className="rounded-xl p-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
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
    </Layout>
  );
} 