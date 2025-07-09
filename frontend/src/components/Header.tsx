'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dotCount, setDotCount] = useState<number>(1);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  // Update theme color and body class when mobile menu opens/closes
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      if (isMobileMenuOpen) {
        themeColorMeta.setAttribute('content', '#030140');
        document.body.classList.add('mobile-menu-open');
      } else {
        themeColorMeta.setAttribute('content', '#030140');
        document.body.classList.remove('mobile-menu-open');
      }
    }
  }, [isMobileMenuOpen]);

  // Animate the dots for "blast off" message on products page
  useEffect(() => {
    if (router.pathname === '/products') {
      const interval = setInterval(() => {
        setDotCount(prev => prev >= 3 ? 1 : prev + 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [router.pathname]);

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

  const handleLinkClick = (href: string) => {
    setIsSearchDropdownOpen(false);
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  return (
    <>
    <header className="w-full relative z-50" style={{ backgroundColor: '#030140' }}>
      <div className="w-[95%] md:w-[90%] xl:w-[70%] mx-auto py-4 px-4">
        <div className="flex items-center justify-between relative">
          {/* Mobile/Tablet Left Side - Hamburger */}
          <div className="lg:hidden flex items-center">
            <button 
              className="text-white text-2xl z-50 relative" 
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="flex flex-col space-y-1">
                <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
              </div>
            </button>
          </div>

          {/* Desktop Left Side - Hamburger + Logo */}
          <div className="hidden lg:flex items-center">
            {/* Desktop Logo (in normal flow) */}
            <div className="lg:mr-6">
              <Link href="/">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                  alt="Sticker Shuttle Logo" 
                  className="h-12 w-auto object-contain logo-hover cursor-pointer"
                  style={{ maxWidth: 'none' }}
                />
              </Link>
            </div>
          </div>

          {/* Mobile Logo - Centered */}
          <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2 z-40">
            <Link href="/">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                alt="Sticker Shuttle Logo" 
                className="h-12 w-auto object-contain logo-hover cursor-pointer"
                style={{ maxWidth: 'none' }}
              />
            </Link>
          </div>

          {/* Mobile/Tablet Right Side - Cart */}
          <div className="lg:hidden flex items-center">
            <button 
              className="headerButton px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
              aria-label="Shopping cart"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-5 h-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" 
                />
              </svg>
            </button>
          </div>

          {/* Desktop Product Selector */}
          <div className="hidden lg:flex flex-1 items-center relative search-dropdown-container" style={{ marginRight: '20px' }}>
            <button 
              className="headerButton flex-1 px-4 py-2 pr-12 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 text-left"
              onClick={() => setIsSearchDropdownOpen(!isSearchDropdownOpen)}
              onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 300)}
            >
              Select sticker type...
            </button>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor" 
                className={`w-5 h-5 transition-transform duration-200 ${isSearchDropdownOpen ? 'rotate-180' : ''}`}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5" 
                />
              </svg>
            </div>
            
            {/* Search Dropdown */}
            {isSearchDropdownOpen && (
              <div 
                className="absolute top-full left-0 right-8 mt-2 rounded-lg z-50 shadow-lg"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  position: 'absolute',
                  width: 'calc(100% - 2rem)'
                }}
                onMouseLeave={() => setIsSearchDropdownOpen(false)}
              >
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-white mb-2 px-2">Sticker Types:</h3>
                  <div className="space-y-1">
                    {/* Vinyl Stickers */}
                    <Link 
                      href="/products/vinyl-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/vinyl-stickers');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                          alt="Vinyl" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(168, 242, 106, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Stickers</p>
                        <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(168, 242, 106)' }}>Waterproof & UV Resistant</p>
                      </div>
                    </Link>
                    
                    {/* Holographic Stickers */}
                    <Link 
                      href="/products/holographic-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/holographic-stickers');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                          alt="Holographic" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
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
                    </Link>
                    
                    {/* Chrome Stickers */}
                    <Link 
                      href="/products/chrome-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/chrome-stickers');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                          alt="Chrome" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
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
                    </Link>
                    
                    {/* Glitter Stickers */}
                    <Link 
                      href="/products/glitter-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/glitter-stickers');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                          alt="Glitter" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Glitter Stickers</p>
                        <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(59, 130, 246)' }}>Sparkly Glitter Finish</p>
                      </div>
                    </Link>
                    
                    {/* Clear Stickers */}
                    <Link 
                      href="/products/clear-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/clear-stickers');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                          alt="Clear" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Clear Stickers</p>
                        <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(34, 197, 94)' }}>Transparent Finish</p>
                      </div>
                    </Link>
                    
                    {/* Sticker Sheets */}
                    <Link 
                      href="/products/sticker-sheets" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/sticker-sheets');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                          alt="Sticker Sheets" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(248, 113, 113, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Sticker Sheets</p>
                        <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(248, 113, 113)' }}>Multiple Stickers Per Sheet</p>
                      </div>
                    </Link>
                    
                    {/* Vinyl Banners */}
                    <Link 
                      href="/products/vinyl-banners" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 cursor-pointer transition-all duration-200 group block no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick('/products/vinyl-banners');
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="w-8 h-8 mr-3 flex items-center justify-center flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                          alt="Vinyl Banners" 
                          className="max-w-full max-h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(196, 181, 253, 0.4))'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Vinyl Banners</p>
                        <p className="text-xs transition-colors duration-200 group-hover:text-gray-700" style={{ color: 'rgb(196, 181, 253)' }}>Heavy Duty 13oz Vinyl</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            <nav className="flex items-center gap-4" style={{ letterSpacing: '-0.5px' }}>
            <Link 
              href="/deals"
              className={`headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105${router.pathname === '/deals' ? ' active' : ''}`}
            >
              ⚡ Deals
            </Link>
            <button 
              className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
            >
              🚀 Shipping Process
            </button>
            {router.pathname === '/products' ? (
              <span 
                className="headerButton active px-4 py-2 rounded-lg font-medium text-purple-400 transition-all duration-200 transform inline-block" 
                style={{ 
                  width: '220px',
                  height: '40px',
                  border: '0.5px solid #a855f7',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderColor: '#a855f7',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                🚀 Preparing for blast off{'.'.repeat(dotCount)}
              </span>
            ) : (
              <a 
                href="/products"
                className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 inline-block"
              >
                Start Your Order →
              </a>
            )}
            
            {/* Conditional Authentication Navigation */}
            {user ? (
              /* Logged In - Show Account Dashboard and Sign Out */
              <>
                <Link 
                  href="/account/dashboard"
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 inline-block"
                >
                  👨‍🚀 Account Dashboard
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
                >
                  Sign Out
                </button>
              </>
            ) : (
              /* Not Logged In - Show Login and Signup */
              <>
                <Link 
                  href="/login"
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 inline-block"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup"
                  className="primaryButton px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 inline-block"
                  onClick={(e) => {
                    console.log('Desktop signup clicked');
                  }}
                >
                  Signup
                </Link>
              </>
            )}
            
            <button 
              className="headerButton px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105"
              aria-label="Shopping cart"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-5 h-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" 
                />
              </svg>
            </button>
            </nav>
          </div>
        </div>
      </div>

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

          {/* Product Types Header for Mobile */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white px-4">Product Types</h3>
          </div>

          {/* Sticker Types Quick Access - At Top */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-4 px-4">Sticker Types:</h3>
            <div className="space-y-2">
              <Link href="/products/vinyl-stickers" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
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
              </Link>
              
              <Link href="/products/holographic-stickers" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
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
              </Link>
              
              <Link href="/products/chrome-stickers" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
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
              </Link>
              
              <Link href="/products/glitter-stickers" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
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
              </Link>
              
              <Link href="/products/clear-stickers" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 mr-3 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg" 
                    alt="Clear" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))'
                    }}
                  />
                </div>
                <div>
                  <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Clear</p>
                  <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(34, 197, 94)' }}>Transparent</p>
                </div>
              </Link>
              
              <Link href="/products/sticker-sheets" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 mr-3 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sticker Sheets" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(248, 113, 113, 0.4))'
                    }}
                  />
                </div>
                <div>
                  <p className="text-white group-hover:text-gray-800 text-sm font-medium transition-colors duration-200">Sticker Sheets</p>
                  <p className="text-xs transition-colors duration-200 group-hover:text-gray-600" style={{ color: 'rgb(248, 113, 113)' }}>Multiple Per Sheet</p>
                </div>
              </Link>
              
              <Link href="/products/vinyl-banners" className="flex items-center px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-90 cursor-pointer transition-all duration-200 group" onClick={() => setIsMobileMenuOpen(false)}>
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
              </Link>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            <Link href="/deals" className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
              <span className="mr-3">⚡</span>
              Deals
            </Link>
            <button className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
              <span className="mr-3">🚀</span>
              Shipping Process
            </button>
            {router.pathname === '/products' ? (
              <span 
                className="w-full text-left px-4 py-3 rounded-lg text-purple-400 transition-all duration-200 flex items-center" 
                style={{ 
                  width: '280px',
                  border: '0.5px solid #a855f7',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderColor: '#a855f7'
                }}
              >
                <span className="mr-3">🚀</span>
                <span style={{ width: '220px', whiteSpace: 'nowrap' }}>Preparing for blast off{'.'.repeat(dotCount)}</span>
              </span>
            ) : (
              <a href="/products" className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center">
                <span className="mr-3">🎨</span>
                Start Your Order
              </a>
            )}
            
            {/* Conditional Authentication Navigation for Mobile */}
            {user ? (
              /* Logged In - Show Account Dashboard and Sign Out */
              <>
                <Link 
                  href="/account/dashboard" 
                  className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">👨‍🚀</span>
                  Account Dashboard
                </Link>
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                >
                  <span className="mr-3">🚪</span>
                  Sign Out
                </button>
              </>
            ) : (
              /* Not Logged In - Show Login and Signup */
              <>
                <Link 
                  href="/login" 
                  className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">👤</span>
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                  onClick={(e) => {
                    console.log('Mobile signup clicked');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <span className="mr-3">✨</span>
                  Signup
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
    
    <style jsx>{`
      /* Logo animations - mobile-friendly */
      .logo-hover {
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        transform: scale(1);
      }
      
      /* Desktop hover animation */
      @media (hover: hover) and (pointer: fine) {
        .logo-hover:hover {
          transform: scale(1.1) rotate(5deg);
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)) 
                  drop-shadow(0 0 40px rgba(168, 242, 106, 0.4))
                  drop-shadow(0 0 60px rgba(168, 85, 247, 0.3));
          animation: logo-bounce 0.6s ease-in-out;
        }
      }
      
      /* Mobile tap animation */
      @media (hover: none) and (pointer: coarse) {
        .logo-hover:active {
          transform: scale(0.95);
          transition: transform 0.1s ease-in-out;
        }
      }
      
      @keyframes logo-bounce {
        0% { transform: scale(1.1) rotate(5deg) translateY(0px); }
        25% { transform: scale(1.12) rotate(6deg) translateY(-3px); }
        50% { transform: scale(1.15) rotate(4deg) translateY(-5px); }
        75% { transform: scale(1.12) rotate(7deg) translateY(-2px); }
        100% { transform: scale(1.1) rotate(5deg) translateY(0px); }
      }
      
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

      /* Prevent layout shifts */
      .no-underline {
        text-decoration: none !important;
      }
      
      .no-underline:hover {
        text-decoration: none !important;
      }
      
      /* Ensure dropdown doesn't cause horizontal scroll */
      .search-dropdown-container {
        position: relative;
        overflow: visible;
      }
      
      /* Prevent any shifts when links are clicked */
      a[href^="/products/"] {
        display: block;
        text-decoration: none;
        border: none;
        outline: none;
      }
      
      a[href^="/products/"]:focus,
      a[href^="/products/"]:active,
      a[href^="/products/"]:visited {
        text-decoration: none;
        border: none;
        outline: none;
      }
    `}</style>
    </>
  );
} 
