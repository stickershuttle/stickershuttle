import { ReactNode, useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import UniversalHeader from "./UniversalHeader";
import { useRouter } from "next/router";
import { AdminContext } from "@/hooks/useAdminContext";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = "Admin Dashboard - Sticker Shuttle" }: AdminLayoutProps) {
  const router = useRouter();
  const [showMarketingDropdown, setShowMarketingDropdown] = useState(false);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [breadcrumbKey, setBreadcrumbKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Ensure we only render breadcrumbs on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Force breadcrumbs to update when route changes
  useEffect(() => {
    setBreadcrumbKey(prev => prev + 1);
  }, [router.asPath, router.query]);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowQuickActions(false);
  }, [router.asPath]);
  
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
      } else if (segments[1] === 'abandoned-checkouts') {
        breadcrumbs.push({
          label: 'Abandoned Checkouts',
          href: '/admin/abandoned-checkouts',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        });
      } else if (segments[1] === 'deals') {
        breadcrumbs.push({
          label: 'Deals',
          href: '/admin/deals',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          )
        });
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
      } else if (segments[1] === 'tax-exemptions') {
        breadcrumbs.push({
          label: 'Tax Exemptions',
          href: '/admin/tax-exemptions',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        });
      } else if (segments[1] === 'discounts') {
        breadcrumbs.push({
          label: 'Discounts',
          href: '/admin/discounts',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          )
        });
      } else if (segments[1] === 'credits') {
        breadcrumbs.push({
          label: 'Credits',
          href: '/admin/credits',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        });
      } else if (segments[1] === 'alerts') {
        breadcrumbs.push({
          label: 'Alerts',
          href: '/admin/alerts',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          )
        });
      } else if (segments[1] === 'blogs') {
        breadcrumbs.push({
          label: 'Blogs',
          href: '/admin/blogs',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          )
        });
      } else if (segments[1] === 'marketplace') {
        breadcrumbs.push({
          label: 'Creators Space',
          href: '/admin/marketplace',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          )
        });
      } else if (segments[1] === 'shared-carts') {
        breadcrumbs.push({
          label: 'Shared Carts',
          href: '/admin/shared-carts',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )
        });
      } else if (segments[1] === 'wholesale') {
        breadcrumbs.push({
          label: 'Wholesale',
          href: '/admin/wholesale',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )
        });
      } else if (segments[1] === 'analytics') {
        breadcrumbs.push({
          label: 'Analytics',
          href: '/admin/analytics',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
        });
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  return (
    <AdminContext.Provider value={{
      showMarketingDropdown,
      setShowMarketingDropdown,
      showShippingDropdown,
      setShowShippingDropdown,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      showQuickActions,
      setShowQuickActions
    }}>
      <Head>
        <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591674/AlienSSFavicon_jlkmoi.svg" />
        <title>{title}</title>
      </Head>
      
      <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        <UniversalHeader />
        

        
        {/* Desktop Breadcrumbs */}
        <div 
          className="hidden xl:block fixed left-0 right-0 z-10 px-6 py-3"
          style={{
            top: 'calc(4rem + var(--header-alerts-height, 0px))',
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
        
        <main className="pt-20 xl:pt-32 min-h-screen xl:flex">
          {/* Desktop Sidebar */}
          <div
            className="hidden xl:block w-56 fixed left-0 h-screen pt-8 pr-4"
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
                <div className="relative">
                  <a
                    href="/admin/orders"
                    className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                      router.asPath.startsWith('/admin/orders') || router.asPath.startsWith('/admin/abandoned-checkouts')
                        ? 'text-white bg-purple-500/15 border-l-3 border-purple-500'
                        : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                    }`}
                    onMouseEnter={(e) => {
                      if (!router.asPath.startsWith('/admin/orders') && !router.asPath.startsWith('/admin/abandoned-checkouts')) {
                        e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                        e.currentTarget.style.color = '#A78BFA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!router.asPath.startsWith('/admin/orders') && !router.asPath.startsWith('/admin/abandoned-checkouts')) {
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
                  
                  {/* Orders Submenu - Always visible when on orders pages */}
                  {(router.asPath.startsWith('/admin/orders') || router.asPath.startsWith('/admin/abandoned-checkouts')) && (
                    <div className="ml-8 mt-3">
                      <a
                        href="/admin/orders"
                        className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                          router.asPath === '/admin/orders' || (router.asPath.startsWith('/admin/orders/') && !router.asPath.includes('abandoned'))
                            ? 'text-purple-300 bg-purple-500/10'
                            : 'text-gray-400 hover:text-purple-300'
                        }`}
                        style={{
                          backgroundColor: router.asPath === '/admin/orders' || (router.asPath.startsWith('/admin/orders/') && !router.asPath.includes('abandoned')) ? 'rgba(168, 85, 247, 0.1)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (router.asPath !== '/admin/orders' && !router.asPath.startsWith('/admin/orders/')) {
                            e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                            e.currentTarget.style.color = '#D8B4FE';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (router.asPath !== '/admin/orders' && !router.asPath.startsWith('/admin/orders/')) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '';
                          }
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Orders
                      </a>
                      <a
                        href="/admin/abandoned-checkouts"
                        className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                          router.asPath.startsWith('/admin/abandoned-checkouts')
                            ? 'text-purple-300 bg-purple-500/10'
                            : 'text-gray-400 hover:text-purple-300'
                        }`}
                        style={{
                          backgroundColor: router.asPath.startsWith('/admin/abandoned-checkouts') ? 'rgba(168, 85, 247, 0.1)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!router.asPath.startsWith('/admin/abandoned-checkouts')) {
                            e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                            e.currentTarget.style.color = '#D8B4FE';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!router.asPath.startsWith('/admin/abandoned-checkouts')) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '';
                          }
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Abandoned Checkouts
                      </a>
                    </div>
                  )}
                </div>

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

                {/* Discounts */}
                <a
                  href="/admin/discounts"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/discounts')
                      ? 'text-white bg-yellow-500/15 border-l-3 border-yellow-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/discounts')) {
                      e.currentTarget.style.backgroundColor = 'rgba(250, 204, 21, 0.1)';
                      e.currentTarget.style.color = '#FDE047';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/discounts')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Discounts
                </a>

                {/* Deals */}
                <a
                  href="/admin/deals"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/deals')
                      ? 'text-white bg-orange-500/15 border-l-3 border-orange-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/deals')) {
                      e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.1)';
                      e.currentTarget.style.color = '#FDBA74';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/deals')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                  Deals
                </a>

                {/* Credits */}
                <a
                  href="/admin/credits"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/credits')
                      ? 'text-white bg-green-500/15 border-l-3 border-green-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/credits')) {
                      e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                      e.currentTarget.style.color = '#86EFAC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/credits')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Credits
                </a>

                {/* Wholesale */}
                <a
                  href="/admin/wholesale"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/wholesale')
                      ? 'text-white bg-indigo-500/15 border-l-3 border-indigo-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/wholesale')) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                      e.currentTarget.style.color = '#A5B4FC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/wholesale')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Wholesale
                </a>

                {/* Alerts */}
                <a
                  href="/admin/alerts"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/alerts')
                      ? 'text-white bg-pink-500/15 border-l-3 border-pink-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/alerts')) {
                      e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
                      e.currentTarget.style.color = '#F9A8D4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/alerts')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  Alerts
                </a>

                {/* Blogs */}
                <a
                  href="/admin/blogs"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/blogs')
                      ? 'text-white bg-indigo-500/15 border-l-3 border-indigo-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/blogs')) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                      e.currentTarget.style.color = '#A5B4FC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/blogs')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  Blogs
                </a>

                {/* Marketplace */}
                <a
                  href="/admin/marketplace"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/marketplace')
                      ? 'text-white bg-emerald-500/15 border-l-3 border-emerald-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/marketplace')) {
                      e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                      e.currentTarget.style.color = '#6EE7B7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/marketplace')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Creators Space
                </a>

                {/* Shared Carts */}
                <a
                  href="/admin/shared-carts"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/shared-carts')
                      ? 'text-white bg-teal-500/15 border-l-3 border-teal-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/shared-carts')) {
                      e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.1)';
                      e.currentTarget.style.color = '#5EEAD4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/shared-carts')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Shared Carts
                </a>

                {/* Analytics */}
                <a
                  href="/admin/analytics"
                  className={`group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                    router.asPath.startsWith('/admin/analytics')
                      ? 'text-white bg-orange-500/15 border-l-3 border-orange-500'
                      : 'text-gray-400 hover:text-white border-l-3 border-transparent'
                  }`}
                  onMouseEnter={(e) => {
                    if (!router.asPath.startsWith('/admin/analytics')) {
                      e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.1)';
                      e.currentTarget.style.color = '#FDBA74';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!router.asPath.startsWith('/admin/analytics')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </a>













                {/* Providers Section */}
                <div className="mb-2 mt-8">
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

                {/* PostHog */}
                <a
                  href="https://app.posthog.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all border-l-3 border-transparent"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.1)';
                    e.currentTarget.style.color = '#FED7AA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750695141/9ca51ebe-fb09-4440-a9a4-a3fdb37ae3ad.png" alt="PostHog" className="w-5 h-5 mr-3 object-contain" />
                  PostHog
                </a>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 xl:ml-56 pb-32 xl:pb-0">
            <div style={{
              transform: 'scale(0.9)',
              transformOrigin: 'top left',
              width: '111.11%',
              height: '111.11%'
            }}>
              {children}
            </div>
          </div>
        </main>

        {/* Quick Actions Menu */}
        <div className="xl:hidden">
          {showQuickActions && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowQuickActions(false)}
              />
              
              {/* Quick Actions Menu */}
              <div className="fixed bottom-24 left-4 right-4 z-45">
                <div 
                  className="rounded-xl p-4 shadow-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Create Order */}
                    <button className="flex flex-col items-center p-3 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-xs text-white">New Order</span>
                    </button>
                    
                    {/* Add Customer */}
                    <button className="flex flex-col items-center p-3 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <span className="text-xs text-white">Add Customer</span>
                    </button>
                    
                    {/* Create Discount */}
                    <button className="flex flex-col items-center p-3 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <span className="text-xs text-white">New Discount</span>
                    </button>
                    
                    {/* Analytics */}
                    <button className="flex flex-col items-center p-3 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-white">Analytics</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Mobile/Tablet Bottom Navigation Pill */}
        <div className="xl:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
          <div 
            className="rounded-full px-2 py-2 flex items-center gap-1"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Orders */}
            <a
              href="/admin/orders"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/orders') 
                  ? 'text-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/orders') && (
                <div className="absolute inset-px rounded-full bg-purple-500/20" style={{
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </a>
            
            {/* Customers */}
            <a
              href="/admin/customers"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/customers') 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/customers') && (
                <div className="absolute inset-px rounded-full bg-blue-500/20" style={{
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </a>
            
            {/* Discounts */}
            <a
              href="/admin/discounts"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/discounts') 
                  ? 'text-yellow-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/discounts') && (
                <div className="absolute inset-px rounded-full bg-yellow-500/20" style={{
                  boxShadow: '0 0 12px rgba(234, 179, 8, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </a>
            
            {/* Deals */}
            <a
              href="/admin/deals"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/deals') 
                  ? 'text-orange-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/deals') && (
                <div className="absolute inset-px rounded-full bg-orange-500/20" style={{
                  boxShadow: '0 0 12px rgba(251, 146, 60, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </a>
            
            {/* Credits */}
            <a
              href="/admin/credits"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/credits') 
                  ? 'text-green-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/credits') && (
                <div className="absolute inset-px rounded-full bg-green-500/20" style={{
                  boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>
            
            {/* Blogs */}
            <a
              href="/admin/blogs"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/blogs') 
                  ? 'text-indigo-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/blogs') && (
                <div className="absolute inset-px rounded-full bg-indigo-500/20" style={{
                  boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </a>
            
            {/* Analytics */}
            <a
              href="/admin/analytics"
              className={`relative p-2.5 rounded-full transition-colors ${
                router.asPath.startsWith('/admin/analytics') 
                  ? 'text-orange-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {router.asPath.startsWith('/admin/analytics') && (
                <div className="absolute inset-px rounded-full bg-orange-500/20" style={{
                  boxShadow: '0 0 12px rgba(249, 115, 22, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </a>
            
            {/* Quick Actions Button */}
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={`relative p-2.5 rounded-full transition-colors ${
                showQuickActions 
                  ? 'text-white bg-purple-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {showQuickActions && (
                <div className="absolute inset-px rounded-full bg-purple-500/20" style={{
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)'
                }}></div>
              )}
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>


      </div>
    </AdminContext.Provider>
  );
} 