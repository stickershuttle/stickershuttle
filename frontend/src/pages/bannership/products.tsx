import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { getCartUrl } from "@/utils/domain-aware-links";

export default function BannershipProducts() {
  const router = useRouter();
  const [dotCount, setDotCount] = useState<number>(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Animate the dots for "blast off"
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Check if item was just added to cart
  useEffect(() => {
    if (router.query.added === 'true') {
      setShowSuccess(true);
      // Clean URL after showing message
      router.replace('/bannership/products', undefined, { shallow: true });
      // Auto-hide after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [router.query.added, router]);

  return (
    <Layout 
      title="Banner Products - Bannership"
      description="Professional custom banners, vinyl displays, and signage with fast printing. Choose from pop-up banners, vinyl banners, and X-banners."
      customLogo="/bannership-logo.svg"
      customLogoAlt="Bannership Logo"
    >
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
          60% {
            opacity: 1;
            transform: translateY(5px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
      
      {/* Success Message */}
      {showSuccess && (
        <div 
          className="fixed top-4 right-4 z-50 px-6 py-4 rounded-xl text-white font-medium shadow-lg transition-all duration-500 animate-bounce-in"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-green-400">✅</span>
            <span>Item added to cart!</span>
            <Link href={getCartUrl()} className="text-green-300 hover:text-green-200 underline transition-colors">
              View Cart
            </Link>
            <button 
              onClick={() => setShowSuccess(false)}
              className="text-green-300 hover:text-green-200 ml-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            
            {/* Custom Banners Banner */}
            <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-white" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>Custom Banners</h1>
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
              Professional banner solutions for your business. We do one thing and one thing only. Banners.
            </p>
          </div>

          {/* Choose Your Banner Type Pill - Desktop */}
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
              🚀 CHOOSE YOUR BANNER TYPE:
            </div>
          </div>

          {/* Products Grid - Desktop */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Pop Up Banners */}
            <Link href="/bannership/products/pop-up-banners">
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
                    src="/popup-banner-icon.png" 
                    alt="Pop Up Banners" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Pop Up Banners →</h3>
              </div>
            </Link>

            {/* Vinyl Banners */}
            <Link href="/bannership/products/vinyl-banners">
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
                    src="/vinyl-banner-icon.png" 
                    alt="Vinyl Banners" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Vinyl Banners →</h3>
              </div>
            </Link>

            {/* X Banners */}
            <Link href="/bannership/products/x-banners">
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
                    src="/x-banner-icon.png" 
                    alt="X Banners" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">X Banners →</h3>
              </div>
            </Link>
          </div>

          {/* Choose Your Banner Type Pill */}
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
              🚀 CHOOSE YOUR BANNER TYPE:
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
            <Link href="/bannership/products/pop-up-banners">
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
                    src="/popup-banner-icon.png" 
                    alt="Pop Up Banners"
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'none'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white text-sm mb-6">Pop Up<br/>Banners →</h3>
              </div>
            </Link>

            <Link href="/bannership/products/vinyl-banners">
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
                    src="/vinyl-banner-icon.png" 
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

            <Link href="/bannership/products/x-banners">
              <div 
                className="text-center rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  gridColumn: 'span 2',
                  height: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-28 h-28">
                    <img 
                      src="/x-banner-icon.png" 
                      alt="X Banners"
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                </div>
                <h3 className="font-semibold text-white text-sm">X-<br/>Banners →</h3>
              </div>
            </Link>
          </div>
          </div>

        </main>
    </Layout>
  );
}
