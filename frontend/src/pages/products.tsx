import { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function Products() {
  const [dotCount, setDotCount] = useState<number>(1);

  // Animate the dots for "blast off"
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout title="Products - Sticker Shuttle">
        {/* Main Content */}
        <main className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto py-12 px-4">
          {/* Hero */}
          <div className="text-center mb-8 relative">
            {/* Background Grid - Enhanced visibility */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />
            
            {/* Custom Stickers Banner */}
            <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
                              <h1 className="text-2xl sm:text-3xl md:text-4xl text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>Custom Stickers</h1>
              <div className="flex items-center gap-2">
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
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto relative z-10">
              Grow your brand, unleash your creativity, or tell the universe your message. Either way, we're here for it. And we're ready to print it for you.
            </p>
          </div>

          {/* Choose Your Mission Pill - Desktop */}
          <div className="hidden md:flex justify-center mb-8">
            <div 
              className="px-6 py-3 rounded-full text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3), rgba(168, 242, 106, 0.3))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              🚀 CHOOSE YOUR MISSION:
            </div>
          </div>

          {/* Products Grid - Desktop */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 group/container mb-16">
            {/* Vinyl Stickers */}
            <Link href="/products/vinyl-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Stickers →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">💧 Waterproof & UV Resistant</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🎨 Custom Shapes & Sizes</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">✨ Matte or Gloss Finish</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-200 border border-green-400/50">🏆 Premium Vinyl Material</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Holographic Stickers */}
            <Link href="/products/holographic-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.3))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Holographic Stickers →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌈 Holographic Rainbow Effect</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">✨ Specialty Holographic Vinyl</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🎨 Eye-Catching Prismatic Finish</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🏆 Premium Quality Material</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Chrome Stickers */}
            <Link href="/products/chrome-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Chrome Stickers →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🪞 Mirror Chrome Finish</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🔩 Metallic Polyester Film</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">✨ High-Gloss Surface</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-500/20 text-gray-200 border border-gray-400/50">🚗 Automotive Grade</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Glitter Stickers */}
            <Link href="/products/glitter-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.35)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.21))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Glitter Stickers →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">✨ Sparkly Glitter Finish</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🌟 Eye-Catching Sparkle</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🎨 Multiple Glitter Colors</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🏆 Premium Glitter Vinyl</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Vinyl Banners */}
            <Link href="/products/vinyl-banners">
              <div 
                className="text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                    alt="Vinyl Banners" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(196, 181, 253, 0.35)) drop-shadow(0 0 24px rgba(196, 181, 253, 0.21))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Banners →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">💪 Heavy Duty 13oz Vinyl</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🔗 Hemmed & Grommeted</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌦️ UV & Weather Resistant</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">📏 Custom Sizes Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Choose Your Mission Pill */}
          <div className="flex justify-center mb-8 md:hidden">
            <div 
              className="px-6 py-3 rounded-full text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3), rgba(168, 242, 106, 0.3))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              🚀 CHOOSE YOUR MISSION:
            </div>
          </div>

          {/* Mobile Grid */}
          <div className="w-full mx-auto px-2 md:hidden mb-16">
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}
            >
            <Link href="/products/vinyl-stickers">
              <div 
                className="text-center rounded-xl p-6 flex flex-col" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Vinyl<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/holographic-stickers">
              <div 
                className="text-center rounded-xl p-6 flex flex-col" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.3))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Holographic<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/chrome-stickers">
              <div 
                className="text-center rounded-xl p-6 flex flex-col" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Chrome<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/glitter-stickers">
              <div 
                className="text-center rounded-xl p-6 flex flex-col" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.3))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Glitter<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/vinyl-banners">
              <div 
                className="text-center rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  gridColumn: 'span 2',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                    alt="Vinyl Banners"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(196, 181, 253, 0.5)) drop-shadow(0 0 24px rgba(196, 181, 253, 0.3))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Vinyl<br/>Banners →</h3>
              </div>
            </Link>
          </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="py-12 mt-8" style={{ backgroundColor: '#030140', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Quick Links */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                  <span className="mr-2">🔗</span>
                  Quick links
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                      <span className="mr-2">🚚</span>
                      Shipping Process
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                      <span className="mr-2">💰</span>
                      Profit Margin Calculator
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                      <span className="mr-2">📱</span>
                      QR Code Generator
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                      <span className="mr-2">📝</span>
                      Blog Posts
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                      <span className="mr-2">📞</span>
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>

              {/* Header Menu */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4">
                  Shop
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/deals" className="text-gray-300 hover:text-white transition-colors duration-200">
                      ⚡ Deals
                    </Link>
                  </li>
                  <li>
                    <a href="/products" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Start Your Order →
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Log in
                    </a>
                  </li>
                  <li>
                    <Link href="/signup" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Signup
                    </Link>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      🛒 Cart
                    </a>
                  </li>
                </ul>
              </div>

              {/* Info */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4">
                  Info
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Refund policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Shipping Policy
                    </a>
                  </li>
                </ul>
              </div>

              {/* Our Mission */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                  <span className="mr-2">🚀</span>
                  Our mission
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  We&apos;re called Sticker Shuttle, what do you think our mission is? To get your stickers to you as fast as humanly possible. At no extra cost.
                </p>
                
                {/* Social Media Links */}
                <div className="flex space-x-4">
                  <a 
                    href="https://www.instagram.com/stickershuttle/" 
          target="_blank"
          rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
        </a>
        <a
                    href="https://www.youtube.com/@stickershuttle" 
          target="_blank"
          rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Bottom */}
            <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="flex flex-col md:flex-row items-center justify-between">
                {/* Logo */}
                <div className="mb-4 md:mb-0">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                    alt="Sticker Shuttle Logo" 
                    className="h-10 w-auto object-contain footer-logo-hover cursor-pointer"
                  />
                </div>
                
                {/* Copyright */}
                <div className="text-white text-opacity-10 text-sm">
                  © 2025 Sticker Shuttle
                </div>
              </div>
            </div>
          </div>
      </footer>
    </Layout>
  );
} 