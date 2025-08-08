import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CREATOR_BY_USER_ID, GET_CREATOR_SALES_STATS } from '../../../lib/profile-mutations';

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
}

interface CreatorStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  soldProducts: SoldProduct[];
  recentSales: RecentSale[];
}

export default function CreatorView({ user, profile, setCurrentView }: CreatorViewProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'sales'>('overview');

  // Get creator data
  const { data: creatorData, loading: creatorLoading } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  // Get creator sales stats
  const { data: salesData, loading: salesLoading } = useQuery(GET_CREATOR_SALES_STATS, {
    variables: { creatorId: creatorData?.getCreatorByUserId?.id },
    skip: !creatorData?.getCreatorByUserId?.id
  });

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

  if (!creatorData?.getCreatorByUserId) {
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

  const creator = creatorData.getCreatorByUserId;
  const stats: CreatorStats = salesData?.getCreatorSalesStats || {
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    soldProducts: [],
    recentSales: []
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
      <div className="w-full pt-4 sm:pt-6 xl:pt-8 pb-8">
        <div className="w-full px-4 sm:px-6 xl:px-8">
          {/* Header */}
          <div className="flex items-center gap-3 xl:gap-4 mb-6 xl:mb-8">
            <button
              onClick={() => setCurrentView('default')}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="h-5 w-5 xl:h-6 xl:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white truncate">
                Creator Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                Welcome back, {creator.creatorName}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 mb-6 xl:mb-8">
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
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Products Listed</div>
                  <div className="text-lg xl:text-2xl font-bold text-white">
                    {creator.totalProducts}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('products')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === 'products'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Top Products
            </button>
            <button
              onClick={() => setSelectedTab('sales')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === 'sales'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Recent Sales
            </button>
          </div>

          {/* Tab Content */}
          <div className="rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            {selectedTab === 'overview' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Creator Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Creator Since:</span>
                    <span className="text-white">{formatDate(creator.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      creator.isActive 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {creator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{creator.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Products in Marketplace:</span>
                    <span className="text-white">{creator.totalProducts}</span>
                  </div>
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
}