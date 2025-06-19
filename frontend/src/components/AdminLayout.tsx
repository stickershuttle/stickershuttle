import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import Head from "next/head";
import UniversalHeader from "./UniversalHeader";
import { useRouter } from "next/router";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

// Context for admin state
interface AdminContextType {
  showMarketingDropdown: boolean;
  setShowMarketingDropdown: (show: boolean) => void;
  showShippingDropdown: boolean;
  setShowShippingDropdown: (show: boolean) => void;
}

const AdminContext = createContext<AdminContextType>({
  showMarketingDropdown: false,
  setShowMarketingDropdown: () => {},
  showShippingDropdown: false,
  setShowShippingDropdown: () => {},
});

export const useAdminContext = () => useContext(AdminContext);

export default function AdminLayout({ children, title = "Admin Dashboard - Sticker Shuttle" }: AdminLayoutProps) {
  const router = useRouter();
  const [showMarketingDropdown, setShowMarketingDropdown] = useState(false);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [breadcrumbKey, setBreadcrumbKey] = useState(0);
  
  // Ensure we only render breadcrumbs on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Force breadcrumbs to update when route changes
  useEffect(() => {
    setBreadcrumbKey(prev => prev + 1);
  }, [router.asPath, router.query]);
  
  // Get breadcrumb data based on current route
  const getBreadcrumbs = () => {
    if (!isClient) return []; // Return empty array during SSR
    
    const path = router.asPath;
    const segments = path.split('?')[0].split('/').filter(Boolean); // Remove query params from segments
    const breadcrumbs = [];
    
    // Always start with Admin
    breadcrumbs.push({
      label: 'Admin',
      href: '/admin/orders',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    });
    
    // Add breadcrumbs based on route
    if (segments[0] === 'admin') {
      if (segments[1] === 'orders') {
        breadcrumbs.push({
          label: 'Orders',
          href: '/admin/orders',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          )
        });
        
        // Check for selectedOrder query parameter using router.query
        const selectedOrder = router.query.selectedOrder as string;
        
        // Debug logging
        console.log('AdminLayout breadcrumbs debug:', {
          path: router.asPath,
          segments,
          selectedOrder,
          routerQuery: router.query
        });
        
        if (segments[2]) {
          breadcrumbs.push({
            label: `Order #${segments[2]}`,
            href: `/admin/orders/${segments[2]}`,
            icon: null
          });
        } else if (selectedOrder) {
          breadcrumbs.push({
            label: `Order #${selectedOrder}`,
            href: `/admin/orders?selectedOrder=${selectedOrder}`,
            icon: null
          });
        }
      } else if (segments[1] === 'shipping-labels') {
        breadcrumbs.push({
          label: 'Shipping Labels',
          href: '/admin/shipping-labels',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        });
        
        if (segments[2]) {
          breadcrumbs.push({
            label: `Order #${segments[2]}`,
            href: `/admin/shipping-labels/${segments[2]}`,
            icon: null
          });
        }
      } else if (segments[1] === 'customers') {
        breadcrumbs.push({
          label: 'Customers',
          href: '/admin/customers',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )
        });
        
        if (segments[2]) {
          const customerEmail = decodeURIComponent(segments[2]);
          breadcrumbs.push({
            label: customerEmail,
            href: `/admin/customers/${segments[2]}`,
            icon: null
          });
        }
      } 
      // Analytics temporarily hidden
      // else if (segments[1] === 'analytics') {
      //   breadcrumbs.push({
      //     label: 'Analytics',
      //     href: '/admin/analytics',
      //     icon: (
      //       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      //       </svg>
      //     )
      //   });
      // }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  return (
    <AdminContext.Provider value={{
      showMarketingDropdown,
      setShowMarketingDropdown,
      showShippingDropdown,
      setShowShippingDropdown
    }}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591674/AlienSSFavicon_jlkmoi.svg" />
        
        {/* iOS Status Bar and Theme Color */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#030140" />
        <meta name="msapplication-navbutton-color" content="#030140" />
        <meta name="apple-mobile-web-app-title" content="Sticker Shuttle Admin" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        
        <title>{title}</title>
      </Head>
      
      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        <UniversalHeader />
        
        {/* Breadcrumbs */}
        <div 
          className="fixed top-16 left-0 right-0 z-10 px-6 py-3"
          style={{
            backgroundColor: 'rgba(3, 1, 64, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '8px'
          }}
        >
          <nav key={breadcrumbKey} className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <a
                  href={crumb.href}
                  className={`flex items-center gap-1.5 transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'text-white font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {crumb.icon}
                  <span>{crumb.label}</span>
                </a>
              </div>
            ))}
          </nav>
        </div>
        
        <main className="pt-32 min-h-screen flex">
          {/* Sidebar */}
          <div
            className="w-56 fixed left-0 h-screen pt-8 pr-4"
            style={{
              backgroundColor: 'transparent',
              top: '104px',
              height: 'calc(100vh - 104px)',
              paddingBottom: '0'
            }}
          >
            <div
              className="h-full rounded-r-2xl"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: 'none',
                borderBottomRightRadius: '0',
                height: '100%'
              }}
            >
              <nav className="px-3 py-6">
                <div className="mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 mb-3">Store Management</h3>
                </div>

                {/* Orders */}
                <a
                  href="/admin/orders"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/orders')
                      ? 'text-white bg-purple-500/15 border-l-3 border-purple-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/orders')) {
                      e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                      e.currentTarget.style.color = '#A78BFA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/orders')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Orders
                </a>

                {/* Customers */}
                <a
                  href="/admin/customers"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/customers')
                      ? 'text-white bg-blue-500/15 border-l-3 border-blue-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/customers')) {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = '#93BBFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/customers')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Customers
                </a>

                {/* Divider */}
                <div className="my-4 border-t border-gray-700"></div>

                {/* Shipping */}
                <div className="relative">
                  <a
                    href="#"
                    className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowShippingDropdown(!showShippingDropdown);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                      e.currentTarget.style.color = '#86EFAC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Shipping
                    <svg className={`w-4 h-4 ml-auto transition-transform ${showShippingDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>

                  {/* Dropdown Menu */}
                  {showShippingDropdown && (
                    <div className="ml-8 mt-1">
                      <a
                        href="#"
                        className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                        style={{
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                          e.currentTarget.style.color = '#86EFAC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '';
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750353068/easypost-icon-filled-256_q0cnuk.png"
                          alt="EasyPost"
                          className="w-5 h-5 mr-3 rounded-sm"
                        />
                        EasyPost
                      </a>
                    </div>
                  )}
                </div>

                {/* Marketing */}
                <div className="relative">
                  <a
                    href="#"
                    className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowMarketingDropdown(!showMarketingDropdown);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
                      e.currentTarget.style.color = '#F9A8D4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Marketing
                    <svg className={`w-4 h-4 ml-auto transition-transform ${showMarketingDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>

                  {/* Dropdown Menu */}
                  {showMarketingDropdown && (
                    <div className="ml-8 mt-1">
                      <a
                        href="#"
                        className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                        style={{
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
                          e.currentTarget.style.color = '#F9A8D4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '';
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750291437/e2672593-d403-4b51-b028-d913fd20cde2.png"
                          alt="Klaviyo"
                          className="w-5 h-5 mr-3"
                        />
                        Klaviyo
                      </a>
                    </div>
                  )}
                </div>

                {/* Settings */}
                <a
                  href="#"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                    e.currentTarget.style.color = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </a>

                {/* Second Divider */}
                <div className="my-4 border-t border-gray-700"></div>

                {/* Providers Section */}
                <div className="mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 mb-3">Quick Access</h3>
                </div>

                {/* Supabase */}
                <a
                  href="https://app.supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.1)';
                    e.currentTarget.style.color = '#6EE7B7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290192/supabase-logo-icon_h0jcfk.png" alt="Supabase" className="w-5 h-5 mr-3 object-contain" />
                  Supabase
                </a>

                {/* Railway */}
                <a
                  href="https://railway.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
                    e.currentTarget.style.color = '#A78BFA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290230/Railway_Logo_bzh9nc.svg" alt="Railway" className="w-5 h-5 mr-3 brightness-0 invert object-contain" />
                  Railway
                </a>

                {/* Vercel */}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290249/Vercel_favicon_hbsrvj.svg" alt="Vercel" className="w-5 h-5 mr-3 brightness-0 invert object-contain" />
                  Vercel
                </a>

                {/* Stripe */}
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.color = '#818CF8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290378/1685814539stripe-icon-png_utsajs.webp" alt="Stripe" className="w-5 h-5 mr-3 object-contain" />
                  Stripe
                </a>

                {/* Cloudinary */}
                <a
                  href="https://cloudinary.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                    e.currentTarget.style.color = '#60A5FA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290406/cloudinary-icon-512x335-z2n5aue3_r9svki.png" alt="Cloudinary" className="w-5 h-5 mr-3 object-contain" />
                  Cloudinary
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.3)';
                    e.currentTarget.style.color = '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290446/Github-desktop-logo-symbol.svg_hb06pq.png" alt="GitHub" className="w-5 h-5 mr-3 object-contain" />
                  GitHub
                </a>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 ml-56">
          {children}
          </div>
        </main>
        {/* Note: No footer for admin pages */}
      </div>
    </AdminContext.Provider>
  );
} 