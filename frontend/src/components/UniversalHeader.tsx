'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase';
import CartIndicator from './CartIndicator';

export default function UniversalHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const router = useRouter();

  // Admin emails list - same as in admin dashboard
  const ADMIN_EMAILS = ['justin@stickershuttle.com'];
  
  // Check if we're on an admin page
  const isAdminPage = router.pathname.startsWith('/admin');
  
  // Handle order search
  const handleOrderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderSearch.trim()) {
      router.push(`/admin/orders?search=${encodeURIComponent(orderSearch.trim())}`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Only check user on client-side
    if (typeof window !== 'undefined') {
      const loadUser = async () => {
        try {
          const supabase = await getSupabase();
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking user session:', error);
            if (isMounted) {
              setUser(null);
              setAuthError(true);
            }
          } else {
            if (isMounted) {
              setUser(session?.user || null);
              // Check if user is admin
              if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
                setIsAdmin(true);
              }
              
              // Fetch profile data if user exists
              if (session?.user) {
                try {
                  const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();
                  
                  if (profileData) {
                    setProfile(profileData);
                  }
                } catch (profileError) {
                  console.error('Error fetching profile:', profileError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking user:', error);
          if (isMounted) {
            setUser(null);
            setAuthError(true);
          }
        } finally {
          // Only update state if component is still mounted
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      
      loadUser();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setShowProfileDropdown(false);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Astronaut';
  };

  const handleLinkClick = (href: string) => {
    setIsSearchDropdownOpen(false);
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  // Debug: Log current route
  useEffect(() => {
    console.log('Current router.pathname:', router.pathname);
    console.log('Current router.asPath:', router.asPath);
  }, [router.pathname, router.asPath]);

  // Add body class for admin/non-admin pages
  useEffect(() => {
    if (isAdminPage) {
      document.body.classList.add('admin-page');
    } else {
      document.body.classList.remove('admin-page');
    }
    
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, [isAdminPage]);

  // Determine visibility for authentication UI elements
  const showAccountDashboard = user && !authError && !loading;
  const showLoginSignupButtons = !showAccountDashboard;

  return (
    <>
    <header className={`w-full fixed top-0 z-50 ${!isAdminPage ? 'pb-[5px]' : ''}`} style={{ backgroundColor: '#030140' }}>
              <div className={isAdminPage ? "w-full py-4 px-8" : "w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto py-4 px-4"}>
        <div className="flex items-center justify-between relative" style={{ paddingTop: '2px' }}>
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

          {/* Desktop Left Side - Logo */}
          <div className="hidden lg:flex items-center">
            <div className={isAdminPage ? "" : "lg:mr-6"}>
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
                className="h-12 w-auto object-contain cursor-pointer"
                style={{ maxWidth: 'none' }}
              />
            </Link>
          </div>

          {/* Mobile/Tablet Right Side - Cart */}
          <div className="lg:hidden flex items-center">
            {!isAdminPage && <CartIndicator />}
          </div>

          {/* Desktop Search Bar */}
          {isAdminPage ? (
            <form onSubmit={handleOrderSearch} className={`hidden lg:flex flex-1 items-center relative search-dropdown-container ml-8 mr-4`}>
              <input 
                type="text"
                placeholder="Search by order #, email, or name..."
                className="headerButton flex-1 px-4 py-2 pr-12 rounded-lg font-medium text-white transition-all duration-200 transform focus:scale-101 focus:outline-none placeholder-gray-400"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white transition-all duration-200 hover:scale-110"
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
            </form>
          ) : (
            <div className={`hidden lg:flex flex-1 items-center relative search-dropdown-container mx-4`}>
              <input 
                type="text"
                placeholder="Go on.. create your universe 🧑‍🚀"
                className="headerButton flex-1 px-4 py-2 pr-12 rounded-lg font-medium text-white transition-all duration-200 transform focus:scale-101 focus:outline-none placeholder-gray-400"
                onFocus={() => setIsSearchDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 300)}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white transition-all duration-200 hover:scale-110"
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
              
              {/* Search Dropdown - Only show on non-admin pages */}
              {!isAdminPage && isSearchDropdownOpen && (
                <div 
                  className="absolute top-full mt-2 rounded-lg z-50 shadow-lg w-full"
                  style={{ 
                    backgroundColor: 'rgba(26, 20, 74, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(12px)'
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
          )}

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4" style={{ letterSpacing: '-0.5px' }}>
            {!isAdminPage && (
              <Link 
                href="/deals"
                className={`px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2${router.pathname === '/deals' || router.asPath === '/deals' ? ' active' : ''}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fbbf24' }}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                Deals
              </Link>
            )}
            
            {/* Authentication Navigation - Show login/signup by default unless user verified */}
            {showAccountDashboard ? (
              // Logged In and Verified - Show Profile Dropdown
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 font-medium text-white transition-all duration-200 transform hover:scale-105"
                  style={{ background: 'transparent', border: 'none' }}
                  onBlur={() => setTimeout(() => setShowProfileDropdown(false), 200)}
                >
                  {/* Profile Picture */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 transition-all duration-200 hover:border-white/40 hover:brightness-75">
                    {profile?.profile_photo_url ? (
                      <img 
                        src={profile.profile_photo_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-base font-bold">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-64 rounded-xl shadow-2xl z-50"
                    style={{
                      backgroundColor: 'rgba(3, 1, 64, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div className="p-4">
                      {/* Profile Header */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          {profile?.profile_photo_url ? (
                            <img 
                              src={profile.profile_photo_url} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                              {getUserDisplayName().charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{getUserDisplayName()}</h3>
                          <p className="text-gray-300 text-sm">{user?.email}</p>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="space-y-2">
                        <Link 
                          href="/account/dashboard"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8b5cf6' }}>
                            <rect x="3" y="3" width="8" height="5" rx="2"/>
                            <rect x="13" y="3" width="8" height="11" rx="2"/>
                            <rect x="3" y="10" width="8" height="11" rx="2"/>
                            <rect x="13" y="16" width="8" height="5" rx="2"/>
                          </svg>
                          <span>Dashboard</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=all-orders"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#10b981' }}>
                            <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                          </svg>
                          <span>Orders</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=finances"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
                            <rect x="3" y="12" width="4" height="9" rx="2"/>
                            <rect x="10" y="6" width="4" height="15" rx="2"/>
                            <rect x="17" y="9" width="4" height="12" rx="2"/>
                          </svg>
                          <span>Finances</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=design-vault"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ec4899' }}>
                            <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                          </svg>
                          <span>Designs</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=proofs"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#f97316' }}>
                            <path d="M12 4.5C7.5 4.5 3.73 7.61 2.46 12c1.27 4.39 5.04 7.5 9.54 7.5s8.27-3.11 9.54-7.5c-1.27-4.39-5.04-7.5-9.54-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          <span>Proofs</span>
                        </Link>

                        <Link 
                          href="/account/support"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white w-full text-left"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
                          </svg>
                          <span>Get Support</span>
                        </Link>

                        <Link 
                          href="/account/settings"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                          </svg>
                          <span>Settings</span>
                        </Link>

                        <hr className="border-white/10 my-2" />

                        {isAdmin && (
                          <Link 
                            href="/admin/orders"
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-500/20 transition-colors duration-200 text-purple-300"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Admin Panel</span>
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/20 transition-colors duration-200 text-red-300 w-full text-left"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Default state - Show Login and Signup
              <>
                <Link 
                  href="/login"
                  className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 inline-block"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  Log in
                </Link>
                <Link 
                  href="/signup"
                  className="primaryButton px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 inline-block"
                >
                  Signup
                </Link>
              </>
            )}
            
            {/* Cart Icon */}
            {!isAdminPage && <CartIndicator />}
          </nav>
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
          <div className="flex items-center justify-between mb-6">
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

          {/* Profile Section for Logged In Users */}
          {user && (
            <div className="mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20">
                  {profile?.profile_photo_url ? (
                    <img 
                      src={profile.profile_photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{getUserDisplayName()}</h3>
                  <p className="text-gray-300 text-sm">{user?.email}</p>
                </div>
              </div>
              
              {/* Quick Menu Items */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Link 
                  href="/account/dashboard"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="8" height="5" rx="2"/>
                    <rect x="13" y="3" width="8" height="11" rx="2"/>
                    <rect x="3" y="10" width="8" height="11" rx="2"/>
                    <rect x="13" y="16" width="8" height="5" rx="2"/>
                  </svg>
                  <span className="text-xs text-gray-300">Dashboard</span>
                </Link>
                
                <Link 
                  href="/account/dashboard?view=all-orders"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                  </svg>
                  <span className="text-xs text-gray-300">Orders</span>
                </Link>
                
                <Link 
                  href="/account/dashboard?view=proofs"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7.5 4.5 3.73 7.61 2.46 12c1.27 4.39 5.04 7.5 9.54 7.5s8.27-3.11 9.54-7.5c-1.27-4.39-5.04-7.5-9.54-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  <span className="text-xs text-gray-300">Proofs</span>
                </Link>
                
                <Link 
                  href="/account/dashboard?view=design-vault"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                  </svg>
                  <span className="text-xs text-gray-300">Designs</span>
                </Link>
              </div>
            </div>
          )}

          {/* Sticker Types Quick Access - 2 Column Grid */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Access:</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/products/vinyl-stickers" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(168, 242, 106, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Vinyl</p>
                <p className="text-white text-xs text-center mt-0.5">Stickers</p>
              </Link>
              
              <Link 
                href="/products/holographic-stickers" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Holographic</p>
                <p className="text-white text-xs text-center mt-0.5">Stickers</p>
              </Link>
              
              <Link 
                href="/products/chrome-stickers" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(220, 220, 220, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Chrome</p>
                <p className="text-white text-xs text-center mt-0.5">Stickers</p>
              </Link>
              
              <Link 
                href="/products/glitter-stickers" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Glitter</p>
                <p className="text-white text-xs text-center mt-0.5">Stickers</p>
              </Link>
              
              <Link 
                href="/products/vinyl-banners" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593724/Vinyl-Banner_c84nis.png" 
                    alt="Vinyl Banners" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Vinyl</p>
                <p className="text-white text-xs text-center mt-0.5">Banners</p>
              </Link>
              
              <Link 
                href="/products/sticker-sheets" 
                className="flex flex-col items-center p-4 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sticker Sheets" 
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.5))'
                    }}
                  />
                </div>
                <p className="text-white text-xs font-medium text-center">Sticker</p>
                <p className="text-white text-xs text-center mt-0.5">Sheets</p>
              </Link>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {!isAdminPage && (
              <Link 
                href="/deals" 
                className={`w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center${router.pathname === '/deals' || router.asPath === '/deals' ? ' bg-purple-500 bg-opacity-20 border-l-4 border-purple-400' : ''}`} 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fbbf24' }}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                Deals
              </Link>
            )}
            
            {/* Mobile Authentication Navigation - Show login/signup by default unless user verified */}
            {showAccountDashboard ? (
              /* Logged In and Verified - Show Sign Out only */
              <>
                {isAdmin && (
                  <Link 
                    href="/admin/orders" 
                    className={`w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center${router.pathname === '/admin/orders' || router.asPath === '/admin/orders' || router.pathname.startsWith('/admin') ? ' bg-amber-500 bg-opacity-20 border-l-4 border-amber-400' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">🛠️</span>
                    Admin Dashboard
                  </Link>
                )}
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
              /* Default state - Show Login and Signup */
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
                  onClick={() => setIsMobileMenuOpen(false)}
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

    {/* Logo Animation Styles - Desktop Only */}
    <style jsx>{`
      .logo-hover {
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      @media (min-width: 1024px) {
        .logo-hover:hover {
          transform: scale(1.1) rotate(5deg);
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)) 
                  drop-shadow(0 0 40px rgba(168, 242, 106, 0.4))
                  drop-shadow(0 0 60px rgba(168, 85, 247, 0.3));
          animation: logo-bounce 0.6s ease-in-out;
        }
      }
      
      @keyframes logo-bounce {
        0% { transform: scale(1.1) rotate(5deg) translateY(0px); }
        25% { transform: scale(1.12) rotate(6deg) translateY(-3px); }
        50% { transform: scale(1.15) rotate(4deg) translateY(-5px); }
        75% { transform: scale(1.12) rotate(7deg) translateY(-2px); }
        100% { transform: scale(1.1) rotate(5deg) translateY(0px); }
      }

      /* Header Button Styles */
      .headerButton {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(12px) !important;
      }

      .headerButton:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
      }
      
      /* Active page button styling */
      .headerButton.active {
        border: 1px solid rgba(168, 85, 247, 0.5) !important;
        background: rgba(168, 85, 247, 0.2) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2) !important;
        color: #c084fc !important;
      }
      
      .headerButton.active:hover {
        background: rgba(168, 85, 247, 0.3) !important;
        border-color: rgba(168, 85, 247, 0.6) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(168, 85, 247, 0.5), 0 0 30px rgba(168, 85, 247, 0.3) !important;
        color: #e0c3fc !important;
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
    `}</style>
    </>
  );
} 