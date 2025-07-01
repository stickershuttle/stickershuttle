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
        <main className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto py-12 px-4">
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
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
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
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
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

            {/* Glitter Stickers */}
            <Link href="/products/glitter-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
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

            {/* Chrome Stickers */}
            <Link href="/products/chrome-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
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

            {/* Clear Stickers */}
            <Link href="/products/clear-stickers">
              <div 
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-1 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                    alt="Clear Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Clear Stickers →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🔍 Crystal Transparency</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">💎 Professional Clarity</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🌊 Seamless Blending</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">🏆 Premium Clear Vinyl</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Sticker Sheets */}
            <Link href="/products/sticker-sheets">
              <div 
                className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sticker Sheets" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Sticker Sheets →</h3>
                
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">📄 Multiple Stickers Per Sheet</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🛡️ Laminated with 7 yr protection</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">✂️ Kiss-Cut for Easy Peeling</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌦️ UV & Weather Resistant</span>
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">📏 Custom Sheet Layouts</span>
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
                className="text-center rounded-2xl p-6 flex flex-col" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Vinyl<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/holographic-stickers">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Holographic<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/glitter-stickers">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Glitter<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/chrome-stickers">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Chrome<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/clear-stickers">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                    alt="Clear Stickers"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Clear<br/>Stickers →</h3>
              </div>
            </Link>

            <Link href="/products/sticker-sheets">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  gridColumn: 'span 2',
                  height: '220px'
                }}
              >
                                <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sticker Sheets"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Sticker<br/>Sheets →</h3>
              </div>
            </Link>
          </div>
          </div>

          {/* Signage Section */}
          <div className="mt-16">
            {/* Signage Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>Signage</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Professional signage solutions for your business or event needs.
              </p>
            </div>

            {/* Signage Desktop Grid */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 group/container mb-16">
              {/* Vinyl Banners */}
              <Link href="/products/vinyl-banners">
                <div 
                  className="text-center group/card cursor-pointer rounded-2xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                      alt="Vinyl Banners" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Banners →</h3>
                  
                  <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                    <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">💪 Heavy Duty 13oz Vinyl</span>
                        <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🔗 Hemmed & Grommeted</span>
                        <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🌦️ UV & Weather Resistant</span>
                        <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">📏 Custom Sizes Available</span>
                        <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50">🏢 Professional Grade</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Signage Mobile Grid */}
            <div className="w-full mx-auto px-2 md:hidden mb-16">
              <div 
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(1, 1fr)',
                  gap: '16px'
                }}
              >
                <Link href="/products/vinyl-banners">
                  <div 
                    className="text-center rounded-2xl p-6 flex flex-col"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      height: '220px'
                    }}
                  >
                    <div className="w-28 h-28 mx-auto flex items-center justify-center mb-6">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                        alt="Vinyl Banners"
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-6">Vinyl<br/>Banners →</h3>
                  </div>
                </Link>
              </div>
            </div>
          </div>

        </main>
    </Layout>
  );
} 



