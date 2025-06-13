import Layout from "@/components/Layout";
import VinylBannerCalculator from "@/components/vinyl-banner-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";

export default function VinylBanners() {
  return (
    <Layout title="Vinyl Banners - Professional Signage | Sticker Shuttle">
      {/* Hero Section with Banner Background */}
      <section className="py-2 md:py-4">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-8 px-4 md:p-12 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652827/StickerShuttle_VinylBanner_VinylBanner_chvbfs.png)',
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
            <div className="text-center relative z-10">
              {/* Desktop Stars - Above Title */}
              <div className="hidden md:flex items-center justify-center gap-2 mb-4">
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
              <div className="hidden md:block mb-4 text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl leading-none mb-2 text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Vinyl Banners
                </h1>
                <p className="text-gray-300 text-base">
                  Professional outdoor signage. Durable and weather-resistant.
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
                <h1 className="text-4xl leading-none whitespace-nowrap mb-2 text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Vinyl Banners
                </h1>
                <p className="text-gray-300 text-sm">
                  Professional outdoor signage. Durable and weather-resistant.
                </p>
              </div>
              {/* Desktop Description */}
              <p className="hidden md:block text-base sm:text-lg mb-6 text-purple-100 max-w-3xl mx-auto text-center">
                Heavy-duty vinyl banners perfect for outdoor advertising, events, and business signage. Weather-resistant and professionally finished.
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
                  🏢 Professional
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  🌦️ Weather Resistant
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  💪 Heavy Duty
                </span>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: 'rgba(168, 242, 106, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(168, 242, 106, 0.4)'
                  }}
                >
                  🔗 Grommeted
                </span>
              </div>

              {/* Divider */}
              <div className="w-1/2 h-px bg-gradient-to-r from-white/20 to-transparent my-6"></div>
              {/* Desktop Buttons */}
              <div className="hidden md:flex flex-col items-center gap-3 mb-4">
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
      <section className="py-2 md:py-4">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <VinylBannerCalculator />
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
          <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            
            {/* Heavy Duty Material */}
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
                  💪
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Heavy Duty 13oz Vinyl</span>
                  <span className="text-gray-300">, built to last outdoors.</span>
                </h3>
              </div>
            </div>

            {/* Weather Resistant */}
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
                  🌦️
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Weather Resistant</span>
                  <span className="text-gray-300">, UV & rain protected.</span>
                </h3>
              </div>
            </div>

            {/* Professional Finishing */}
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
                  🔗
                </div>
                <h3 className="font-semibold">
                  <span className="text-white">Hemmed & Grommeted</span>
                  <span className="text-gray-300">, ready to hang.</span>
                </h3>
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