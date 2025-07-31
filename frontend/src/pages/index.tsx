import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "../components/Layout";
import SEOHead from "../components/SEOHead";

import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [posterImage] = useState<string>("https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601387/d2b7fa8c-41a7-421a-9fde-3d7cf2b0a3a3.png");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
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

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        if (!hasStarted) {
          setHasStarted(true);
          // Reset to beginning when first playing
          videoRef.current.currentTime = 0;
        }
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  // Enhanced structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sticker Shuttle",
    "url": "https://stickershuttle.com",
    "logo": "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png",
    "description": "Professional custom sticker printing with fast shipping and high quality materials. Trusted by brands like Amazon, Nike, and thousands of businesses worldwide.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-STICKER",
      "contactType": "customer service",
      "email": "orbit@stickershuttle.com"
    },
    "sameAs": [
      "https://twitter.com/stickershuttle",
      "https://instagram.com/stickershuttle"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Custom Sticker Products",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Custom Vinyl Stickers",
            "description": "High-quality custom vinyl stickers with fast 24-hour printing"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "Product",
            "name": "Holographic Stickers",
            "description": "Eye-catching holographic custom stickers"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product", 
            "name": "Clear Stickers",
            "description": "Professional transparent custom stickers"
          }
        }
      ]
    }
  };

  return (
    <>
      <Layout 
        title="Sticker Shuttle - Premium Custom Stickers & Vinyl Banners"
        description="Professional custom stickers, vinyl banners, and decals with fast printing. Trusted by Amazon, Nike, Harry Potter and thousands of businesses. Free shipping, high quality materials."
        ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png"
        keywords="custom stickers, vinyl stickers, holographic stickers, clear stickers, chrome stickers, glitter stickers, custom decals, vinyl banners, business stickers, promotional stickers, logo stickers"
        canonical="https://stickershuttle.com"
        structuredData={structuredData}
        preconnect={[
          "https://res.cloudinary.com",
          "https://fonts.googleapis.com",
          "https://api.stripe.com"
        ]}
      >
        {/* Sitewide Alert Banner */}
  
        
        {/* Hero Section with Banner Background */}
        <section className="relative pt-[20px]">
                      <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 pb-4">
            <div 
              className="rounded-2xl pt-12 px-12 pb-8 relative overflow-hidden min-h-[400px] hero-banner"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-center relative z-10">
                {/* Earn 5% back above H1 - pill container on desktop, text/icon on mobile */}
                <div className="mb-4">
                  {/* Desktop pill container */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className="px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2"
                         style={{
                           background: 'linear-gradient(135deg, rgba(255, 215, 19, 0.3) 0%, rgba(255, 215, 19, 0.15) 50%, rgba(255, 215, 19, 0.05) 100%)',
                           border: '1px solid rgba(255, 215, 19, 0.4)',
                           backdropFilter: 'blur(12px)',
                           color: '#fbbf24'
                         }}>
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753920074/CoinIcon2_idmqml.png" 
                        alt="Credits" 
                        className="w-4 h-4 object-contain"
                      />
                      <span>Earn 5% back on every order</span>
                    </div>
                  </div>
                  
                  {/* Mobile text/icon */}
                  <div className="md:hidden flex items-center justify-center gap-2 text-xs" style={{ color: '#fbbf24' }}>
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753920074/CoinIcon2_idmqml.png" 
                      alt="Credits" 
                      className="w-3 h-3 object-contain"
                    />
                    <span>Earn 5% back on every order</span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl mb-4 leading-none" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  <span className="block md:inline">Tired of waiting</span>
                  <span className="block md:inline"> weeks to get</span>
                  <span className="block md:block"> your stickers?</span>
                </h1>
                <p className="text-lg sm:text-xl mb-6 text-purple-100">
                  <span className="block sm:inline md:block">See why brands like Amazon, Nike Football, and thousands</span>
                  <span className="block sm:inline md:inline">of others trust us with their business.</span>
                </p>
                <div className="flex flex-col items-center gap-4 mb-4">
                  <a 
                    href="/products"
                    className="primaryButton px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-[1.004] inline-block rounded-lg"
                  >
                    Start Here 🡒
                  </a>
                  <a 
                    href="/products/sample-packs" 
                    className="text-white hover:text-purple-200 transition pb-0 md:pb-0"
                  >
                    Order Sample Pack 🡒
                  </a>
                  <a 
                    href="/deals" 
                    className="text-white hover:text-purple-200 transition pb-8  md:pb-0 block md:hidden"
                  >
                   🔥 Deals 🡒
                  </a>

        </div>

              </div>
            </div>
          </div>
        </section>

        {/* Brands Section - Infinite Scroll */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div className="flex justify-center mb-4">
              <div 
                className="px-4 py-1.5 rounded-full text-center text-sm text-gray-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                Brands we print for:
              </div>
            </div>
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-4 animate-scroll"
                style={{
                  animation: 'scroll 35s linear infinite',
                  width: 'max-content'
                }}
              >
                {/* First set of brands */}
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" width={120} height={80} className="h-20 w-auto brand-float-1" priority />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" width={120} height={80} className="h-20 w-auto brand-float-2" priority />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" width={120} height={80} className="h-20 w-auto brand-float-3" priority />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" width={120} height={80} className="h-20 w-auto brand-float-4" priority />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" width={120} height={80} className="h-20 w-auto brand-float-5" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751505017/StickerShuttle_HarryPotter_zlrki5.png" alt="Harry Potter" width={120} height={80} className="h-20 w-auto brand-float-6" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751396878/CanAmIcon_o3tydg.png" alt="Can-Am" width={96} height={64} className="h-16 w-auto brand-float-1" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" width={120} height={80} className="h-20 w-auto brand-float-2" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" width={120} height={80} className="h-20 w-auto brand-float-3" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" width={120} height={80} className="h-20 w-auto brand-float-4" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" width={120} height={80} className="h-20 w-auto brand-float-5" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" width={120} height={80} className="h-20 w-auto brand-float-6" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" width={120} height={80} className="h-20 w-auto brand-float-1" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" width={120} height={80} className="h-20 w-auto brand-float-2" />
                
                {/* Duplicate set for seamless loop */}
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" width={120} height={80} className="h-20 w-auto brand-float-1" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" width={120} height={80} className="h-20 w-auto brand-float-2" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" width={120} height={80} className="h-20 w-auto brand-float-3" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" width={120} height={80} className="h-20 w-auto brand-float-4" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" width={120} height={80} className="h-20 w-auto brand-float-5" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751505017/StickerShuttle_HarryPotter_zlrki5.png" alt="Harry Potter" width={120} height={80} className="h-20 w-auto brand-float-6" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751396878/CanAmIcon_o3tydg.png" alt="Can-Am" width={96} height={64} className="h-16 w-auto brand-float-1" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" width={120} height={80} className="h-20 w-auto brand-float-2" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" width={120} height={80} className="h-20 w-auto brand-float-3" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" width={120} height={80} className="h-20 w-auto brand-float-4" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" width={120} height={80} className="h-20 w-auto brand-float-5" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" width={120} height={80} className="h-20 w-auto brand-float-6" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" width={120} height={80} className="h-20 w-auto brand-float-1" />
                <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" width={120} height={80} className="h-20 w-auto brand-float-2" />
              </div>
              
              {/* Fade effects */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none"></div>
            </div>
          </div>
        </section>

        {/* Product Types Section - With Click to Show Features */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 relative">
            
            {/* Desktop/Tablet Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 group/container">
              {/* Vinyl Stickers */}
              <Link href="/products/vinyl-stickers">
                <div 
                  className="vinyl-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                      alt="Vinyl Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Vinyl Stickers →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Holographic Stickers */}
              <Link href="/products/holographic-stickers">
                <div 
                  className="holographic-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                      alt="Holographic Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Holographic Stickers →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Glitter Stickers */}
              <Link href="/products/glitter-stickers">
                <div 
                  className="glitter-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                      alt="Glitter Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Glitter Stickers →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Chrome Stickers */}
              <Link href="/products/chrome-stickers">
                <div 
                  className="chrome-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-2 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                      alt="Chrome Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Chrome Stickers →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Clear Stickers - Mobile & Tablet Only */}
              <Link href="/products/clear-stickers" className="lg:hidden">
                <div 
                  className="clear-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-1 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                      alt="Clear Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Clear Stickers →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Sticker Sheets */}
              <Link href="/products/sticker-sheets">
                <div 
                  className="banner-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-1 transition-transform duration-500 ease-out">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                      alt="Sticker Sheets" 
                      className="w-full h-full object-contain"
                                              style={{
                          filter: 'none'
                        }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Sticker Sheets →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>
            </div>

            {/* Mobile Scrollable Cards */}
            <div className="sm:hidden overflow-x-auto pb-4">
              <div className="flex space-x-4 w-max">
                {/* Vinyl Stickers Mobile */}
                <Link href="/products/vinyl-stickers">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                        alt="Vinyl Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Vinyl<br/>Stickers →</h3>
                  </div>
                </Link>

                {/* Holographic Stickers Mobile */}
                <Link href="/products/holographic-stickers">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                        alt="Holographic Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Holographic<br/>Stickers →</h3>
                  </div>
                </Link>

                {/* Glitter Stickers Mobile */}
                <Link href="/products/glitter-stickers">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                        alt="Glitter Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Glitter<br/>Stickers →</h3>
                  </div>
                </Link>

                {/* Chrome Stickers Mobile */}
                <Link href="/products/chrome-stickers">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                        alt="Chrome Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Chrome<br/>Stickers →</h3>
                  </div>
                </Link>

                {/* Clear Stickers Mobile */}
                <Link href="/products/clear-stickers">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                        alt="Clear Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Clear<br/>Stickers →</h3>
                  </div>
                </Link>

                {/* Sticker Sheets Mobile */}
                <Link href="/products/sticker-sheets">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                        alt="Sticker Sheets" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Sticker<br/>Sheets →</h3>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>



        {/* Benefits Section */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Free Shipping */}
              <div 
                className="rounded-2xl p-6"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="text-4xl mr-4"
                  >
                    📦
                  </div>
                  <h3 className="font-semibold">
                    <span className="text-white">Free shipping</span>
                    <span className="text-gray-300"> on all orders, always.</span>
                  </h3>
                </div>
              </div>

              {/* Quality */}
              <div 
                className="rounded-2xl p-6"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="text-4xl mr-4 spin-slow"
                  >
                    🌍
                  </div>
                  <h3 className="font-semibold">
                    <span className="text-white">Out of this world quality</span>
                    <span className="text-gray-300">, made here.</span>
                  </h3>
                </div>
              </div>

              {/* Free Proof */}
              <div 
                className="rounded-2xl p-6"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="text-4xl mr-4"
                  >
                    🖼️
                  </div>
                  <h3 className="font-semibold">
                    <span className="text-white">Free proof included</span>
                    <span className="text-gray-300">, no conspiracies.</span>
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section className="py-4 md:hidden">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div className="flex flex-col space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:items-stretch">
              {/* Video */}
              <div className="relative rounded-xl overflow-hidden cursor-pointer" onClick={toggleVideo}>
                <video 
                  ref={videoRef}
                  className="w-full rounded-xl"
                  style={{ 
                    height: '400px',
                    width: '100%',
                    objectFit: 'cover'
                  }}
                  onEnded={handleVideoEnded}
                  playsInline
                  preload="metadata"
                  poster="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601387/d2b7fa8c-41a7-421a-9fde-3d7cf2b0a3a3.png"
                  controls={hasStarted}
                >
                  <source src="https://stickershuttle.com/cdn/shop/videos/c/vp/8f87f3238509493faba9ce1552b073de/8f87f3238509493faba9ce1552b073de.HD-1080p-7.2Mbps-38779776.mp4?v=0" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Custom Play Button Overlay - Only show when video hasn't started */}
                {!hasStarted && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                    <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 transform hover:scale-105 shadow-lg">
                      <div className="w-0 h-0 border-l-[16px] border-l-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Container - Hidden on tablet/mobile */}
              <div 
                className="hidden md:flex rounded-2xl p-6 md:p-8 flex-col justify-center"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  minHeight: '400px',
                  height: '100%'
                }}
              >
                <div className="flex items-center mb-6">
                  <div 
                    className="text-4xl mr-4"
                  >
                    📦
                  </div>
                  <h2 className="text-3xl font-bold text-white">Free shipping, always.</h2>
                </div>
                
                <div className="space-y-4 mb-8 flex-grow">
                  <p className="text-gray-300 leading-relaxed">
                    At Sticker Shuttle, we get what it&apos;s like to run a small business. That&apos;s why we&apos;re passionate about helping other small businesses with high-quality custom stickers and banners that launch your brand and connect with customers—all without breaking the bank.
                  </p>
                  
                  <p className="text-gray-300 leading-relaxed">
                    When you work with us, you&apos;re supporting a local business that&apos;s all about community, creativity, and craftsmanship. Let&apos;s stick together and grow together!
                  </p>
                </div>

                <Link href="/products">
                  <button 
                    className="px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg mt-auto"
                    style={{
                      backgroundColor: '#ffd713',
                      color: '#030140',
                      boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                      border: 'solid',
                      borderWidth: '0.03125rem',
                      borderColor: '#8d9912'
                    }}
                  >
                    Order your stickers today →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="pt-0 pb-8 md:py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-6 mt-4">
              <div className="flex justify-center mb-4">
                <h2 className="text-3xl font-bold text-white">
                  <span style={{filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.6)) drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))', display: 'inline-block'}}>👽</span> <span className="relative inline-block">Not<span className="absolute -bottom-1 left-0 right-0 h-1 bg-yellow-400 transform rotate-1 rounded-full"></span></span> a conspiracy theory...
                </h2>
              </div>
              <p className="text-gray-300 text-lg">
                                    And we&apos;re not aliens, that&apos;s why thousands of other businesses DO believe in us...
              </p>
            </div>

            {/* Desktop Reviews Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Review 1 - Certified Garbage Rat */}
              <div 
                className="rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                    alt="Certified Garbage Rat"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                
                <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                </p>
              </div>

              {/* Review 2 - Panda Reaper */}
              <div 
                className="rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                    alt="Panda Reaper"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                
                <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                </p>
              </div>

              {/* Review 3 - Anita J */}
              <div 
                className="rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                    alt="Anita J"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                
                <h3 className="text-white font-semibold mb-1">Anita J</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                </p>
              </div>

              {/* Review 4 - Rach Plants */}
              <div 
                className="rounded-2xl p-6 flex flex-col"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                    alt="Rach Plants"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                
                <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                </p>
              </div>
            </div>

            {/* Mobile Swipeable Reviews */}
            <div className="md:hidden overflow-x-auto pb-4 relative">
              {/* Left fade only */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none z-10"></div>
              
              <div className="flex space-x-4 w-max" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Review 1 - Certified Garbage Rat Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-2xl p-6 flex flex-col"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                      alt="Certified Garbage Rat"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                  
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Review 2 - Panda Reaper Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-2xl p-6 flex flex-col"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                      alt="Panda Reaper"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>

                {/* Review 3 - Anita J Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-2xl p-6 flex flex-col"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                      alt="Anita J"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1">Anita J</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                  </p>
                </div>

                {/* Review 4 - Rach Plants Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-2xl p-6 flex flex-col"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                      alt="Rach Plants"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                  
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Quick Login Banner - Only show when not logged in */}
        {!user && !loading && (
          <section className="py-4">
            <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
              <div 
                className="rounded-2xl p-8 text-center relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
              {/* Background decoration - Stars */}
              <div className="absolute inset-0 opacity-20">
                {/* Top stars */}
                <div className="absolute top-6 left-8 text-yellow-400 text-lg">⭐</div>
                <div className="absolute top-4 left-1/4 text-white text-sm">✨</div>
                <div className="absolute top-8 right-1/4 text-purple-400 text-base">⭐</div>
                <div className="absolute top-6 right-8 text-blue-400 text-sm">✨</div>
                
                {/* Middle stars */}
                <div className="absolute top-1/2 left-6 text-green-400 text-sm">⭐</div>
                <div className="absolute top-1/2 right-6 text-pink-400 text-base">✨</div>
                <div className="absolute top-1/3 left-12 text-orange-400 text-xs">⭐</div>
                <div className="absolute top-2/3 right-12 text-cyan-400 text-sm">✨</div>
                
                {/* Bottom stars */}
                <div className="absolute bottom-6 left-1/3 text-yellow-400 text-sm">✨</div>
                <div className="absolute bottom-8 left-16 text-purple-400 text-xs">⭐</div>
                <div className="absolute bottom-4 right-1/3 text-white text-base">⭐</div>
                <div className="absolute bottom-6 right-16 text-blue-400 text-sm">✨</div>
                
                {/* Corner stars */}
                <div className="absolute top-12 left-1/2 text-green-400 text-xs">⭐</div>
                <div className="absolute bottom-12 left-1/2 text-pink-400 text-sm">✨</div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Already a customer?
                </h2>
                <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
                  Login to track your orders, reorder favorites, and access exclusive customer perks.
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

        {/* Custom CSS for infinite scroll animation */}
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          
          /* Floating animations for brand icons */
          @keyframes float1 {
            0%, 100% {
              transform: translateY(0px) rotate(-3deg);
            }
            25% {
              transform: translateY(-3px) rotate(4.5deg);
            }
            50% {
              transform: translateY(-6px) rotate(-5deg);
            }
            75% {
              transform: translateY(-2px) rotate(3.8deg);
            }
          }
          
          @keyframes float2 {
            0%, 100% {
              transform: translateY(0px) rotate(2.5deg);
            }
            30% {
              transform: translateY(-4px) rotate(-4.8deg);
            }
            60% {
              transform: translateY(-2px) rotate(5.5deg);
            }
            90% {
              transform: translateY(-5px) rotate(-3.2deg);
            }
          }
          
          @keyframes float3 {
            0%, 100% {
              transform: translateY(0px) rotate(-2deg);
            }
            20% {
              transform: translateY(-2px) rotate(4.5deg);
            }
            40% {
              transform: translateY(-5px) rotate(-5.5deg);
            }
            60% {
              transform: translateY(-1px) rotate(3.2deg);
            }
            80% {
              transform: translateY(-3px) rotate(-2.8deg);
            }
          }
          
          @keyframes float4 {
            0%, 100% {
              transform: translateY(0px) rotate(4deg);
            }
            25% {
              transform: translateY(-3px) rotate(-5.2deg);
            }
            50% {
              transform: translateY(-6px) rotate(6deg);
            }
            75% {
              transform: translateY(-1px) rotate(-3.8deg);
            }
          }
          
          @keyframes float5 {
            0%, 100% {
              transform: translateY(0px) rotate(-3.5deg);
            }
            30% {
              transform: translateY(-4px) rotate(5.2deg);
            }
            60% {
              transform: translateY(-2px) rotate(-4.8deg);
            }
            85% {
              transform: translateY(-5px) rotate(2.8deg);
            }
          }
          
          @keyframes float6 {
            0%, 100% {
              transform: translateY(0px) rotate(3.2deg);
            }
            35% {
              transform: translateY(-3px) rotate(-5.8deg);
            }
            65% {
              transform: translateY(-4px) rotate(4.8deg);
            }
            85% {
              transform: translateY(-1px) rotate(-3.5deg);
            }
          }
          
          /* Brand floating classes */
          .brand-float-1 {
            animation: float1 8s ease-in-out infinite;
          }
          
          .brand-float-2 {
            animation: float2 9s ease-in-out infinite;
          }
          
          .brand-float-3 {
            animation: float3 7s ease-in-out infinite;
          }
          
          .brand-float-4 {
            animation: float4 10s ease-in-out infinite;
          }
          
          .brand-float-5 {
            animation: float5 8.5s ease-in-out infinite;
          }
          
          .brand-float-6 {
            animation: float6 9.5s ease-in-out infinite;
          }
          
          /* Hide scrollbar on mobile reviews */
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
          
          /* Spinning earth animation */
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          .spin-slow {
            animation: spin 4s linear infinite;
          }
          
          /* Fade in animation */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
          
          /* Sticker type hover effects - simple lightening */
          .vinyl-hover:hover,
          .holographic-hover:hover,
          .chrome-hover:hover,
          .glitter-hover:hover,
          .clear-hover:hover,
          .banner-hover:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }
          
          /* Logo hover animations */
          .logo-hover {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          
          .logo-hover:hover {
            transform: scale(1.1) rotate(5deg);
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)) 
                    drop-shadow(0 0 40px rgba(168, 242, 106, 0.4))
                    drop-shadow(0 0 60px rgba(168, 85, 247, 0.3));
            animation: logo-bounce 0.6s ease-in-out;
          }
          
          @keyframes logo-bounce {
            0% { transform: scale(1.1) rotate(5deg) translateY(0px); }
            25% { transform: scale(1.12) rotate(6deg) translateY(-3px); }
            50% { transform: scale(1.15) rotate(4deg) translateY(-5px); }
            75% { transform: scale(1.12) rotate(7deg) translateY(-2px); }
            100% { transform: scale(1.1) rotate(5deg) translateY(0px); }
          }
          
          /* Header Button Styles - Match Header Component */
          .headerButton {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            backdrop-filter: blur(10px) !important;
          }

          .headerButton:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
          }
          
          /* Active page button styling */
          .headerButton.active {
            border: 0.5px solid #a855f7 !important;
            background: rgba(168, 85, 247, 0.1) !important;
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3) !important;
          }
          
          .headerButton.active:hover {
            background: rgba(168, 85, 247, 0.2) !important;
            border-color: #a855f7 !important;
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.4) !important;
          }
          
          .primaryButton {
            background: linear-gradient(135deg, #ffd713, #ffed4e);
            color: #030140;
            font-weight: bold;
            border: none;
          }
          
          .primaryButton:hover {
            background: linear-gradient(135deg, #ffed4e, #ffd713);
            transform: scale(1.05);
          }

          /* Responsive Banner Styles */
          .hero-banner {
            background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751994147/StickerShuttle_Banner_MainMobile_a93h3q.png');
            background-size: cover;
            background-position: center bottom;
            background-repeat: no-repeat;
          }
          
          @media (min-width: 768px) {
            .hero-banner {
              background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751382016/StickerShuttle_Banner_Main_nlzoro.png');
            }
          }

        `}</style>
      </Layout>
    </>
  );
}
