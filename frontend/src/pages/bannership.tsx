import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "../components/Layout";
import SEOHead from "../components/SEOHead";

import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

export default function Bannership() {
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  

  // Enhanced structured data for bannership page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Bannership",
    "url": "https://stickershuttle.com/bannership",
    "logo": "/bannership-logo.svg",
    "description": "Professional custom banner printing with fast shipping and high quality materials. Trusted by brands like Amazon, Nike, and thousands of businesses worldwide.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-BANNER",
      "contactType": "customer service",
      "email": "orbit@stickershuttle.com"
    },
    "sameAs": [
      "https://twitter.com/bannership",
      "https://instagram.com/bannership"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Custom Banner Products",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Custom Vinyl Banners",
            "description": "High-quality custom vinyl banners with fast 24-hour printing"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "Product",
            "name": "Mesh Banners",
            "description": "Durable mesh banners for outdoor use"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product", 
            "name": "Fabric Banners",
            "description": "Professional fabric banners for indoor displays"
          }
        }
      ]
    }
  };

  return (
    <>
      <Layout 
        title="Bannership - Premium Custom Banners & Vinyl Displays"
        description="Professional custom banners, vinyl displays, and signage with fast printing. Trusted by Amazon, Nike, Harry Potter and thousands of businesses. Free shipping, high quality materials."
        ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761143822/Thumbnail_wo6mhl.png"
        keywords="custom banners, vinyl banners, mesh banners, fabric banners, outdoor banners, indoor banners, business signage, promotional banners, display banners"
        canonical="https://stickershuttle.com/bannership"
        structuredData={structuredData}
        preconnect={[
          "https://res.cloudinary.com",
          "https://fonts.googleapis.com",
          "https://api.stripe.com"
        ]}
        customLogo="/bannership-logo.svg"
        customLogoAlt="Bannership Logo"
      >
        
        {/* Hero Section with Banner Background */}
        <section className="relative pt-[20px]">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 pb-4">
            <div 
              className="rounded-2xl pt-12 px-12 pb-8 relative overflow-hidden min-h-[400px] hero-banner"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                        alt="Credits" 
                        className="w-4 h-4 object-contain"
                      />
                      <span>Earn 5% back on every order</span>
                    </div>
                  </div>
                  
                  {/* Mobile text/icon */}
                  <div className="md:hidden flex items-center justify-center gap-2 text-xs" style={{ color: '#fbbf24' }}>
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                      alt="Credits" 
                      className="w-3 h-3 object-contain"
                    />
                    <span>Earn 5% back on every order</span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl mb-4 leading-none" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  <span className="block md:inline">We make vinyl banners</span>
                  <span className="block md:block"> for businesses</span>
                  <span className="block md:block"> like yours.</span>
                </h1>
                <p className="text-lg sm:text-xl mb-6 text-purple-100">
                  <span className="block sm:inline md:block">Because every ship needs colors worth flying.</span>
                </p>
                <div className="flex flex-col items-center gap-4 mb-4">
                  <a 
                    href="/bannership/products"
                    className="primaryButton px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-[1.004] inline-block rounded-lg"
                  >
                    Start Here →
                  </a>

                  {/* Hide deals link for wholesale users (handled in header globally). Keeping home CTA generic. */}

        </div>

              </div>
            </div>
          </div>
        </section>


        {/* Product Types Section - With Click to Show Features */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 relative">
            
            {/* Desktop/Tablet Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 group/container">
              {/* Pop Up Banners */}
              <Link href="/bannership/products/pop-up-banners">
                <div 
                  className="banner-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-500 ease-out">
                    <img 
                      src="/popup-banner-icon.png" 
                      alt="Pop Up Banners" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Pop Up Banners →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Vinyl Banners */}
              <Link href="/bannership/products/vinyl-banners">
                <div 
                  className="banner-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-500 ease-out">
                    <img 
                      src="/vinyl-banner-icon.png" 
                      alt="Vinyl Banners" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Vinyl Banners →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* X-Banner */}
              <Link href="/bannership/products/x-banners">
                <div 
                  className="banner-hover text-center group/card cursor-pointer rounded-2xl p-4 lg:p-6 transition-all duration-300 ease-out hover:scale-105 transform overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                   <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto mb-4 lg:mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-2 transition-transform duration-500 ease-out">
                     <img 
                       src="/x-banner-icon.png?v=2" 
                       alt="X-Banner" 
                       className="w-full h-full object-contain"
                       style={{
                         filter: 'none'
                       }}
                     />
                   </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">X-Banner →</h3>
                  
                  {/* Features hidden - just show on click */}
                </div>
              </Link>

              {/* Stickers */}
              <Link href="/">
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
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                      alt="Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'none'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2 text-sm lg:text-base">Stickers →</h3>
                  
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

               {/* Sticker Sheets - Hidden */}
            </div>

            {/* Mobile Scrollable Cards */}
            <div className="sm:hidden overflow-x-auto pb-4">
              <div className="flex space-x-4 w-max">
                {/* Pop Up Banners Mobile */}
                <Link href="/bannership/products/pop-up-banners">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      height: '240px'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="/popup-banner-icon.png" 
                        alt="Pop Up Banners" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Pop Up<br/>Banners →</h3>
                  </div>
                </Link>

                {/* Vinyl Banners Mobile */}
                <Link href="/bannership/products/vinyl-banners">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      height: '240px'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="/vinyl-banner-icon.png" 
                        alt="Vinyl Banners" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Vinyl<br/>Banners →</h3>
                  </div>
                </Link>

                {/* X-Banner Mobile */}
                <Link href="/bannership/products/x-banners">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      height: '240px'
                    }}
                  >
                     <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                       <img 
                         src="/x-banner-icon.png?v=2" 
                         alt="X-Banner" 
                         className="w-full h-full object-contain"
                         style={{
                           filter: 'none'
                         }}
                       />
                     </div>
                    <h3 className="font-semibold text-white">X-<br/>Banners →</h3>
                  </div>
                </Link>

                {/* Stickers Mobile */}
                <Link href="/">
                  <div 
                    className="flex-shrink-0 w-48 text-center rounded-2xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      height: '240px'
                    }}
                  >
                    <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                        alt="Stickers" 
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white">Stickers →</h3>
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

        

        {/* Testimonials Section */}
        <section className="pt-0 pb-8 md:py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-6 mt-4">
              <div className="flex justify-center mb-4">
                <h2 className="text-3xl font-bold text-white">
                  <span style={{filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.4))', display: 'inline-block'}}>☠️</span> There&apos;s <span className="relative inline-block">nothing<span className="absolute -bottom-1 left-0 right-0 h-1 bg-white transform rotate-1 rounded-full"></span></span> to fear...
                </h2>
              </div>
              <p className="text-gray-300 text-lg">
                                    We may be pirates, but we are trusted across the far seas...
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
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none z-10"></div>
              
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
        <style jsx global>{`
          body {
            background-color: #000000 !important;
          }
          
          /* Override Layout background */
          .min-h-screen {
            background-color: #000000 !important;
          }
          
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
          .banner-hover:hover,
          .chrome-hover:hover,
          .clear-hover:hover {
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

          /* Responsive Banner Styles - With background image */
          .hero-banner {
            background: 
              linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)),
              url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1759850159/BannerShip_VinylBanner_VinylBanner_adi95s.png');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }

        `}</style>
      </Layout>
    </>
  );
}
