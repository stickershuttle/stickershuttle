import { useState, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [posterImage] = useState<string>("https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601387/d2b7fa8c-41a7-421a-9fde-3d7cf2b0a3a3.png");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Commented out API call that was causing 405 errors
  // useEffect(() => {
  //   const fetchHello = async () => {
  //     setLoading(true);
  //     setError("");
  //     try {
  //       const res = await fetch(API_URL!, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           query: `query Hello { hello }`,
  //         }),
  //       });

  //       if (!res.ok) {
  //         throw new Error(`Network response was not ok: ${res.status} ${res.statusText}`);
  //       }

  //       const text = await res.text();
  //       try {
  //         const json = JSON.parse(text);
  //         if (json.errors) {
  //           setError(json.errors[0].message || "Unknown error");
  //         } else {
  //           setHello(json.data.hello);
  //         }
  //       } catch {
  //         throw new Error("API did not return valid JSON: " + text);
  //       }
  //     } catch (e: unknown) {
  //       const message = e instanceof Error ? e.message : String(e);
  //       setError(message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchHello();
  // }, []);

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

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591674/AlienSSFavicon_jlkmoi.svg" />
        
        {/* iOS Status Bar and Theme Color */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#030140" />
        <meta name="msapplication-navbutton-color" content="#030140" />
        <meta name="apple-mobile-web-app-title" content="Sticker Shuttle" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        
        <title>Sticker Shuttle - Custom Stickers & Vinyl Signs</title>
      </Head>
      
      <div className="min-h-screen text-white relative" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>


        {/* Header */}
        <header className="w-full relative z-10" style={{ backgroundColor: '#030140' }}>
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto py-4 px-4">
            <div className="flex items-center justify-between">
              {/* Mobile/Tablet Hamburger Menu */}
              <button 
                className="lg:hidden text-white text-2xl z-50 relative" 
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <div className="flex flex-col space-y-1">
                  <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                  <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                </div>
              </button>

              {/* Logo - Centered on mobile/tablet, left on desktop */}
              <div className="flex items-center lg:justify-start justify-center flex-1 lg:flex-initial">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                  alt="Sticker Shuttle Logo" 
                  className="h-12 w-auto object-contain logo-hover cursor-pointer"
                  style={{ maxWidth: 'none' }}
                />
              </div>

              {/* Desktop Search Bar */}
              <div className="hidden lg:flex flex-1 items-center gap-2 relative" style={{ marginLeft: '20px', marginRight: '20px' }}>
                <input 
                  type="text"
                  placeholder="Go on.. create your universe 🧑‍🚀"
                  className="headerButton flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform focus:scale-101 focus:outline-none placeholder-gray-400"
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 150)}
                />
                <button 
                  className="headerButton px-3 py-2 font-medium text-white transition-all duration-200 transform hover:scale-105 rounded-lg"
                  style={{ backgroundColor: '#030140' }}
                  aria-label="Search"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" 
                    />
                  </svg>
                </button>
                
                {/* Search Dropdown */}
                {isSearchDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 right-8 mt-2 rounded-lg z-50 shadow-lg"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="p-2">
                      <h3 className="text-sm font-semibold text-white mb-2 px-2">Sticker Types:</h3>
                      <div className="space-y-1">
                        {/* Vinyl Stickers */}
                        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group">
                          <div className="w-8 h-8 mr-3 flex items-center justify-center">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                              alt="Vinyl" 
                              className="max-w-full max-h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 0 6px rgba(168, 242, 106, 0.4))'
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Stickers</p>
                            <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(168, 242, 106)' }}>Waterproof & UV Resistant</p>
                          </div>
                        </div>
                        
                        {/* Holographic Stickers */}
                        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group">
                          <div className="w-8 h-8 mr-3 flex items-center justify-center">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                              alt="Holographic" 
                              className="max-w-full max-h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))'
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Holographic Stickers</p>
                            <p 
                              className="text-xs transition-colors duration-200 group-hover:text-gray-700" 
                              style={{ 
                                background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              }}
                            >
                              Rainbow Holographic Effect
                            </p>
                          </div>
                        </div>
                        
                        {/* Chrome Stickers */}
                        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group">
                          <div className="w-8 h-8 mr-3 flex items-center justify-center">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                              alt="Chrome" 
                              className="max-w-full max-h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.4))'
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Chrome Stickers</p>
                            <p 
                              className="text-xs transition-colors duration-200 group-hover:text-gray-700" 
                              style={{ 
                                background: 'linear-gradient(45deg, #dcdcdc, #ffffff, #c0c0c0, #f0f0f0, #e8e8e8)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              }}
                            >
                              Mirror Chrome Finish
                            </p>
                          </div>
                        </div>
                        
                        {/* Glitter Stickers */}
                        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group">
                          <div className="w-8 h-8 mr-3 flex items-center justify-center">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                              alt="Glitter" 
                              className="max-w-full max-h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))'
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Glitter Stickers</p>
                            <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(59, 130, 246)' }}>Sparkly Glitter Finish</p>
                          </div>
                        </div>
                        
                        {/* Vinyl Banners */}
                        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group">
                          <div className="w-8 h-8 mr-3 flex items-center justify-center">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                              alt="Vinyl Banners" 
                              className="max-w-full max-h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 0 6px rgba(196, 181, 253, 0.4))'
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Banners</p>
                            <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(196, 181, 253)' }}>Heavy Duty 13oz Vinyl</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-4" style={{ letterSpacing: '-0.5px' }}>
                <button 
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  ⚡ Deals
                </button>
                <button 
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  📦 Products
                </button>
                <button 
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  Start Your Order →
                </button>
                <button 
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  Log in
                </button>
                <button 
                  className="primaryButton px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Signup
                </button>
                <button 
                  className="headerButton px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  🛒
                </button>
              </nav>

              {/* Mobile/Tablet Cart Icon */}
              <button className="lg:hidden headerButton px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105">
                🛒
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50" />
          </div>
        )}

        {/* Mobile Menu Slide-out */}
        <div 
          className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ 
            backgroundColor: 'rgba(3, 1, 64, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="p-6">
            {/* Menu Header */}
            <div className="flex items-center justify-between mb-8">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                alt="Sticker Shuttle Logo" 
                className="h-8 w-auto object-contain"
              />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white text-xl p-2"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Search Bar for Mobile */}
            <div className="mb-6">
              <input 
                type="text"
                placeholder="Search sticker types..."
                className="w-full px-4 py-3 rounded-lg font-medium text-white transition-all duration-200 focus:outline-none placeholder-gray-400"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
            </div>

            {/* Sticker Types Quick Access - At Top */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white mb-4 px-4">Sticker Types:</h3>
              <div className="space-y-2">
                <div className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                      alt="Vinyl" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(168, 242, 106, 0.4))'
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Stickers</p>
                    <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(168, 242, 106)' }}>Most Popular</p>
                  </div>
                </div>
                
                <div className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                      alt="Holographic" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))'
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Holographic</p>
                    <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(168, 85, 247)' }}>Premium</p>
                  </div>
                </div>
                
                <div className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                      alt="Chrome" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.4))'
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Chrome</p>
                    <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(220, 220, 220)' }}>Mirror Finish</p>
                  </div>
                </div>
                
                <div className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                      alt="Glitter" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))'
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Glitter</p>
                    <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(59, 130, 246)' }}>Sparkly</p>
                  </div>
                </div>
                
                <div className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                      alt="Vinyl Banners" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(196, 181, 253, 0.4))'
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Banners</p>
                    <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(196, 181, 253)' }}>Heavy Duty</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">⚡</span>
                Deals
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">📦</span>
                Products
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">🎨</span>
                Start Your Order
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">👤</span>
                Log in
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">✨</span>
                Signup
              </button>
            </nav>
          </div>
        </div>

        {/* Hero Section with Banner Background */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div 
              className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl p-12 relative overflow-hidden"
              style={{
                backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593651/StickerShuttle_Banner_Main_1_bntyjg.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="text-center relative z-10">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-none sm:leading-tight">
                  <span className="block sm:inline">Tired of waiting weeks</span>
                  <span className="block sm:inline md:block"> to get your stickers?</span>
                </h1>
                <p className="text-lg sm:text-xl mb-6 text-purple-100">
                  <span className="block sm:inline md:block">See why brands like Amazon, Nike Football, and thousands of others</span>
                  <span className="block sm:inline md:inline"> trust us with their business.</span>
                </p>
                <div className="flex flex-col items-center gap-4 mb-4">
                  <button 
                    className="px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105"
                    style={{
                      backgroundColor: '#ffd713',
                      color: '#030140',
                      boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                      borderRadius: '10px',
                      border: 'solid',
                      borderWidth: '0.03125rem',
                      borderColor: '#8d9912'
                    }}
                  >
                    Start Here →
                  </button>
                  <a 
                    href="#" 
                    className="text-white hover:text-purple-200 transition"
                  >
                    Order Sample Pack →
          </a>
        </div>
                <div className="text-center text-sm text-purple-200 px-4">
                  <span className="block sm:inline">EASY ONLINE ORDERING, PRINTED IN 24 HRS, FREE SHIPPING</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brands Section - Infinite Scroll */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div className="flex justify-center mb-6">
              <div 
                className="px-6 py-2 rounded-full text-center text-lg text-gray-300"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                Brands we print for:
              </div>
            </div>
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-6 animate-scroll"
                style={{
                  animation: 'scroll 35s linear infinite',
                  width: 'max-content'
                }}
              >
                {/* First set of brands */}
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
                
                {/* Duplicate set for seamless loop */}
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
              </div>
              
              {/* Fade effects */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none"></div>
            </div>
          </div>
        </section>

        {/* Product Types Section - With Click to Show Features */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4 relative">
            
            {/* Desktop/Tablet Grid */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 group/container">
              {/* Vinyl Stickers */}
              <div 
                className="vinyl-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-500 ease-out">
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
                
                {/* Hover to show features on desktop */}
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="text-gray-300 text-sm space-y-2 text-left">
                      <li>💧 Waterproof & UV Resistant</li>
                      <li>🛡️ Laminated with 7 yr protection</li>
                      <li>🎯 Premium Vinyl Material</li>
                      <li>🏠 Dishwasher Safe</li>
                      <li>✂️ Custom Shapes Available</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Holographic Stickers */}
              <div 
                className="holographic-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-500 ease-out">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic Stickers" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.35)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.21))'
                    }}
                  />
                </div>
                <h3 className="font-semibold text-white group-hover/card:text-purple-400 transition-colors duration-300 ease-out mb-2">Holographic Stickers →</h3>
                
                {/* Hover to show features on desktop */}
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="text-gray-300 text-sm space-y-2 text-left">
                      <li>🌈 Rainbow Holographic Effect</li>
                      <li>🛡️ Laminated with 7 yr protection</li>
                      <li>✨ Holographic Vinyl Material</li>
                      <li>💎 Light-Reflecting Surface</li>
                      <li>👁️ Eye-Catching Design</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Chrome Stickers */}
              <div 
                className="chrome-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center group-hover/card:scale-110 group-hover/card:rotate-2 transition-transform duration-500 ease-out">
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
                
                {/* Hover to show features on desktop */}
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="text-gray-300 text-sm space-y-2 text-left">
                      <li>🪞 Mirror Chrome Finish</li>
                      <li>🛡️ Laminated with 7 yr protection</li>
                      <li>🔩 Metallic Polyester Film</li>
                      <li>✨ High-Gloss Surface</li>
                      <li>🚗 Automotive Grade</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Glitter Stickers */}
              <div 
                className="glitter-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
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
                
                {/* Hover to show features on desktop */}
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="text-gray-300 text-sm space-y-2 text-left">
                      <li>✨ Sparkly Glitter Finish</li>
                      <li>🛡️ Laminated with 7 yr protection</li>
                      <li>💫 Specialty Glitter Vinyl</li>
                      <li>🎨 Textured Surface</li>
                      <li>🌈 Multiple Colors Available</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Vinyl Banners */}
              <div 
                className="banner-hover text-center group/card cursor-pointer rounded-xl p-6 transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg transform overflow-hidden group-hover/container:blur-[2px] hover:!blur-none"
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
                
                {/* Hover to show features on desktop */}
                <div className="max-h-0 group-hover/container:max-h-64 overflow-hidden transition-all duration-600 ease-out mt-4">
                  <div className="pt-4 opacity-0 group-hover/container:opacity-100 transition-opacity duration-400 delay-200 ease-out" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="text-gray-300 text-sm space-y-2 text-left">
                      <li>💪 Heavy Duty 13oz Vinyl</li>
                      <li>🛡️ Laminated with 7 yr protection</li>
                      <li>🔗 Hemmed & Grommeted</li>
                      <li>🌦️ UV & Weather Resistant</li>
                      <li>📏 Custom Sizes Available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Scrollable Cards */}
            <div className="md:hidden overflow-x-auto pb-4">
              <div className="flex space-x-4 w-max">
                {/* Vinyl Stickers Mobile */}
                <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                      alt="Vinyl Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white">Vinyl Stickers →</h3>
                </div>

                {/* Holographic Stickers Mobile */}
                <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                      alt="Holographic Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.3))'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white">Holographic Stickers →</h3>
                </div>

                {/* Chrome Stickers Mobile */}
                <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                      alt="Chrome Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white">Chrome Stickers →</h3>
                </div>

                {/* Glitter Stickers Mobile */}
                <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                      alt="Glitter Stickers" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.3))'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white">Glitter Stickers →</h3>
                </div>

                {/* Vinyl Banners Mobile */}
                <div className="flex-shrink-0 w-48 text-center rounded-xl p-6" style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                      alt="Vinyl Banners" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 12px rgba(196, 181, 253, 0.5)) drop-shadow(0 0 24px rgba(196, 181, 253, 0.3))'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-white">Vinyl Banners →</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USA Banner */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div 
              className="py-6 rounded-xl relative overflow-hidden flex items-center justify-center"
              style={{
                backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749596480/860Oi6KbTFeIC4n1x6FsPA_agnu8p.jpg)',
                backgroundSize: '150%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#1a1a2e'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-black/30 rounded-xl"></div>
              <div className="relative z-10 text-center">
                <p className="text-white font-bold text-lg drop-shadow-lg">
                  All stickers printed and vinyl materials used are made in the USA <span style={{filter: 'drop-shadow(0 0 8px rgba(255, 215, 19, 0.6)) drop-shadow(0 0 16px rgba(255, 215, 19, 0.4))', display: 'inline-block'}}>🇺🇸</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Free Shipping */}
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
                      filter: 'drop-shadow(0 0 10px rgba(255, 215, 19, 0.35)) drop-shadow(0 0 20px rgba(255, 215, 19, 0.21))'
                    }}
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
                className="rounded-xl p-6"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="text-4xl mr-4 spin-slow"
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5)) drop-shadow(0 0 20px rgba(34, 197, 94, 0.3))'
                    }}
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
                      filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))'
                    }}
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
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div className="flex flex-col space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:items-stretch">
              {/* Video */}
              <div className="relative rounded-xl overflow-hidden cursor-pointer" onClick={toggleVideo}>
                {/* Poster image - always present but hidden when video plays */}
                {posterImage && (
                  <img 
                    src={posterImage}
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover rounded-xl z-10"
                    style={{ 
                      display: hasStarted ? 'none' : 'block'
                    }}
                  />
                )}
                
                <video 
                  ref={videoRef}
                  className="w-full rounded-xl relative z-20"
                  style={{ 
                    height: '100%',
                    minHeight: '400px',
                    objectFit: 'cover',
                    display: hasStarted ? 'block' : 'none'
                  }}
                  onEnded={handleVideoEnded}
                  muted
                  playsInline
                  preload="metadata"
                >
                  <source src="https://stickershuttle.com/cdn/shop/videos/c/vp/8f87f3238509493faba9ce1552b073de/8f87f3238509493faba9ce1552b073de.HD-1080p-7.2Mbps-38779776.mp4?v=0" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Custom Play Button Overlay - Only show when video hasn't started */}
                {!hasStarted && (
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-xl z-30">
                    <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 transform hover:scale-105">
                      <div className="w-0 h-0 border-l-[16px] border-l-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                )}
                
                {/* Pause Overlay - Show play button when paused (but video has started) */}
                {hasStarted && !isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="w-16 h-16 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 transform hover:scale-105">
                      <div className="w-0 h-0 border-l-[12px] border-l-black border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Container - Hidden on tablet/mobile */}
              <div 
                className="hidden lg:flex rounded-xl p-8 flex-col justify-center"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
                  minHeight: '400px'
                }}
              >
                <div className="flex items-center mb-6">
                  <div 
                    className="text-4xl mr-4"
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(255, 215, 19, 0.5)) drop-shadow(0 0 20px rgba(255, 215, 19, 0.3))'
                    }}
                  >
                    📦
                  </div>
                  <h2 className="text-3xl font-bold text-white">Free shipping, always.</h2>
                </div>
                
                <div className="space-y-4 mb-8">
                  <p className="text-gray-300 leading-relaxed">
                    At Sticker Shuttle, we get what it&apos;s like to run a small business because we&apos;re in the same shuttle... or boat. 
                    That&apos;s why we&apos;re so passionate about helping other small businesses. We print high-quality custom stickers 
                    and banners that not only launch your brand but also help you connect with your customers—all without 
                    breaking the bank.
                  </p>
                  
                  <p className="text-gray-300 leading-relaxed">
                    When you work with us, you&apos;re not just getting amazing products made with care and precision—you&apos;re 
                    supporting a local business that&apos;s all about community, creativity, and craftsmanship. Every sticker, banner, 
                    and product we make is designed to help your business stand out and grow. By choosing us, you&apos;re part of a 
                    bigger cycle of support that helps small businesses like yours thrive. Let&apos;s stick together and grow together!
                  </p>
                </div>

                <button 
                  className="px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
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
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-2">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-6 -mt-4 md:mt-0">
              <div className="flex justify-center mb-4">
                <div 
                  className="px-6 py-2 rounded-full text-center text-3xl font-bold text-white"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <span style={{filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.6)) drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))', display: 'inline-block'}}>👽</span> Not a conspiracy theory...
                </div>
              </div>
              <p className="text-gray-300 text-lg">
                                    And we&apos;re not aliens, that&apos;s why thousands of other businesses DO believe in us...
              </p>
            </div>

            {/* Desktop Reviews Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Review 1 - Certified Garbage Rat */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                </p>
              </div>

              {/* Review 2 - Panda Reaper */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                </p>
              </div>

              {/* Review 3 - Anita J */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                </p>
              </div>

              {/* Review 4 - Rach Plants */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                </p>
              </div>
            </div>

            {/* Mobile Swipeable Reviews */}
            <div className="md:hidden overflow-x-auto pb-4 relative">
              {/* Fade effects */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none z-10"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none z-10"></div>
              
              <div className="flex space-x-4 w-max" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Review 1 - Certified Garbage Rat Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                  
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Review 2 - Panda Reaper Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                  
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>

                {/* Review 3 - Anita J Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                  
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                  </p>
                </div>

                {/* Review 4 - Rach Plants Mobile */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
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
                  
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      ⚡ Deals
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Start Your Order →
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Log in
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                      Signup
                    </a>
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
          
          /* Sticker type hover glow effects */
          .vinyl-hover:hover {
            border-color: rgba(168, 242, 106, 0.8) !important;
            box-shadow: 0 0 20px rgba(168, 242, 106, 0.4), 0 0 40px rgba(168, 242, 106, 0.2) !important;
          }
          
          .vinyl-hover:hover h3 {
            color: rgb(168, 242, 106) !important;
          }
          
          .holographic-hover:hover {
            border-color: rgba(168, 85, 247, 0.8) !important;
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2) !important;
          }
          
          .holographic-hover:hover h3 {
            color: rgb(168, 85, 247) !important;
          }
          
          .chrome-hover:hover {
            border-color: rgba(220, 220, 220, 0.8) !important;
            box-shadow: 0 0 20px rgba(220, 220, 220, 0.4), 0 0 40px rgba(180, 180, 180, 0.2) !important;
          }
          
          .chrome-hover:hover h3 {
            background: linear-gradient(45deg, #dcdcdc, #ffffff, #c0c0c0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .glitter-hover:hover {
            border-color: rgba(59, 130, 246, 0.8) !important;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2) !important;
          }
          
          .glitter-hover:hover h3 {
            color: rgb(59, 130, 246) !important;
          }
          
          .banner-hover:hover {
            border-color: rgba(196, 181, 253, 0.8) !important;
            box-shadow: 0 0 20px rgba(196, 181, 253, 0.4), 0 0 40px rgba(196, 181, 253, 0.2) !important;
          }
          
          .banner-hover:hover h3 {
            color: rgb(196, 181, 253) !important;
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
          
          .footer-logo-hover {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          
          .footer-logo-hover:hover {
            transform: scale(1.15) rotate(-3deg);
            filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.8)) 
                    drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))
                    drop-shadow(0 0 45px rgba(220, 220, 220, 0.4));
            animation: footer-logo-wiggle 0.8s ease-in-out;
          }
          
          @keyframes logo-bounce {
            0% { transform: scale(1.1) rotate(5deg) translateY(0px); }
            25% { transform: scale(1.12) rotate(6deg) translateY(-3px); }
            50% { transform: scale(1.15) rotate(4deg) translateY(-5px); }
            75% { transform: scale(1.12) rotate(7deg) translateY(-2px); }
            100% { transform: scale(1.1) rotate(5deg) translateY(0px); }
          }
          
          @keyframes footer-logo-wiggle {
            0% { transform: scale(1.15) rotate(-3deg); }
            15% { transform: scale(1.18) rotate(-5deg); }
            30% { transform: scale(1.16) rotate(-1deg); }
            45% { transform: scale(1.19) rotate(-6deg); }
            60% { transform: scale(1.17) rotate(-2deg); }
            75% { transform: scale(1.18) rotate(-4deg); }
            100% { transform: scale(1.15) rotate(-3deg); }
          }
          

        `}</style>


    </div>
    </>
  );
}
