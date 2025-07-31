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
          dailyAverageRevenue
          dailyAverageOrders
          currentMonthProjection
          avgOrderToDeliveryTime
          avgProofApprovedToDeliveryTime
          newCustomers
          existingCustomers
          newSignups
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
        customerAnalytics {
          id
          email
          name
          lifetimeValue
          purchaseFrequency
          totalOrders
          firstOrderDate
          lastOrderDate
          avgOrderValue
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
  const [viewMode, setViewMode] = useState<'overview' | 'monthly'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  });
  const [cardVisibility, setCardVisibility] = useState({
    monthlyRevenue: true,
    monthlyOrders: true,
    proofTime: true,
    approvalRate: true,
    orderToDelivery: true,
    dailyAvgRevenue: true,
    dailyAvgOrders: true,
    monthProjection: true,
    avgLTV: true,
    newCustomers: true,
    existingCustomers: true
  });

  const { data: analyticsData, loading: analyticsLoading } = useQuery(GET_ANALYTICS_DATA, {
    variables: { timeRange }
  });

  const toggleCardVisibility = (cardKey: string) => {
    setCardVisibility(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

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

  // Generate monthly data from daily sales when timeRange is 1y
  const generateMonthlyData = (dailySales: any[]) => {
    if (!dailySales || dailySales.length === 0) return [];
    
    const monthlyData: { [key: string]: { revenue: number; orders: number; month: string } } = {};
    
    dailySales.forEach(day => {
      const date = new Date(day.date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          revenue: 0,
          orders: 0
        };
      }
      
      monthlyData[monthKey].revenue += day.revenue || 0;
      monthlyData[monthKey].orders += day.orders || 0;
    });
    
    return Object.values(monthlyData).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  // Get available months from the data
  const getAvailableMonths = () => {
    const monthlyData = generateMonthlyData(data?.dailySales || []);
    return monthlyData.map(month => month.month);
  };

  // Get selected month's data
  const getSelectedMonthData = () => {
    const monthlyData = generateMonthlyData(data?.dailySales || []);
    return monthlyData.find(month => month.month === selectedMonth) || {
      month: selectedMonth,
      revenue: 0,
      orders: 0
    };
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
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="pt-8 pb-8">
          <div className="w-full px-4 md:px-6">
            {/* Header with View Mode and Time Range Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white xl:hidden">Analytics</h1>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 glass-container p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'overview'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{
                      background: viewMode === 'overview' 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                        : 'transparent',
                      backdropFilter: viewMode === 'overview' ? 'blur(25px) saturate(180%)' : 'none',
                      border: viewMode === 'overview' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                      boxShadow: viewMode === 'overview' 
                        ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        : 'none'
                    }}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setViewMode('monthly')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'monthly'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{
                      background: viewMode === 'monthly' 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                        : 'transparent',
                      backdropFilter: viewMode === 'monthly' ? 'blur(25px) saturate(180%)' : 'none',
                      border: viewMode === 'monthly' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                      boxShadow: viewMode === 'monthly' 
                        ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        : 'none'
                    }}
                  >
                    Monthly Stats
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Month Selector - Only show in overview mode */}
                {viewMode === 'overview' && (
                  <select
                    aria-label="Select month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border border-white/20 rounded-lg px-3 md:px-4 py-2 text-white text-xs md:text-sm font-medium focus:outline-none focus:border-purple-400 transition-all cursor-pointer hover:scale-105"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '16px',
                      paddingRight: '32px'
                    }}
                  >
                    {getAvailableMonths().map(month => (
                      <option key={month} value={month} style={{ backgroundColor: '#030140' }}>
                        {month}
                      </option>
                    ))}
                  </select>
                )}
                
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
                {viewMode === 'overview' ? (
                  <>
                    {/* Row 1: Current Month Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.monthlyRevenue ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{selectedMonth} Revenue</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('monthlyRevenue')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.monthlyRevenue ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.monthlyRevenue ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                              {formatCurrency(getSelectedMonthData().revenue)}
                            </p>
                            <p className="text-xs mt-1 text-gray-400">
                              Monthly total
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.monthlyOrders ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{selectedMonth} Orders</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('monthlyOrders')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.monthlyOrders ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.monthlyOrders ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {getSelectedMonthData().orders}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#c084fc' }}>
                              {formatCurrency(getSelectedMonthData().orders > 0 ? getSelectedMonthData().revenue / getSelectedMonthData().orders : 0)} AOV
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.newCustomers ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">New Customer Orders</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('newCustomers')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.newCustomers ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.newCustomers ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {data?.summary?.newCustomers || 0}
                            </p>
                            <p className="text-xs mt-1 text-green-400">
                              First-time buyers
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.existingCustomers ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Repeat Customer Orders</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('existingCustomers')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.existingCustomers ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.existingCustomers ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {data?.summary?.existingCustomers || 0}
                            </p>
                            <p className="text-xs mt-1 text-blue-400">
                              Orders from repeat customers
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Operational Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                      {/* Order to Delivery Time */}
                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.orderToDelivery ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Order to Delivery</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('orderToDelivery')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.orderToDelivery ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.orderToDelivery ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {formatHours(data?.summary?.avgOrderToDeliveryTime || 0)}
                            </p>
                            <p className="text-xs mt-1 text-blue-400">
                              Average time
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.proofTime ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Proof Time</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('proofTime')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.proofTime ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.proofTime ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
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

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.approvalRate ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Approval Rate</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('approvalRate')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.approvalRate ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.approvalRate ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
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

                    {/* Row 3: Additional Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.dailyAvgRevenue ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Daily Avg Revenue</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('dailyAvgRevenue')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.dailyAvgRevenue ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.dailyAvgRevenue ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {formatCurrency(data?.summary?.dailyAverageRevenue || 0)}
                            </p>
                            <p className="text-xs mt-1 text-green-400">
                              Per day average
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.dailyAvgOrders ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Daily Avg Orders</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('dailyAvgOrders')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.dailyAvgOrders ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.dailyAvgOrders ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {Math.round(data?.summary?.dailyAverageOrders || 0)}
                            </p>
                            <p className="text-xs mt-1 text-cyan-400">
                              Orders per day
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.monthProjection ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { month: 'short' })} Projection</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('monthProjection')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.monthProjection ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.monthProjection ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {formatCurrency(data?.summary?.currentMonthProjection || 0)}
                            </p>
                            <p className="text-xs mt-1 text-yellow-400">
                              Month-end forecast
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`glass-container p-4 md:p-6 transition-all duration-200 hover:scale-[1.02] relative ${!cardVisibility.avgLTV ? 'blur-sm opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Avg LTV</span>
                          </div>
                          <button
                            onClick={() => toggleCardVisibility('avgLTV')}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            title={cardVisibility.avgLTV ? 'Hide data' : 'Show data'}
                          >
                            {cardVisibility.avgLTV ? (
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg md:text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                              {formatCurrency(
                                data?.customerAnalytics?.length > 0 
                                  ? data.customerAnalytics.reduce((sum: number, customer: any) => sum + (customer.lifetimeValue || 0), 0) / data.customerAnalytics.length
                                  : 0
                              )}
                            </p>
                            <p className="text-xs mt-1 text-emerald-400">
                              Customer lifetime value
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

                    {/* Customer Analytics Table */}
                    <div className="glass-container p-4 md:p-6 transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-white">Customer Analytics</h3>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm text-gray-400">Top customers by LTV</span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Customer</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">LTV</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Purchase Frequency</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Total Orders</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Avg Order Value</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Last Order</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {[...(data?.customerAnalytics || [])]
                              .sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0))
                              .slice(0, 10)
                              .map((customer: any, index: number) => (
                                <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                                  <td className="py-3">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{
                                          background: `linear-gradient(135deg, ${PIE_COLORS[index % PIE_COLORS.length]}, ${PIE_COLORS[(index + 1) % PIE_COLORS.length]})`
                                        }}>
                                          {customer.name ? customer.name.charAt(0).toUpperCase() : customer.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                      </div>
                                      <div className="ml-3">
                                        <div className="text-sm font-medium text-white">
                                          {customer.name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {customer.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="text-sm font-semibold text-green-400">
                                      {formatCurrency(customer.lifetimeValue || 0)}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="text-sm text-white">
                                      {customer.purchaseFrequency ? `${customer.purchaseFrequency.toFixed(1)} days` : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      avg between orders
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="text-sm text-white">
                                      {customer.totalOrders || 0}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="text-sm text-blue-400">
                                      {formatCurrency(customer.avgOrderValue || 0)}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="text-sm text-gray-300">
                                      {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {customer.firstOrderDate ? `Since ${new Date(customer.firstOrderDate).toLocaleDateString()}` : ''}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        
                        {(!data?.customerAnalytics || data.customerAnalytics.length === 0) && (
                          <div className="text-center py-8">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">No customer data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Monthly Statistics View */}
                    <div className="space-y-6">
                      {/* Monthly Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="glass-container p-6 transition-all duration-200 hover:scale-[1.02]">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-400 uppercase tracking-wider">This Month</span>
                          </div>
                          <p className="text-2xl font-bold text-green-400">
                            {formatCurrency(data?.summary?.totalRevenue || 0)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {data?.summary?.totalOrders || 0} orders
                          </p>
                        </div>

                        <div className="glass-container p-6 transition-all duration-200 hover:scale-[1.02]">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm text-gray-400 uppercase tracking-wider">Avg Order Value</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-400">
                            {formatCurrency(data?.summary?.averageOrderValue || 0)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Per order
                          </p>
                        </div>

                        <div className="glass-container p-6 transition-all duration-200 hover:scale-[1.02]">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-sm text-gray-400 uppercase tracking-wider">Growth Rate</span>
                          </div>
                          <p className={`text-2xl font-bold ${data?.summary?.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data?.summary?.revenueGrowth > 0 ? '+' : ''}{formatPercentage(data?.summary?.revenueGrowth || 0)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            vs last period
                          </p>
                        </div>
                      </div>

                      {/* Monthly Breakdown Chart */}
                      {timeRange === '1y' && (
                        <div className="glass-container p-6 mb-6">
                          <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue Breakdown</h3>
                          <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={generateMonthlyData(data?.dailySales || [])}>
                                <defs>
                                  <linearGradient id="monthlyRevenue" x1="0" y1="0" x2="0" y2="1">
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
                                  dataKey="month" 
                                  stroke={CHART_COLORS.axis}
                                  style={{ fontSize: '11px' }}
                                  tick={{ fill: CHART_COLORS.text }}
                                  axisLine={{ stroke: CHART_COLORS.grid }}
                                  tickLine={false}
                                />
                                <YAxis 
                                  yAxisId="revenue"
                                  stroke={CHART_COLORS.axis}
                                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                  style={{ fontSize: '11px' }}
                                  tick={{ fill: CHART_COLORS.text }}
                                  axisLine={{ stroke: CHART_COLORS.grid }}
                                  tickLine={false}
                                />
                                <YAxis 
                                  yAxisId="orders"
                                  orientation="right"
                                  stroke={CHART_COLORS.secondary}
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
                                  formatter={(value: number, name: string) => [
                                    name === 'revenue' ? formatCurrency(value) : value,
                                    name === 'revenue' ? 'Revenue' : 'Orders'
                                  ]}
                                />
                                <Area 
                                  yAxisId="revenue"
                                  type="monotone" 
                                  dataKey="revenue" 
                                  stroke={CHART_COLORS.primary}
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#monthlyRevenue)"
                                />
                                <Bar 
                                  yAxisId="orders"
                                  dataKey="orders" 
                                  fill={CHART_COLORS.secondary}
                                  opacity={0.7}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Monthly Statistics Table */}
                      <div className="glass-container p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Month</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Revenue</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Orders</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Avg Order</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Growth</th>
                              </tr>
                            </thead>
                            <tbody>
                              {generateMonthlyData(data?.dailySales || []).map((month, index) => {
                                const prevMonth = generateMonthlyData(data?.dailySales || [])[index - 1];
                                const growth = prevMonth ? ((month.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
                                return (
                                  <tr key={month.month} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-white font-medium">{month.month}</td>
                                    <td className="py-3 px-4 text-right text-green-400 font-semibold">
                                      {formatCurrency(month.revenue)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-white">{month.orders}</td>
                                    <td className="py-3 px-4 text-right text-blue-400">
                                      {formatCurrency(month.orders > 0 ? month.revenue / month.orders : 0)}
                                    </td>
                                    <td className={`py-3 px-4 text-right font-medium ${growth > 0 ? 'text-green-400' : growth < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                      {index === 0 ? '-' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
