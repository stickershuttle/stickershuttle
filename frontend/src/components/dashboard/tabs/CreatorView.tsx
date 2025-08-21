import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CREATOR_BY_USER_ID, GET_CREATOR_SALES_STATS } from '../../../lib/profile-mutations';
import StripeConnectOnboarding from '../../StripeConnectOnboarding';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Color palette for charts - matching admin analytics style
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

interface CreatorViewProps {
  user: any;
  profile: any;
  setCurrentView: (view: string) => void;
}

interface SoldProduct {
  id: string;
  name: string;
  imageUrl: string;
  totalSold: number;
  totalRevenue: number;
  price: number;
}

interface RecentSale {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  soldAt: string;
  orderNumber: string;
  shippingCity?: string;
}

interface QuantityBreakdown {
  quantity: number;
  orderCount: number;
  totalSold: number;
  revenue: number;
  totalProfit: number;
}

interface CreatorStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  soldProducts: SoldProduct[];
  recentSales: RecentSale[];
  quantityBreakdown: QuantityBreakdown[];
  customFivePackCount: number;
}

// Cost structure based on provided data
const calculateCosts = (quantity: number, totalRevenue: number = 0) => {
  let materialShippingCost: number;
  let stickerCost = quantity * 0.40; // $0.40 per sticker
  let fulfillmentCost: number;

  if (quantity === 1) {
    materialShippingCost = 1.35;
    fulfillmentCost = 0.25;
  } else if (quantity <= 5) {
    materialShippingCost = 1.46;
    fulfillmentCost = 0.26;
  } else if (quantity <= 10) {
    materialShippingCost = 1.61;
    fulfillmentCost = 0.27;
  } else if (quantity <= 25) {
    materialShippingCost = 5.45; // upgrades to tracking
    fulfillmentCost = 0.30;
  } else {
    // For larger quantities, we'll use the 25+ tier costs
    materialShippingCost = 5.45;
    fulfillmentCost = 0.30;
  }

  // Calculate Stripe processing fee: 2.9% + $0.30
  const stripeFee = totalRevenue > 0 ? (totalRevenue * 0.029) + 0.30 : 0;

  const totalCosts = materialShippingCost + stickerCost + fulfillmentCost + stripeFee;
  return {
    materialShippingCost,
    stickerCost,
    fulfillmentCost,
    stripeFee,
    totalCosts
  };
};

export default function CreatorView({ user, profile, setCurrentView }: CreatorViewProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'sales' | 'analytics' | 'payments'>('analytics');
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: string}>({
    '1': '4"',
    '5': '4"', 
    '10': '4"',
    '25': '4"'
  });
  const [dateRange, setDateRange] = useState<string>('monthtodate');

  // Actual pricing structure with quantity discounts
  const getActualPrice = (quantity: number, size: string) => {
    const pricingTable = {
      '3"': {
        1: 3.99,
        5: 9.98,   // $1.996 per sticker
        10: 15.96, // $1.596 per sticker  
        25: 29.93  // $1.1972 per sticker
      },
      '4"': {
        1: 4.99,
        5: 12.48,  // $2.496 per sticker
        10: 19.96, // $1.996 per sticker
        25: 37.43  // $1.4972 per sticker
      },
      '5"': {
        1: 5.99,
        5: 14.98,  // $2.996 per sticker
        10: 23.96, // $2.396 per sticker
        25: 44.92  // $1.7968 per sticker
      }
    };

    const sizeTable = pricingTable[size as keyof typeof pricingTable] || pricingTable['4"'];
    
    // Find the best pricing tier for the quantity
    if (quantity >= 25) return sizeTable[25];
    if (quantity >= 10) return sizeTable[10];
    if (quantity >= 5) return sizeTable[5];
    return sizeTable[1] * quantity; // For quantities 1-4, use per-unit pricing
  };

  const calculateProfit = (quantity: number, size: string) => {
    const totalRevenue = getActualPrice(quantity, size);
    const costs = calculateCosts(quantity, totalRevenue);
    return totalRevenue - costs.totalCosts;
  };

  // Get creator data
  const { data: creatorData, loading: creatorLoading } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  // Get creator sales stats
  const { data: salesData, loading: salesLoading } = useQuery(GET_CREATOR_SALES_STATS, {
    variables: { 
      creatorId: creatorData?.getCreatorByUserId?.id,
      dateRange: dateRange
    },
    skip: !creatorData?.getCreatorByUserId?.id
  });

  // Prepare stats data - moved before conditional returns
  const creator = creatorData?.getCreatorByUserId;
  const stats: CreatorStats = salesData?.getCreatorSalesStats || {
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    soldProducts: [],
    recentSales: []
  };

  // Calculate profit analytics - moved before conditional returns
  const profitAnalytics = React.useMemo(() => {
    let totalProfit = 0;
    let totalCosts = 0;
    const salesByDay: { [key: string]: { revenue: number; profit: number; sales: number } } = {};
    
    stats.recentSales.forEach(sale => {
      const revenue = sale.price * sale.quantity;
      const costs = calculateCosts(sale.quantity, revenue);
      const profit = revenue - costs.totalCosts;
      
      totalProfit += profit;
      totalCosts += costs.totalCosts;
      
      // Group by day for current month trends
      const saleDate = new Date(sale.soldAt);
      const dayKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!salesByDay[dayKey]) {
        salesByDay[dayKey] = { revenue: 0, profit: 0, sales: 0 };
      }
      
      salesByDay[dayKey].revenue += revenue;
      salesByDay[dayKey].profit += profit;
      salesByDay[dayKey].sales += sale.quantity;
    });

    const profitMargin = stats.totalRevenue > 0 ? (totalProfit / stats.totalRevenue) * 100 : 0;
    const averageOrderValue = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
    
    return {
      totalProfit,
      totalCosts,
      profitMargin,
      averageOrderValue,
      salesByDay
    };
  }, [stats]);

  // Chart data for Recharts - current month to date
  const salesChartData = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.getDate();
    
    // Generate all days from 1st to today in current month
    const monthData = [];
    for (let day = 1; day <= today; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = profitAnalytics.salesByDay[dateKey] || { sales: 0, revenue: 0, profit: 0 };
      
      monthData.push({
        date: new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        fullDate: dateKey,
        sales: dayData.sales,
        revenue: dayData.revenue,
        profit: dayData.profit
      });
    }
    
    return monthData;
  }, [profitAnalytics.salesByDay]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div 
          className="p-3 rounded-lg border shadow-lg"
          style={{
            background: CHART_COLORS.tooltip.background,
            borderColor: CHART_COLORS.tooltip.border,
            backdropFilter: 'blur(12px)'
          }}
        >
          <p className="text-white text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-purple-300 text-sm">
              <span className="inline-block w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              Sales: {data?.sales || 0} stickers
            </p>
            {data?.revenue && (
              <p className="text-green-300 text-sm">
                Revenue: {formatCurrency(data.revenue)}
              </p>
            )}
            {data?.profit && (
              <p className="text-blue-300 text-sm">
                Your Earnings: {formatCurrency(data.profit)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (creatorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/20">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Not a Creator</h3>
          <p className="text-gray-400 mb-4">You haven't been set up as a creator yet.</p>
          <p className="text-sm text-gray-500">Contact support to become a marketplace creator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="p-4 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Analytics Period</h3>
              <div className="flex gap-2">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'last7days', label: 'Last 7 Days' },
                  { value: 'monthtodate', label: 'Month to Date' },
                  { value: 'lastmonth', label: 'Last Month' },
                  { value: 'yeartodate', label: 'Year to Date' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      dateRange === option.value
                        ? 'text-blue-300 bg-blue-400/20 border border-blue-400/30'
                        : 'text-white/60 bg-gray-600/20 border border-gray-600/20 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 mb-6 xl:mb-8">
            <div className="p-4 xl:p-6 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Revenue</div>
                  <div className="text-lg xl:text-2xl font-bold text-green-300">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-6 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Earnings</div>
                  <div className="text-lg xl:text-2xl font-bold text-purple-300">
                    {formatCurrency(profitAnalytics.totalProfit)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-6 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Sales</div>
                  <div className="text-lg xl:text-2xl font-bold text-white">
                    {stats.totalSales}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-6 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Earnings Margin</div>
                  <div className="text-lg xl:text-2xl font-bold text-yellow-300">
                    {profitAnalytics.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation - 4 Column Grid with Icons */}
          <div className="mb-8" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { 
                  key: 'analytics', 
                  label: 'Analytics',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )
                },
                { 
                  key: 'payments', 
                  label: 'Payments',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )
                },
                { 
                  key: 'products', 
                  label: 'Top Products',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )
                },
                { 
                  key: 'sales', 
                  label: 'Recent Sales',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  )
                }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`relative text-center px-4 py-5 rounded-xl flex flex-col items-center gap-3 transition-all duration-300 border backdrop-blur-md ${
                    selectedTab === tab.key
                      ? "bg-blue-500/20 text-blue-200 font-semibold border-blue-400/50 shadow-2xl"
                      : "hover:bg-white/10 border-white/20 text-white/80 hover:text-white hover:border-white/30"
                  }`}
                  style={{
                    boxShadow: selectedTab === tab.key 
                      ? 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.2) 0px 4px 16px'
                  }}
                >
                  <div className={`p-3 rounded-xl transition-all duration-300 ${
                    selectedTab === tab.key 
                      ? 'text-blue-300 bg-blue-400/20 border border-blue-400/30' 
                      : 'text-white/60 bg-gray-600/20 border border-gray-600/20 group-hover:bg-white/10'
                  }`}>
                    {tab.icon}
                  </div>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="rounded-xl overflow-hidden" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>


            {selectedTab === 'products' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Selling Products</h3>
                {salesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : stats.soldProducts.length > 0 ? (
                  <div className="space-y-4">
                    {stats.soldProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                        <img
                          src={product.imageUrl || '/placeholder-product.png'}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{product.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span>{product.totalSold} sold</span>
                            <span>{formatCurrency(product.price)} each</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-300">
                            {formatCurrency(product.totalRevenue)}
                          </div>
                          <div className="text-xs text-gray-400">Total Revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-medium text-white mb-1">No products sold yet</h3>
                    <p className="text-sm text-gray-400">Your product sales will appear here once customers start purchasing.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'sales' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Sales</h3>
                {salesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : stats.recentSales.length > 0 ? (
                                     <div className="space-y-4">
                     {stats.recentSales.map((sale, index) => (
                       <div key={`${sale.id}-${index}`} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                         <div>
                           <h4 className="font-medium text-white">{sale.productName}</h4>
                           <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                             <span>Order #{sale.orderNumber}</span>
                             <span>Qty: {sale.quantity}</span>
                             <span className="flex items-center gap-1">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                               </svg>
                               {sale.shippingCity || 'Unknown'}
                             </span>
                             <span>{formatDate(sale.soldAt)}</span>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-semibold text-green-300">
                             {formatCurrency(sale.price * sale.quantity)}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-white mb-1">No sales yet</h3>
                    <p className="text-sm text-gray-400">Your recent sales will appear here once customers start purchasing.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'analytics' && (
              <div className="p-6 space-y-8">
                                <h3 className="text-lg font-semibold text-white mb-6">Creator Analytics</h3>
                
                {/* Quantity Breakdown Section */}
                <div className="p-6 rounded-lg bg-white/5">
                  <h4 className="text-md font-semibold text-white mb-4">Sales by Quantity</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {stats.quantityBreakdown?.map((breakdown) => (
                      <div key={breakdown.quantity} className="p-4 rounded-lg bg-white/5 border border-gray-700">
                        <div className="text-lg font-bold text-white mb-2">
                          {breakdown.quantity === 25 ? '25+ Pack' : `${breakdown.quantity} ${breakdown.quantity === 1 ? 'Single' : 'Pack'}`}
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Orders:</span>
                            <span className="text-blue-300 font-medium">{breakdown.orderCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Sold:</span>
                            <span className="text-green-300 font-medium">{breakdown.totalSold}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenue:</span>
                            <span className="text-purple-300 font-medium">{formatCurrency(breakdown.revenue)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-600 pt-1 mt-2">
                            <span className="font-medium">Total Profit:</span>
                            <span className="text-yellow-300 font-bold">{formatCurrency(breakdown.totalProfit)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Profit Summary */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-lg font-bold text-white mb-1">Total Profit Across All Quantities</h5>
                        <p className="text-xs text-yellow-300">Your earnings after all costs (materials, shipping, fulfillment, Stripe fees)</p>
                      </div>
                      <div className="text-2xl font-bold text-yellow-300">
                        {formatCurrency(stats.quantityBreakdown?.reduce((sum, breakdown) => sum + breakdown.totalProfit, 0) || 0)}
                      </div>
                    </div>
                  </div>


                </div>
                
                {/* Sales Chart */}
                 <div className="p-6 rounded-lg mb-8" style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                   backdropFilter: 'blur(12px)'
                 }}>
                   <h4 className="text-md font-semibold text-white mb-4">
                     Sales This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                   </h4>
                   <div className="h-64 md:h-[300px]">
                     {salesChartData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={salesChartData}>
                           <defs>
                             <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
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
                             style={{ fontSize: '11px' }}
                             tick={{ fill: CHART_COLORS.text }}
                             axisLine={{ stroke: CHART_COLORS.grid }}
                             tickLine={false}
                           />
                           <YAxis 
                             stroke={CHART_COLORS.axis}
                             style={{ fontSize: '11px' }}
                             tick={{ fill: CHART_COLORS.text }}
                             axisLine={{ stroke: CHART_COLORS.grid }}
                             tickLine={false}
                             domain={[0, (dataMax: number) => Math.max(20, Math.ceil(dataMax / 5) * 5)]}
                             ticks={[0, 1, 5, 10, 15, 20]}
                             allowDataOverflow={false}
                           />
                           <Tooltip content={<CustomTooltip />} />
                           <Area 
                             type="monotone" 
                             dataKey="sales" 
                             stroke={CHART_COLORS.primary}
                             strokeWidth={3}
                             fillOpacity={1} 
                             fill="url(#colorSales)"
                             animationDuration={1500}
                             animationEasing="ease-out"
                             dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 4 }}
                             activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: 'rgba(255, 255, 255, 0.4)', strokeWidth: 2 }}
                             connectNulls={true}
                           />
                         </AreaChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="flex items-center justify-center h-full">
                         <div className="text-center">
                           <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                           </svg>
                           <p className="text-gray-400">No sales this month yet</p>
                           <p className="text-gray-500 text-sm mt-1">Your daily sales for {new Date().toLocaleDateString('en-US', { month: 'long' })} will appear here</p>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                {/* Cost Structure Information */}
                <div className="p-6 rounded-lg bg-white/5">
                  <h4 className="text-md font-semibold text-white mb-4">Cost Structure & Earnings Calculator</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="text-lg font-bold text-white mb-2">1 Sticker</div>
                      <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        <div>Material & Shipping: $1.35</div>
                        <div>Sticker Cost: $0.40/ea × 1</div>
                        <div>Fulfillment: $0.25</div>
                        <div>Stripe Fee: ${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).stripeFee.toFixed(2)}</div>
                        <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).totalCosts.toFixed(2)}</div>
                      </div>
                      
                      {/* Size selections */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['3"', '4"', '5"'].map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, '1': size }))}
                              className={`p-2 rounded text-center transition-all duration-200 border ${
                                selectedSizes['1'] === size
                                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <div className="text-xs font-medium">{size}</div>
                              <div className="text-xs text-green-300">${getActualPrice(1, size)}</div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Earnings calculation */}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Revenue ({selectedSizes['1']}):</span>
                              <span className="text-green-300">${getActualPrice(1, selectedSizes['1']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost to Fulfill:</span>
                              <span className="text-red-300">-${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).totalCosts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Your Earnings:</span>
                              <span className="text-green-400">+${calculateProfit(1, selectedSizes['1']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Your Profit %:</span>
                              <span className="text-blue-300">{((calculateProfit(1, selectedSizes['1']) / getActualPrice(1, selectedSizes['1'])) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="text-lg font-bold text-white mb-2">5 Stickers</div>
                      <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        <div>Material & Shipping: $1.46</div>
                        <div>Sticker Cost: $0.40/ea × 5</div>
                        <div>Fulfillment: $0.26</div>
                        <div>Stripe Fee: ${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).stripeFee.toFixed(2)}</div>
                        <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).totalCosts.toFixed(2)}</div>
                      </div>
                      
                      {/* Size selections */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['3"', '4"', '5"'].map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, '5': size }))}
                              className={`p-2 rounded text-center transition-all duration-200 border ${
                                selectedSizes['5'] === size
                                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <div className="text-xs font-medium">{size}</div>
                              <div className="text-xs text-green-300">${getActualPrice(5, size).toFixed(2)}</div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Earnings calculation */}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Revenue ({selectedSizes['5']}):</span>
                              <span className="text-green-300">${getActualPrice(5, selectedSizes['5']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost to Fulfill:</span>
                              <span className="text-red-300">-${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).totalCosts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Your Earnings:</span>
                              <span className="text-green-400">+${calculateProfit(5, selectedSizes['5']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Your Profit %:</span>
                              <span className="text-blue-300">{((calculateProfit(5, selectedSizes['5']) / getActualPrice(5, selectedSizes['5'])) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="text-lg font-bold text-white mb-2">10 Stickers</div>
                      <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        <div>Material & Shipping: $1.61</div>
                        <div>Sticker Cost: $0.40/ea × 10</div>
                        <div>Fulfillment: $0.27</div>
                        <div>Stripe Fee: ${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).stripeFee.toFixed(2)}</div>
                        <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).totalCosts.toFixed(2)}</div>
                      </div>
                      
                      {/* Size selections */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['3"', '4"', '5"'].map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, '10': size }))}
                              className={`p-2 rounded text-center transition-all duration-200 border ${
                                selectedSizes['10'] === size
                                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <div className="text-xs font-medium">{size}</div>
                              <div className="text-xs text-green-300">${getActualPrice(10, size).toFixed(2)}</div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Earnings calculation */}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Revenue ({selectedSizes['10']}):</span>
                              <span className="text-green-300">${getActualPrice(10, selectedSizes['10']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost to Fulfill:</span>
                              <span className="text-red-300">-${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).totalCosts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Your Earnings:</span>
                              <span className="text-green-400">+${calculateProfit(10, selectedSizes['10']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Your Profit %:</span>
                              <span className="text-blue-300">{((calculateProfit(10, selectedSizes['10']) / getActualPrice(10, selectedSizes['10'])) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="text-lg font-bold text-white mb-2">25 Stickers</div>
                      <div className="text-xs text-green-300 mb-2">Shipped with USPS (Includes Tracking)</div>
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        <div>Material & Shipping: $5.45</div>
                        <div>Sticker Cost: $0.40/ea × 25</div>
                        <div>Fulfillment: $0.30</div>
                        <div>Stripe Fee: ${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).stripeFee.toFixed(2)}</div>
                        <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).totalCosts.toFixed(2)}</div>
                      </div>
                      
                      {/* Size selections */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['3"', '4"', '5"'].map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, '25': size }))}
                              className={`p-2 rounded text-center transition-all duration-200 border ${
                                selectedSizes['25'] === size
                                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <div className="text-xs font-medium">{size}</div>
                              <div className="text-xs text-green-300">${getActualPrice(25, size).toFixed(2)}</div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Earnings calculation */}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Revenue ({selectedSizes['25']}):</span>
                              <span className="text-green-300">${getActualPrice(25, selectedSizes['25']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost to Fulfill:</span>
                              <span className="text-red-300">-${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).totalCosts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Your Earnings:</span>
                              <span className="text-green-400">+${calculateProfit(25, selectedSizes['25']).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Your Profit %:</span>
                              <span className="text-blue-300">{((calculateProfit(25, selectedSizes['25']) / getActualPrice(25, selectedSizes['25'])) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Average Profit Margin */}
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm font-medium text-purple-300">Average Profit Margin</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-200">
                          {(() => {
                            const allCombinations = [
                              { qty: 1, sizes: ['3"', '4"', '5"'] },
                              { qty: 5, sizes: ['3"', '4"', '5"'] },
                              { qty: 10, sizes: ['3"', '4"', '5"'] },
                              { qty: 25, sizes: ['3"', '4"', '5"'] }
                            ];
                            
                            let totalProfitMargin = 0;
                            let combinationCount = 0;
                            
                            allCombinations.forEach(({ qty, sizes }) => {
                              sizes.forEach(size => {
                                const revenue = getActualPrice(qty, size);
                                const profit = calculateProfit(qty, size);
                                const profitMargin = (profit / revenue) * 100;
                                totalProfitMargin += profitMargin;
                                combinationCount++;
                              });
                            });
                            
                            return (totalProfitMargin / combinationCount).toFixed(1);
                          })()}%
                        </div>
                        <div className="text-xs text-purple-300">Across all quantity/size options</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'payments' && (
              <div className="p-6">
                <StripeConnectOnboarding userId={user?.id} />
              </div>
            )}
          </div>
    </div>
  );
}