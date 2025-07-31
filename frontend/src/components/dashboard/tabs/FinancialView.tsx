import React, { ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER_CREDIT_HISTORY } from '../../../lib/credit-mutations';
// import OrderItemFileUpload from '../../OrderItemFileUpload';

interface FinancialViewProps {
  orders: any[];
  creditBalance: number;
  sellingPrices: {[orderId: string]: number};
  setSellingPrices: React.Dispatch<React.SetStateAction<{[orderId: string]: number}>>;
  reorderingId: string | null;
  user: any;
  setCurrentView: (view: string) => void;
  handleReorder: (orderId: string) => Promise<void>;
  getOrderDisplayNumber: (order: any) => any;
  refreshOrders: () => void;
  handleViewOrderDetails?: (order: any) => void;
}

const FinancialView: React.FC<FinancialViewProps> = ({
  orders,
  creditBalance,
  sellingPrices,
  setSellingPrices,
  reorderingId,
  user,
  setCurrentView,
  handleReorder,
  getOrderDisplayNumber,
  refreshOrders,
  handleViewOrderDetails
}) => {
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
  
  // Get credit history for earned points
  const { data: creditHistoryData } = useQuery(GET_USER_CREDIT_HISTORY, {
    variables: { userId: user?.id },
    skip: !user?.id
  });
  
  // Filter for earned credits (positive amounts from orders)
  const earnedCredits = creditHistoryData?.getUserCreditHistory?.filter((transaction: any) => 
    transaction.amount > 0 && transaction.transactionType === 'earned'
  ) || [];

  // Points view state (earned or spent)
  const [pointsView, setPointsView] = useState<'earned' | 'spent'>('earned');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Filter credits based on view
  const spentCredits = creditHistoryData?.getUserCreditHistory?.filter((transaction: any) => 
    transaction.amount < 0 && transaction.transactionType === 'deducted'
  ) || [];
  
  const currentViewCredits = pointsView === 'earned' ? earnedCredits : spentCredits;
  
  // Calculate pagination
  const totalPages = Math.ceil(currentViewCredits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCredits = currentViewCredits.slice(startIndex, endIndex);
  
  // Check if user is wholesale (assuming user object has profile info)
  const isWholesale = user?.profile?.isWholesaleCustomer || user?.isWholesaleCustomer || false;
  const cashbackRate = isWholesale ? '2.5%' : '5%';
  
  // Reset pagination when credit data or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentViewCredits.length, pointsView]);
  
  // Calculate monthly spending data
  const monthlyData: { [key: string]: number } = {};
  orders.forEach(order => {
    const date = new Date(order.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + order.total;
  });

  // Get current date and generate last 12 months
  const currentDate = new Date();
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    last12Months.push({
      key: monthKey,
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      fullMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      total: monthlyData[monthKey] || 0
    });
  }

  // Find max value for scaling line graph
  const maxSpending = Math.max(...last12Months.map(d => d.total), 1); // Minimum 1 to avoid division by 0
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="12" width="4" height="9" rx="2"/>
            <rect x="10" y="6" width="4" height="15" rx="2"/>
            <rect x="17" y="9" width="4" height="12" rx="2"/>
          </svg>
          Finances
        </h2>
        <button
          onClick={() => setCurrentView('default')}
          className="hidden md:block text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 text-center"
             style={{
               background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
               backdropFilter: 'blur(25px) saturate(200%)',
               border: '1px solid rgba(255, 215, 0, 0.6)',
               boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset',
               borderRadius: '16px'
             }}>
          <h3 className="text-yellow-300 text-sm font-medium flex items-center justify-center gap-2">
            <img 
              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
              alt="Credits" 
              className="w-4 h-4 object-contain"
            />
            <span>Store Credit</span>
          </h3>
          <p className="text-white text-2xl font-bold">${creditBalance.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center"
             style={{
               background: 'rgba(255, 255, 255, 0.05)',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
               backdropFilter: 'blur(12px)',
               borderRadius: '16px'
             }}>
          <h3 className="text-blue-300 text-sm font-medium">Invested</h3>
          <p className="text-white text-2xl font-bold">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center"
             style={{
               background: 'rgba(255, 255, 255, 0.05)',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
               backdropFilter: 'blur(12px)',
               borderRadius: '16px'
             }}>
          <h3 className="text-green-300 text-sm font-medium">Average Order</h3>
          <p className="text-white text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center"
             style={{
               background: 'rgba(255, 255, 255, 0.05)',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
               backdropFilter: 'blur(12px)',
               borderRadius: '16px'
             }}>
          <h3 className="text-purple-300 text-sm font-medium">Total Orders</h3>
          <p className="text-white text-2xl font-bold">{orders.length}</p>
        </div>
      </div>

      {/* Monthly Spending Bar Chart */}
      <div className="container-style p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i className="fas fa-chart-bar text-blue-400"></i>
          Monthly Spending (12 Months)
        </h3>
        
        {last12Months.some((d: any) => d.total > 0) ? (
          <div className="relative" style={{ height: '320px' }}>
            {/* Bar Chart Container */}
            <div className="h-full relative">
              {/* Y-axis grid lines and labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[100, 75, 50, 25, 0].map((percent) => (
                  <div key={percent} className="flex items-center">
                    <span className="text-xs text-gray-400 w-12 text-right pr-2">
                      ${((maxSpending * percent) / 100).toFixed(0)}
                    </span>
                    <div className="flex-1 border-t border-white/5"></div>
                  </div>
                ))}
              </div>
              
              {/* Bars */}
              <div className="h-full flex items-end justify-between px-14 pb-8 pt-4">
                {last12Months.map((month, index) => {
                  const heightPercent = maxSpending > 0 ? (month.total / maxSpending) * 100 : 0;
                  return (
                    <div key={month.key} className="flex-1 flex flex-col items-center justify-end mx-1 group">
                      <div className="relative w-full">
                        {/* Hover tooltip */}
                        {month.total > 0 && (
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              ${month.total.toFixed(2)}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1">
                              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Bar */}
                        <div 
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                          style={{ 
                            height: `${Math.max(heightPercent * 2.5, month.total > 0 ? 8 : 0)}px`,
                            boxShadow: month.total > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                          }}
                        ></div>
                      </div>
                      
                      {/* Month label */}
                      <span className="text-xs text-gray-400 mt-2">{month.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-chart-line text-gray-500 text-4xl mb-4"></i>
            <p className="text-gray-400">No spending data available yet</p>
            <p className="text-gray-500 text-sm">Make your first order to see monthly spending trends</p>
          </div>
        )}
      </div>

      {/* ROI Calculator */}
      <div className="container-style p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i className="fas fa-calculator text-green-400"></i>
          ROI Calculator
        </h3>
        
        {orders.length > 0 ? (
          <div className="space-y-6">
            {/* Get most recent order for calculator */}
            {(() => {
              const recentOrder = orders[0]; // Most recent order
              if (!recentOrder) return null;
              
              // Calculate metrics for recent order
              const totalQuantity = recentOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              const costPerUnit = recentOrder.total / totalQuantity;
              const suggestedSellingPrice = costPerUnit * 3; // 3x markup
              
              // Calculate actual ROI if selling price is provided
              const actualSellingPrice = sellingPrices[recentOrder.id] || 0;
              const actualRevenue = actualSellingPrice * totalQuantity;
              const actualProfit = actualRevenue - recentOrder.total;
              const actualROI = recentOrder.total > 0 ? ((actualProfit / recentOrder.total) * 100) : 0;
              
              // Get the first item with an image
              let firstImage = null;
              let firstName = '';
              for (const item of recentOrder.items) {
                const itemData = recentOrder._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                if (itemData.customFiles?.[0] || itemData.image || item.customFiles?.[0] || item.image) {
                  firstImage = itemData.customFiles?.[0] || itemData.image || item.customFiles?.[0] || item.image;
                  firstName = itemData.name || item.name || 'Custom Sticker';
                  break;
                }
              }

              return (
                <div>
                  {/* Recent Order Display */}
                  <div className="rounded-2xl mb-6"
                       style={{
                         background: 'rgba(255, 255, 255, 0.05)',
                         border: '1px solid rgba(255, 255, 255, 0.1)',
                         boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Preview Image */}
                        <div className="flex-shrink-0">
                          {firstImage ? (
                            <div className="w-20 h-20 rounded-lg bg-white/10 border border-white/20 p-2 flex items-center justify-center">
                              <img 
                                src={firstImage} 
                                alt={firstName}
                                className="max-w-full max-h-full object-contain rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-white/10 border border-white/20 overflow-hidden">
                              <img 
                                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                alt="No file uploaded"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Order Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white text-lg">
                              Mission {getOrderDisplayNumber(recentOrder)}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {new Date(recentOrder.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Items</p>
                              <p className="text-white font-medium">{recentOrder.items.length} {recentOrder.items.length === 1 ? 'style' : 'styles'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Quantity</p>
                              <p className="text-white font-medium">{totalQuantity} stickers</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Cost per unit</p>
                              <p className="text-white font-medium">${costPerUnit.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total cost</p>
                              <p className="text-white font-medium">${recentOrder.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Selling Price Input */}
                      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <label className="block text-sm font-medium text-blue-300 mb-3">
                          What are you selling each sticker for?
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="text-white text-lg">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={suggestedSellingPrice.toFixed(2)}
                            value={sellingPrices[recentOrder.id] || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setSellingPrices(prev => ({
                                ...prev,
                                [recentOrder.id]: value
                              }));
                            }}
                            className="flex-1 px-6 md:px-4 py-3 rounded-lg border bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none text-lg"
                          />
                          <span className="text-gray-400">per sticker</span>
                        </div>
                        
                        {/* Real-time calculations */}
                        {actualSellingPrice > 0 && (
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-green-300 mb-1">Revenue</p>
                              <p className="text-white font-bold text-lg">${actualRevenue.toFixed(2)}</p>
                            </div>
                            <div className={`text-center p-3 rounded-lg ${actualProfit >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                              <p className={`text-xs mb-1 ${actualProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>Profit</p>
                              <p className={`font-bold text-lg ${actualProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
                                {actualProfit >= 0 ? '+' : ''}${actualProfit.toFixed(2)}
                              </p>
                            </div>
                            <div className={`text-center p-3 rounded-lg ${actualROI >= 0 ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                              <p className={`text-xs mb-1 ${actualROI >= 0 ? 'text-purple-300' : 'text-red-300'}`}>ROI</p>
                              <p className={`font-bold text-lg ${actualROI >= 0 ? 'text-white' : 'text-red-300'}`}>
                                {actualROI.toFixed(0)}%
                              </p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-blue-300 mb-1">Margin</p>
                              <p className="text-white font-bold text-lg">
                                {actualRevenue > 0 ? ((actualProfit / actualRevenue) * 100).toFixed(0) : 0}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Price Suggestions */}
                      <div className="mt-4">
                        <p className="text-sm text-gray-400 mb-3">Quick pricing options:</p>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 1 }))}
                            className="p-3 rounded-lg border transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderColor: sellingPrices[recentOrder.id] === 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            <p className="text-xs text-gray-400 mb-1">Conservative</p>
                            <p className="text-white font-bold">$1.00</p>
                            <p className="text-xs text-gray-500">{costPerUnit > 1 ? 'Loss' : `+${((1 - costPerUnit) / costPerUnit * 100).toFixed(0)}%`}</p>
                          </button>
                          <button
                            onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 3 }))}
                            className="p-3 rounded-lg border transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              borderColor: sellingPrices[recentOrder.id] === 3 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)'
                            }}
                          >
                            <p className="text-xs text-green-300 mb-1 flex items-center gap-1">
                              <i className="fas fa-check"></i> Default
                            </p>
                            <p className="text-white font-bold">$3.00</p>
                            <p className="text-xs text-green-400">+{((3 - costPerUnit) / costPerUnit * 100).toFixed(0)}%</p>
                          </button>
                          <button
                            onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 5 }))}
                            className="p-3 rounded-lg border transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(168, 85, 247, 0.1)',
                              borderColor: sellingPrices[recentOrder.id] === 5 ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)'
                            }}
                          >
                            <p className="text-xs text-purple-300 mb-1">Aggressive</p>
                            <p className="text-white font-bold">$5.00</p>
                            <p className="text-xs text-purple-400">+{((5 - costPerUnit) / costPerUnit * 100).toFixed(0)}%</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-calculator text-gray-500 text-4xl mb-4"></i>
            <p className="text-gray-400">No orders available for ROI analysis</p>
            <p className="text-gray-500 text-sm">Place your first order to see profitability insights</p>
          </div>
        )}
      </div>

      {/* Points History */}
      <div className="container-style p-6">
        <div className="flex items-center gap-4 mb-6">
          {/* Points Earned Tab */}
          <button
            onClick={() => setPointsView('earned')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              pointsView === 'earned' 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              background: pointsView === 'earned' 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                : 'transparent',
              backdropFilter: pointsView === 'earned' ? 'blur(25px) saturate(180%)' : 'none',
              border: pointsView === 'earned' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: pointsView === 'earned' ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset' : 'none'
            }}
          >
          <img 
            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
            alt="Credits" 
            className="w-4 h-4 object-contain"
          />
            <span className="text-xl font-bold">Points Earned</span>
          </button>
          
          {/* Points Spent Tab */}
          <button
            onClick={() => setPointsView('spent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              pointsView === 'spent' 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              background: pointsView === 'spent' 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                : 'transparent',
              backdropFilter: pointsView === 'spent' ? 'blur(25px) saturate(180%)' : 'none',
              border: pointsView === 'spent' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: pointsView === 'spent' ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset' : 'none'
            }}
          >
            <img 
              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
              alt="Credits" 
              className="w-4 h-4 object-contain"
            />
            <span className="text-xl font-bold">Points Spent</span>
          </button>
        </div>
        
                 {currentViewCredits.length > 0 ? (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 text-center"
                   style={{
                     background: pointsView === 'earned' 
                       ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(250, 204, 21, 0.2) 50%, rgba(255, 193, 7, 0.1) 100%)'
                       : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(248, 113, 113, 0.2) 50%, rgba(252, 165, 165, 0.1) 100%)',
                     backdropFilter: 'blur(25px) saturate(200%)',
                     border: pointsView === 'earned' 
                       ? '1px solid rgba(255, 215, 0, 0.4)'
                       : '1px solid rgba(239, 68, 68, 0.4)',
                     boxShadow: pointsView === 'earned' 
                       ? 'rgba(250, 204, 21, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                       : 'rgba(239, 68, 68, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                     borderRadius: '16px'
                   }}>
                <h4 className={`text-sm font-medium ${pointsView === 'earned' ? 'text-yellow-300' : 'text-red-300'}`}>
                  Total {pointsView === 'earned' ? 'Earned' : 'Spent'}
                </h4>
                <p className="text-white text-2xl font-bold">
                  ${Math.abs(currentViewCredits.reduce((sum: number, credit: any) => sum + credit.amount, 0)).toFixed(2)}
                </p>
              </div>
              
              <div className="p-4 text-center"
                   style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)',
                     borderRadius: '16px'
                   }}>
                <h4 className="text-green-300 text-sm font-medium">
                  {pointsView === 'earned' ? 'Orders Rewarded' : 'Transactions'}
                </h4>
                <p className="text-white text-2xl font-bold">{currentViewCredits.length}</p>
              </div>
              
              <div className="p-4 text-center"
                   style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)',
                     borderRadius: '16px'
                   }}>
                <h4 className="text-purple-300 text-sm font-medium">
                  Avg Per {pointsView === 'earned' ? 'Order' : 'Transaction'}
                </h4>
                <p className="text-white text-2xl font-bold">
                  ${Math.abs((currentViewCredits.reduce((sum: number, credit: any) => sum + credit.amount, 0) / currentViewCredits.length)).toFixed(2)}
                </p>
              </div>
            </div>
            
                         {/* Credit history list */}
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <h4 className="text-lg font-semibold text-white">
                   Recent {pointsView === 'earned' ? 'Earnings' : 'Spending'}
                 </h4>
                 <p className="text-xs text-gray-400">
                   Showing {startIndex + 1}-{Math.min(endIndex, currentViewCredits.length)} of {currentViewCredits.length} transactions
                 </p>
               </div>
               <div className="space-y-2">
                 {currentCredits.map((credit: any, index: number) => {
                   // Find corresponding order for this credit
                   const relatedOrder = credit.orderId ? orders.find(order => order.id === credit.orderId) : null;
                   
                   return (
                     <div 
                       key={credit.id} 
                       className={`flex items-center justify-between px-6 py-3 rounded-lg transition-colors ${
                         pointsView === 'earned' 
                           ? 'bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/15' 
                           : 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15'
                       } ${
                         relatedOrder && handleViewOrderDetails ? 'cursor-pointer' : ''
                       }`}
                       onClick={() => relatedOrder && handleViewOrderDetails && handleViewOrderDetails(relatedOrder)}
                     >
                       <div className="flex items-center gap-3">
                         <img 
                           src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                           alt="Credits" 
                           className="w-5 h-5 object-contain"
                         />
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <p className="text-white font-medium">
                               {pointsView === 'earned' ? '+' : '-'}${Math.abs(credit.amount).toFixed(2)}
                             </p>
                             {relatedOrder && (
                               <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                                 Order #{getOrderDisplayNumber(relatedOrder)}
                               </span>
                             )}
                           </div>
                           <p className={`text-xs ${
                             pointsView === 'earned' ? 'text-yellow-300' : 'text-red-300'
                           }`}>
                             {credit.reason.replace(/ \(.*?%.*?\)/g, '')}
                           </p>
                           {relatedOrder && pointsView === 'earned' && (
                             <p className="text-gray-400 text-xs">
                               Order total: ${relatedOrder.total.toFixed(2)} • {Math.round((credit.amount / relatedOrder.total) * 100)}% store credit
                             </p>
                           )}
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-gray-300 text-sm">
                           {new Date(credit.createdAt).toLocaleDateString('en-US', { 
                             month: 'short', 
                             day: 'numeric',
                             year: 'numeric'
                           })}
                         </p>
                         <p className="text-gray-400 text-xs">
                           {new Date(credit.createdAt).toLocaleTimeString('en-US', { 
                             hour: '2-digit', 
                             minute: '2-digit'
                           })}
                         </p>
                       </div>
                     </div>
                   );
                 })}
               </div>
               
               {/* Pagination controls */}
               {totalPages > 1 && (
                 <div className="flex items-center justify-between pt-4 border-t border-white/10">
                   <button
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                     style={{
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       color: 'white'
                     }}
                   >
                     <i className="fas fa-chevron-left"></i>
                     Previous
                   </button>
                   
                   <div className="flex items-center gap-2">
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                       <button
                         key={page}
                         onClick={() => setCurrentPage(page)}
                         className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                           currentPage === page
                             ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                             : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                         }`}
                         style={{ border: '1px solid' }}
                       >
                         {page}
                       </button>
                     ))}
                   </div>
                   
                   <button
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                     className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                     style={{
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       color: 'white'
                     }}
                   >
                     Next
                     <i className="fas fa-chevron-right"></i>
                   </button>
                 </div>
               )}
             </div>
          </div>
        ) : (
        <div className="text-center py-12">
          <div className="mb-6">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                alt="Credits" 
                className="w-24 h-24 object-contain mx-auto mb-4 opacity-50"
              />
              <h4 className="text-xl font-semibold text-white mb-2">
                {pointsView === 'earned' ? 'Ready to Earn Points!' : 'No Points Spent Yet'}
              </h4>
            <p className="text-gray-300 mb-4">
                {pointsView === 'earned' ? (
                  <>
                    You'll earn <span className="text-yellow-400 font-semibold">{cashbackRate} store credit</span> on every future order
                  </>
                ) : (
                  <>
                    When you use your store credit, your spending history will appear here
                  </>
                )}
            </p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
                {pointsView === 'earned' 
                  ? 'Points earned from your next purchases will appear here. Start shopping to see your rewards stack up!'
                  : 'Use your earned store credit at checkout to see your spending activity here.'
                }
            </p>
          </div>
          
          {/* Info cards about the points system */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {pointsView === 'earned' ? (
                <>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <i className="fas fa-percentage text-yellow-400 text-xl mb-2"></i>
                    <p className="text-white font-semibold">{cashbackRate} Store Credit</p>
              <p className="text-xs text-yellow-300">On every order</p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <i className="fas fa-bolt text-green-400 text-xl mb-2"></i>
              <p className="text-white font-semibold">Instant Credit</p>
              <p className="text-xs text-green-300">Applied to balance</p>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <i className="fas fa-infinity text-blue-400 text-xl mb-2"></i>
              <p className="text-white font-semibold">No Expiry</p>
              <p className="text-xs text-blue-300">Credits never expire</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <i className="fas fa-shopping-cart text-red-400 text-xl mb-2"></i>
                    <p className="text-white font-semibold">Apply at Checkout</p>
                    <p className="text-xs text-red-300">Use your balance</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <i className="fas fa-history text-purple-400 text-xl mb-2"></i>
                    <p className="text-white font-semibold">Full History</p>
                    <p className="text-xs text-purple-300">Track all usage</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <i className="fas fa-balance-scale text-blue-400 text-xl mb-2"></i>
                    <p className="text-white font-semibold">Real-time Balance</p>
                    <p className="text-xs text-blue-300">Always accurate</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes barGrowVertical {
          from {
            height: 0%;
            opacity: 0;
            transform: scaleY(0);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }
        
        @keyframes lineGrow {
          from {
            stroke-dasharray: 0, 1000;
          }
          to {
            stroke-dasharray: 8, 4;
          }
        }
        
        @keyframes pointAppear {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes textAppear {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
};

export default FinancialView; 