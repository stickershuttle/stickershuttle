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

  // Determine visibility for authentication UI elements
  const showAccountDashboard = user && !authError && !loading;
  const showLoginSignupButtons = !showAccountDashboard;

  return (
    <>
    <header className="w-full fixed top-0 z-50" style={{ backgroundColor: '#030140' }}>
      <div className={isAdminPage ? "w-full py-4 px-8" : "w-[95%] md:w-[90%] lg:w-[70%] mx-auto py-4 px-4"}>
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
            <form onSubmit={handleOrderSearch} className={`hidden lg:flex flex-1 items-center relative search-dropdown-container ml-8`}>
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
            </div>
          )}
            
            {/* Search Dropdown - Only show on non-admin pages */}
            {!isAdminPage && isSearchDropdownOpen && (
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

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4" style={{ letterSpacing: '-0.5px' }}>
            {!isAdminPage && (
              <Link 
                href="/deals"
                className={`headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105${router.pathname === '/deals' || router.asPath === '/deals' ? ' active' : ''}`}
                style={router.pathname === '/deals' || router.asPath === '/deals' ? {
                  border: '0.5px solid #a855f7',
                  background: 'rgba(168, 85, 247, 0.2)',
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.48), 0 0 24px rgba(168, 85, 247, 0.32)',
                  color: '#c084fc'
                } : {}}
              >
                ⚡ Deals
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
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          <span>Dashboard</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=all-orders"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>My Orders</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=proofs"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Proofs</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=design-vault"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Design Vault</span>
                        </Link>

                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            // Add support functionality here
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white w-full text-left"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Get Support</span>
                        </button>

                        {isAdmin && (
                          <Link 
                            href="/admin/orders"
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-500/20 transition-colors duration-200 text-amber-300"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Admin Panel</span>
                          </Link>
                        )}

                        <hr className="border-white/10 my-2" />

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
                  className="headerButton px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 inline-block"
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

          {/* Sticker Types Quick Access */}
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
            {!isAdminPage && (
              <Link 
                href="/deals" 
                className={`w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center${router.pathname === '/deals' || router.asPath === '/deals' ? ' bg-purple-500 bg-opacity-20 border-l-4 border-purple-400' : ''}`} 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-3">⚡</span>
                Deals
              </Link>
            )}
            
            {/* Mobile Authentication Navigation - Show login/signup by default unless user verified */}
            {showAccountDashboard ? (
              /* Logged In and Verified - Show Account Dashboard and Sign Out */
              <>
                <Link 
                  href="/account/dashboard" 
                  className={`w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center${router.pathname === '/account/dashboard' || router.asPath === '/account/dashboard' || router.pathname.startsWith('/account') ? ' bg-purple-500 bg-opacity-20 border-l-4 border-purple-400' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">👨‍🚀</span>
                  Account Dashboard
                </Link>
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
        background: rgba(168, 85, 247, 0.2) !important;
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.48), 0 0 24px rgba(168, 85, 247, 0.32) !important;
        color: #c084fc !important;
      }
      
      .headerButton.active:hover {
        background: rgba(168, 85, 247, 0.3) !important;
        border-color: #c084fc !important;
        box-shadow: 0 0 16px rgba(168, 85, 247, 0.64), 0 0 32px rgba(168, 85, 247, 0.4) !important;
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