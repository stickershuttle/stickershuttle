import Layout from "@/components/Layout";
import VinylBannerCalculator from "@/components/vinyl-banner-calculator";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function VinylBanners() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <Layout title="Vinyl Banners - Professional Signage | Sticker Shuttle">
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
        <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-8 px-6 md:px-4 md:p-12 relative overflow-hidden"
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
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
          <VinylBannerCalculator />
        </div>
      </section>

      {/* Three-Column Benefits Section */}
      <section className="pt-4 pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
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

      {/* Login/Signup Section - Only show when user is logged out */}
      {!loading && !user && (
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
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



