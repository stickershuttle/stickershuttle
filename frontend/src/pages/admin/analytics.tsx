import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';

// GraphQL query for analytics data
const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData($timeRange: String) {
          getAnalyticsData(timeRange: $timeRange) {
        summary {
          totalRevenue
          totalOrders
          averageOrderValue
          uniqueCustomers
          revenueGrowth
          conversionRate
        }
        dailySales {
          date
          revenue
          orders
          averageOrderValue
        }
        proofMetrics {
          avgProofSendTime
          avgProofAcceptTime
          proofApprovalRate
          proofChangesRate
          totalProofs
          proofsApproved
          proofsWithChanges
        }
        productPerformance {
          topProductsByRevenue {
            name
            revenue
            quantity
            orders
          }
        }
      }
  }
`;

// Admin check - add your admin email(s) here
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

// Color palette for charts - matching calculator style
const CHART_COLORS = {
  primary: '#a855f7',
  secondary: '#3b82f6',
  tertiary: '#10b981',
  quaternary: '#f59e0b',
  quinary: '#ec4899',
  background: 'rgba(255, 255, 255, 0.05)',
  grid: 'rgba(255, 255, 255, 0.08)',
  text: 'rgba(255, 255, 255, 0.7)',
  axis: 'rgba(255, 255, 255, 0.4)',
  tooltip: {
    background: 'rgba(3, 1, 64, 0.98)',
    border: 'rgba(255, 255, 255, 0.15)'
  }
};

const PIE_COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

export default function AdminAnalytics() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [showMarketingDropdown, setShowMarketingDropdown] = useState(false);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);

  const { data: analyticsData, loading: analyticsLoading } = useQuery(GET_ANALYTICS_DATA, {
    variables: { timeRange }
  });

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        // Check if user email is in admin list
        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, []); // Remove router dependency to prevent loops

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format date for charts
  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format hours to human readable
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${Math.round(remainingHours)}h`;
    }
  };

  if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  const data = analyticsData?.getAnalyticsData;

  return (
    <AdminLayout title="Analytics - Sticker Shuttle Admin">
      <style jsx global>{`
        .recharts-cartesian-grid-horizontal line {
          stroke-dasharray: 0;
        }
        
        .recharts-cartesian-axis-tick text {
          font-family: 'Inter', sans-serif;
        }
        
        .recharts-tooltip-wrapper {
          outline: none !important;
        }
        
        .recharts-pie-sector:hover {
          filter: brightness(1.1);
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        
        .recharts-active-dot {
          filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.6));
        }
        
        .recharts-line-curve {
          filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.4));
        }
        
        .recharts-area-area {
          filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.3));
        }
        
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        @media (max-width: 768px) {
          .recharts-wrapper {
            font-size: 0.75rem;
          }
          
          .recharts-pie-label-text {
            font-size: 0.625rem;
          }
        }
      `}</style>
      <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
        {/* Sidebar - Hidden on mobile */}
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
              <a
                href="/admin/orders"
                className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                style={{
                  borderLeft: '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                  e.currentTarget.style.color = '#C084FC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '';
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
                className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                style={{
                  borderLeft: '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.color = '#93BBFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '';
                }}
              >
                <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Customers
              </a>

              {/* Analytics - Active */}
              <a
                href="#"
                className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-white transition-all"
                style={{
                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                  borderLeft: '3px solid #f97316'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.15)';
                }}
              >
                <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </a>

              {/* Divider */}
              <div className="my-4 border-t border-gray-700"></div>

              {/* Shipping */}
              <div className="relative">
                <a
                  href="#"
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                  style={{
                    borderLeft: '3px solid transparent'
                  }}
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
                  className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                  style={{
                    borderLeft: '3px solid transparent'
                  }}
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
                className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                style={{
                  borderLeft: '3px solid transparent'
                }}
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

              {/* Quick Access Links */}
              <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290192/supabase-logo-icon_h0jcfk.png" alt="Supabase" className="w-5 h-5 mr-3 object-contain" />
                Supabase
              </a>

              <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290230/Railway_Logo_bzh9nc.svg" alt="Railway" className="w-5 h-5 mr-3 brightness-0 invert object-contain" />
                Railway
              </a>

              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290249/Vercel_favicon_hbsrvj.svg" alt="Vercel" className="w-5 h-5 mr-3 brightness-0 invert object-contain" />
                Vercel
              </a>

              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290378/1685814539stripe-icon-png_utsajs.webp" alt="Stripe" className="w-5 h-5 mr-3 object-contain" />
                Stripe
              </a>

              <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290406/cloudinary-icon-512x335-z2n5aue3_r9svki.png" alt="Cloudinary" className="w-5 h-5 mr-3 object-contain" />
                Cloudinary
              </a>

              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750290446/Github-desktop-logo-symbol.svg_hb06pq.png" alt="GitHub" className="w-5 h-5 mr-3 object-contain" />
                GitHub
              </a>

              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all" style={{ borderLeft: '3px solid transparent' }}>
                <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750695141/9ca51ebe-fb09-4440-a9a4-a3fdb37ae3ad.png" alt="PostHog" className="w-5 h-5 mr-3 object-contain" />
                PostHog
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 xl:ml-56 pt-8 pb-8">
          <div className="w-full px-4 md:px-6">
            {/* Header with Time Range Selector */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white xl:hidden">Analytics</h1>
              <div className="flex items-center gap-3">
                <select
                  aria-label="Select time range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-transparent border border-white/20 rounded-lg px-3 md:px-4 py-2 text-white text-xs md:text-sm font-medium focus:outline-none focus:border-purple-400 transition-all cursor-pointer hover:scale-105"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px',
                    paddingRight: '32px'
                  }}
                >
                  <option value="7d" style={{ backgroundColor: '#030140' }}>Last 7 days</option>
                  <option value="30d" style={{ backgroundColor: '#030140' }}>Last 30 days</option>
                  <option value="90d" style={{ backgroundColor: '#030140' }}>Last 90 days</option>
                  <option value="1y" style={{ backgroundColor: '#030140' }}>Last year</option>
                </select>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
              </div>
            ) : (
              <>
                {/* Summary Cards - Mobile responsive grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div className="glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Total Revenue</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg md:text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                          {formatCurrency(data?.summary?.totalRevenue || 0)}
                        </p>
                        <p className={`text-xs mt-1 ${data?.summary?.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data?.summary?.revenueGrowth > 0 ? '↑' : '↓'} {formatPercentage(Math.abs(data?.summary?.revenueGrowth || 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Total Orders</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">{data?.summary?.totalOrders || 0}</p>
                        <p className="text-xs mt-1" style={{ color: '#c084fc' }}>
                          {formatCurrency(data?.summary?.averageOrderValue || 0)} AOV
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Proof Time</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                          {formatHours(data?.proofMetrics?.avgProofSendTime || 0)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#c084fc' }}>
                          Avg send time
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Approval Rate</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                          {formatPercentage(data?.proofMetrics?.proofApprovalRate || 0)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {data?.proofMetrics?.proofsApproved || 0} of {data?.proofMetrics?.totalProofs || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid - Stack on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                  {/* Daily Sales Chart */}
                  <div className="glass-container p-4 md:p-6 transition-all duration-200">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-4">Daily Revenue</h3>
                    <div className="h-64 md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.dailySales || []}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid 
                            strokeDasharray="0" 
                            stroke={CHART_COLORS.grid} 
                            vertical={false}
                          />
                          <XAxis 
                            dataKey="date" 
                            stroke={CHART_COLORS.axis}
                            tickFormatter={formatChartDate}
                            style={{ fontSize: '11px' }}
                            tick={{ fill: CHART_COLORS.text }}
                            axisLine={{ stroke: CHART_COLORS.grid }}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke={CHART_COLORS.axis}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            style={{ fontSize: '11px' }}
                            tick={{ fill: CHART_COLORS.text }}
                            axisLine={{ stroke: CHART_COLORS.grid }}
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: CHART_COLORS.tooltip.background,
                              border: `1px solid ${CHART_COLORS.tooltip.border}`,
                              borderRadius: '12px',
                              backdropFilter: 'blur(12px)',
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                            }}
                            labelStyle={{ color: CHART_COLORS.text, marginBottom: '4px' }}
                            itemStyle={{ color: '#fff' }}
                            labelFormatter={(label) => formatChartDate(label)}
                            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={CHART_COLORS.primary}
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)"
                            animationDuration={1500}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Average Order Value Chart */}
                  <div className="glass-container p-4 md:p-6 transition-all duration-200">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-4">Average Order Value</h3>
                    <div className="h-64 md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data?.dailySales || []}>
                          <CartesianGrid 
                            strokeDasharray="0" 
                            stroke={CHART_COLORS.grid} 
                            vertical={false}
                          />
                          <XAxis 
                            dataKey="date" 
                            stroke={CHART_COLORS.axis}
                            tickFormatter={formatChartDate}
                            style={{ fontSize: '11px' }}
                            tick={{ fill: CHART_COLORS.text }}
                            axisLine={{ stroke: CHART_COLORS.grid }}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke={CHART_COLORS.axis}
                            tickFormatter={(value) => `$${value}`}
                            style={{ fontSize: '11px' }}
                            tick={{ fill: CHART_COLORS.text }}
                            axisLine={{ stroke: CHART_COLORS.grid }}
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: CHART_COLORS.tooltip.background,
                              border: `1px solid ${CHART_COLORS.tooltip.border}`,
                              borderRadius: '12px',
                              backdropFilter: 'blur(12px)',
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                            }}
                            labelStyle={{ color: CHART_COLORS.text, marginBottom: '4px' }}
                            itemStyle={{ color: '#fff' }}
                            labelFormatter={(label) => formatChartDate(label)}
                            formatter={(value: number) => [formatCurrency(value), 'AOV']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="averageOrderValue" 
                            stroke={CHART_COLORS.secondary}
                            strokeWidth={3}
                            dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Proof Metrics */}
                  <div className="glass-container p-4 md:p-6 transition-all duration-200">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-4">Proof Management</h3>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between items-center p-3 md:p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div>
                          <p className="text-xs md:text-sm text-gray-400">Avg Response Time</p>
                          <p className="text-lg md:text-2xl font-bold text-white mt-1">
                            {formatHours(data?.proofMetrics?.avgProofAcceptTime || 0)}
                          </p>
                        </div>
                        <svg className="w-10 h-10 md:w-12 md:h-12 transition-all duration-200 hover:scale-110" style={{ color: '#c084fc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 md:p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div>
                          <p className="text-xs md:text-sm text-gray-400">Proofs Approved</p>
                          <p className="text-lg md:text-2xl font-bold text-white mt-1">
                            {data?.proofMetrics?.proofsApproved || 0}
                          </p>
                        </div>
                        <svg className="w-10 h-10 md:w-12 md:h-12 transition-all duration-200 hover:scale-110" style={{ color: '#86efac' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 md:p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]" style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div>
                          <p className="text-xs md:text-sm text-gray-400">Changes Requested</p>
                          <p className="text-lg md:text-2xl font-bold text-white mt-1">
                            {formatPercentage(data?.proofMetrics?.proofChangesRate || 0)}
                          </p>
                        </div>
                        <svg className="w-10 h-10 md:w-12 md:h-12 transition-all duration-200 hover:scale-110" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Top Products by Revenue */}
                  <div className="glass-container p-4 md:p-6 transition-all duration-200">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-4">Top Products by Revenue</h3>
                    <div className="h-64 md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.productPerformance?.topProductsByRevenue || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${formatCurrency(entry.revenue)}`}
                            outerRadius="80%"
                            fill="#8884d8"
                            dataKey="revenue"
                            animationBegin={0}
                            animationDuration={1000}
                          >
                            {(data?.productPerformance?.topProductsByRevenue || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: CHART_COLORS.tooltip.background,
                              border: `1px solid ${CHART_COLORS.tooltip.border}`,
                              borderRadius: '12px',
                              backdropFilter: 'blur(12px)',
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                            }}
                            labelStyle={{ color: CHART_COLORS.text, marginBottom: '4px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
