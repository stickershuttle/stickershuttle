'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@apollo/client';
import { GET_USER_CREDIT_BALANCE } from '@/lib/credit-mutations';
import CartIndicator from './CartIndicator';


export default function UniversalHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Start as false to prevent flash
  const [authError, setAuthError] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditBalanceLoaded, setCreditBalanceLoaded] = useState<boolean>(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState<boolean>(false); // Track initial auth check
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

  // GraphQL query for credit balance - replaces the direct database query
  const { data: creditData, refetch: refetchCreditBalance } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onCompleted: (data) => {
      if (data?.getUserCreditBalance) {
        setCreditBalance(data.getUserCreditBalance.balance || 0);
        setCreditBalanceLoaded(true);
      }
    },
    onError: (error) => {
      console.warn('Credit balance fetch failed (non-critical):', error);
      setCreditBalance(0);
      setCreditBalanceLoaded(true);
    }
  });



  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;
    
    // Listen for profile updates from other components
    const handleProfileUpdate = (event: CustomEvent) => {
      if (isMounted && event.detail) {
        // Handle both full profile updates and partial photo updates
        if (event.detail.profile) {
          setProfile(event.detail.profile);
        } else if (event.detail.profile_photo_url !== undefined) {
          // Handle profile photo updates from dashboard
          setProfile((prevProfile: any) => ({
            ...prevProfile,
            profile_photo_url: event.detail.profile_photo_url,
            profile_photo_public_id: event.detail.profile_photo_public_id
          }));
        }
      }
    };

    // Add event listener for profile updates
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    // Enhanced authentication state management with subscription
    const initializeAuth = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const supabase = getSupabase();
        
        // Set up auth state listener with minimal processing
        authSubscription = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          if (!isMounted) return;
          
          console.log('🔐 Auth state changed:', event, session?.user?.email);
          
          // Only handle critical auth events to prevent loops
          if (event === 'SIGNED_OUT') {
            handleSignOut();
            return;
          }
          
          // For sign in events, only update user state, don't fetch additional data
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            setUser(session.user);
            setAuthError(false);
            
            // Check admin status
            const userEmail = session.user.email;
            if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
            
            setLoading(false);
            setInitialAuthCheck(true);
            
            // Load cached profile photo from localStorage
            const cachedPhoto = localStorage.getItem('userProfilePhoto');
            if (cachedPhoto) {
              setProfile({ profile_photo_url: cachedPhoto });
            }
            
            return;
          }
        });

        // Get initial session with minimal processing
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          if (isMounted) {
            setAuthError(true);
            setLoading(false);
            setInitialAuthCheck(true);
          }
          return;
        }

        // Handle initial session with minimal processing
        if (session?.user && isMounted) {
          setUser(session.user);
          setAuthError(false);
          
          // Check admin status
          const userEmail = session.user.email;
          if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          
          // Load cached profile photo from localStorage
          const cachedPhoto = localStorage.getItem('userProfilePhoto');
          if (cachedPhoto) {
            setProfile({ profile_photo_url: cachedPhoto });
          }
        }
        
        if (isMounted) {
          setLoading(false);
          setInitialAuthCheck(true);
        }

      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setAuthError(true);
          setLoading(false);
          setInitialAuthCheck(true); // Mark initial auth check as complete even on error
        }
      }
    };

    // Note: Profile fetching moved to dashboard to prevent auth loops
    // The header now only handles basic auth state for UI display

    // Handle sign out state
    const handleSignOut = () => {
      if (!isMounted) return;
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setAuthError(false);
      setLoading(false);
      setShowProfileDropdown(false);
      setCreditBalance(0);
      setCreditBalanceLoaded(false);
      setInitialAuthCheck(true); // Keep auth check marked as complete to prevent flash
    };

    // Initialize authentication
    initializeAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
      // Remove profile update event listener
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  // Refetch credit balance when user changes
  useEffect(() => {
    if (user?.id && refetchCreditBalance) {
      refetchCreditBalance();
    }
  }, [user?.id, refetchCreditBalance]);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setShowProfileDropdown(false);
      setCreditBalance(0);
      setCreditBalanceLoaded(false);
      setInitialAuthCheck(true); // Keep auth check marked as complete
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

  // Route debugging removed for production

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

  // Determine visibility for authentication UI elements with better logic
  const showAccountDashboard = user && !authError && initialAuthCheck;
  const showLoginSignupButtons = !showAccountDashboard && initialAuthCheck;

  return (
    <>
    <header className={`w-full fixed top-0 z-50 ${!isAdminPage ? 'pb-[5px]' : ''}`} style={{ backgroundColor: '#030140' }}>
              <div className={isAdminPage ? "w-full py-4 px-8" : "w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto py-4 px-4"}>
        <div className="flex items-center justify-between relative" style={{ paddingTop: '2px' }}>
          {/* Mobile/Tablet Left Side - Avatar or Login Icons */}
          <div className="lg:hidden flex items-center">
            {showAccountDashboard ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-2 font-medium text-white transition-all duration-200 transform hover:scale-105"
                style={{ background: 'transparent', border: 'none' }}
              >
                {/* Profile Avatar */}
                <div className="w-10 h-10 aspect-square rounded-full overflow-hidden border border-white/20 transition-all duration-200 hover:border-white/40">
                  {profile?.profile_photo_url ? (
                    <img 
                      src={profile.profile_photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-base font-bold rounded-full">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Dropdown Arrow */}
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Signup Button */}
                <Link 
                  href="/signup"
                  className="primaryButton px-3 py-1.5 text-sm font-medium transition-all duration-200 transform hover:scale-105 rounded-lg"
                  aria-label="Signup"
                >
                  Signup
                </Link>
                
                {/* Avatar Icon */}
                <Link 
                  href="/login"
                  className="text-white transition-all duration-200 transform hover:scale-105"
                  aria-label="Login"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </div>
            )}
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
          <div className="lg:hidden flex items-center gap-3">
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
              <button 
                className="headerButton flex-1 px-4 py-2 pr-12 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-[1.005] text-left"
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline" 
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
                            background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000, #ff7f00)',
                            backgroundSize: '200% 200%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            animation: 'holographicShimmer 3s ease-in-out infinite'
                          }}
                        >
                          Rainbow Holographic Effect
                        </p>
                      </div>
                    </Link>
                    
                    {/* Chrome Stickers */}
                    <Link 
                      href="/products/chrome-stickers" 
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-[0.01] cursor-pointer transition-all duration-200 group block no-underline"
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
            
                        {/* Store Credit Balance - Always show container for logged in users */}
            {!isAdminPage && showAccountDashboard && (
              <Link 
                href="/account/dashboard?view=financial"
                className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  minHeight: '40px' // Ensure consistent height
                }}
              >
                <i className="fas fa-coins text-yellow-300"></i>
                {creditBalanceLoaded ? (
                  <span className="text-yellow-200 leading-5">${creditBalance.toFixed(2)}</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <div 
                      className="bg-yellow-300/30 rounded animate-pulse leading-5"
                      style={{ 
                        width: '12px', 
                        height: '20px' // Match text height exactly
                      }}
                    ></div>
                    <div 
                      className="bg-yellow-300/30 rounded animate-pulse leading-5"
                      style={{ 
                        width: '28px', 
                        height: '20px' // Match text height exactly
                      }}
                    ></div>
                  </div>
                )}
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
                  <div className="w-10 h-10 aspect-square rounded-full overflow-hidden border border-white/15 transition-all duration-200 hover:border-white/40 hover:brightness-75">
                    {profile?.profile_photo_url ? (
                      <img 
                        src={profile.profile_photo_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-base font-bold rounded-full">
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
                        <div className="w-12 h-12 aspect-square rounded-full overflow-hidden">
                          {profile?.profile_photo_url ? (
                            <img 
                              src={profile.profile_photo_url} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold rounded-full">
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

                        {/* Wholesale Clients Tab - Only show for wholesale users */}
                        {profile?.isWholesaleCustomer && (
                          <Link 
                            href="/account/dashboard?view=clients"
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#06b6d4' }}>
                              <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.5.7-1.5 1.5v6c0 .8.7 1.5 1.5 1.5h1v1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5zM12.5 11.5c0-.83-.67-1.5-1.5-1.5h-2V8.5c0-.83-.67-1.5-1.5-1.5S6 7.67 6 8.5V10H4c-.83 0-1.5.67-1.5 1.5v8c0 .83.67 1.5 1.5 1.5h8c.83 0 1.5-.67 1.5-1.5v-8z"/>
                            </svg>
                            <span>Clients</span>
                          </Link>
                        )}

                        <Link 
                          href="/account/dashboard?view=financial"
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
                          href="/account/dashboard?view=support"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white w-full text-left"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
                          </svg>
                          <span>Get Support</span>
                        </Link>

                        <Link 
                          href="/account/dashboard?view=settings"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                          </svg>
                          <span>Settings</span>
                        </Link>

                        <hr className="border-white/10 my-2" />

                        <Link 
                          href="/deals"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fbbf24' }}>
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                          <span>Deals</span>
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
      {isMobileMenuOpen && showAccountDashboard && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Profile Dropdown Menu - Shows below profile picture */}
      {isMobileMenuOpen && showAccountDashboard && (
        <div 
          className="absolute top-full left-4 mt-2 w-64 rounded-xl shadow-2xl z-50 lg:hidden"
          style={{
            backgroundColor: 'rgba(3, 1, 64, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          <div className="p-4">
            {/* Profile Header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden">
                {profile?.profile_photo_url ? (
                  <img 
                    src={profile.profile_photo_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold rounded-full">
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold truncate">{getUserDisplayName()}</h3>
                <p className="text-gray-300 text-sm truncate">{user?.email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              <Link 
                href="/account/dashboard"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                onClick={() => setIsMobileMenuOpen(false)}
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
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#10b981' }}>
                  <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                </svg>
                <span>Orders</span>
              </Link>

              {/* Wholesale Clients Tab - Only show for wholesale users */}
              {profile?.isWholesaleCustomer && (
                <Link 
                  href="/account/dashboard?view=clients"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#06b6d4' }}>
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.5.7-1.5 1.5v6c0 .8.7 1.5 1.5 1.5h1v1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5zM12.5 11.5c0-.83-.67-1.5-1.5-1.5h-2V8.5c0-.83-.67-1.5-1.5-1.5S6 7.67 6 8.5V10H4c-.83 0-1.5.67-1.5 1.5v8c0 .83.67 1.5 1.5 1.5h8c.83 0 1.5-.67 1.5-1.5v-8z"/>
                  </svg>
                  <span>Clients</span>
                </Link>
              )}

              <Link 
                href="/account/dashboard?view=financial"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                onClick={() => setIsMobileMenuOpen(false)}
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
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ec4899' }}>
                  <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                </svg>
                <span>Designs</span>
              </Link>

              <Link 
                href="/account/dashboard?view=proofs"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#f97316' }}>
                  <path d="M12 4.5C7.5 4.5 3.73 7.61 2.46 12c1.27 4.39 5.04 7.5 9.54 7.5s8.27-3.11 9.54-7.5c-1.27-4.39-5.04-7.5-9.54-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <span>Proofs</span>
              </Link>

              <Link 
                href="/account/dashboard?view=support"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white w-full text-left"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
                </svg>
                <span>Get Support</span>
              </Link>

              <Link 
                href="/account/dashboard?view=settings"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                <span>Settings</span>
              </Link>

              <hr className="border-white/10 my-2" />

              {!isAdminPage && (
                <Link 
                  href="/deals"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fbbf24' }}>
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  <span>Deals</span>
                </Link>
              )}

              <hr className="border-white/10 my-2" />

              {isAdmin && (
                <Link 
                  href="/admin/orders"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-500/20 transition-colors duration-200 text-purple-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admin Panel</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
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

      {/* Mobile Menu Slide-out for non-authenticated users */}
      {isMobileMenuOpen && !showAccountDashboard && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
        </div>
      )}

      <div 
        className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen && !showAccountDashboard ? 'translate-x-0' : '-translate-x-full'
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
            
            {/* Mobile Authentication Navigation - Show login/signup */}
            <>
              <Link 
                href="/login" 
                className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Log in
              </Link>
              <Link 
                href="/signup" 
                className="w-full text-left px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-90 hover:text-gray-800 transition-all duration-200 flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Signup
              </Link>
            </>
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