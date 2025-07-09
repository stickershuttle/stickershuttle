import React, { useState } from 'react';
import Link from 'next/link';
import AnimatedCreditCounter from '../../AnimatedCreditCounter';
import AIFileImage from '../../AIFileImage';
// import OrderItemFileUpload from '../../OrderItemFileUpload';

// Define the props interface
interface DefaultViewProps {
  // State props
  showOrderCompleteMessage: boolean;
  setShowOrderCompleteMessage: (value: boolean) => void;
  profile: any;
  setProfile: (value: any) => void;
  showAnimatedCounter: boolean;
  creditNotifications: any[];
  previousCreditBalance: number;
  creditBalance: number;
  showCreditNotification: boolean;
  currentView: string;
  setCurrentView: (view: string) => void;
  reorderingId: string | null;
  selectedDesignImage: string | null;
  setSelectedDesignImage: (image: string | null) => void;
  
  // Data props
  orders: any[];
  
  // Handler functions
  handleAnimatedCounterComplete: () => void;
  handleDismissCreditNotification: () => void;
  handleReorder: (orderId: string) => void;
  refreshOrders: () => void;
  
  // Helper functions
  getOrderDisplayNumber: (order: any) => string;
  getProductImage: (item: any, itemData?: any) => string | null;
  getStatusColor: (status: string) => string;
  getStatusDisplayText: (status: string) => string;
  isOrderShippedWithTracking: (order: any) => boolean;
  renderOrderProgressTracker: (order: any) => React.JSX.Element;
  handleViewOrderDetails: (order: any) => void;
  handleTrackOrder: (order: any) => void;
}

const DefaultView: React.FC<DefaultViewProps> = ({
  showOrderCompleteMessage,
  setShowOrderCompleteMessage,
  profile,
  setProfile,
  showAnimatedCounter,
  creditNotifications,
  previousCreditBalance,
  creditBalance,
  showCreditNotification,
  currentView,
  setCurrentView,
  reorderingId,
  selectedDesignImage,
  setSelectedDesignImage,
  orders,
  handleAnimatedCounterComplete,
  handleDismissCreditNotification,
  handleReorder,
  refreshOrders,
  getOrderDisplayNumber,
  getProductImage,
  getStatusColor,
  getStatusDisplayText,
  isOrderShippedWithTracking,
  renderOrderProgressTracker,
  handleViewOrderDetails,
  handleTrackOrder,
}) => {
  // Pagination state for Recent Orders
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Calculate pagination values
  const totalOrders = orders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  // Default view content is rendered here
  return (
    <>
      {/* Order Completion Success Message */}
      {showOrderCompleteMessage && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/20 border-2 border-green-400/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <i className="fas fa-check text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-green-300 font-bold text-lg">🎉 Order Complete!</h3>
              <p className="text-green-200 text-sm">
                Your payment has been processed successfully. Your order will appear below shortly.
              </p>
            </div>
            <button
              onClick={() => setShowOrderCompleteMessage(false)}
              className="text-green-300 hover:text-green-100 transition-colors"
              title="Close notification"
              aria-label="Close order completion notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Proof Ready Alert */}
      {orders.some((order: any) => order.proof_status === 'pending_customer_approval' && order.proofs?.some((proof: any) => proof.status === 'pending_customer_approval')) && (
        <div 
          className="mb-6 rounded-2xl overflow-hidden animate-pulse"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">📋 Proof Ready for Review!</h3>
                  <p className="text-red-300 text-sm">Your proof is ready for approval. Please review and approve to start production.</p>
                </div>
              </div>
              
              <button
                onClick={() => setCurrentView('proofs')}
                className="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                Review Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wholesale Approval Message */}
      {profile?.wholesale_status === 'approved' && (
        <div 
          className="mb-6 p-4 rounded-xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.5) 0%, rgba(251, 146, 60, 0.35) 50%, rgba(254, 215, 170, 0.2) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            boxShadow: 'rgba(249, 115, 22, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-orange-200 font-bold text-lg">🎉 Wholesale Account Approved!</h3>
              <p className="text-orange-100 text-sm">
                Congratulations! Your wholesale account has been approved. You now earn 2.5% store credit on all orders.
              </p>
            </div>
            <button
              onClick={() => {
                // Update user profile to mark they've seen the message
                setProfile((prev: any) => ({ ...prev, wholesale_status: 'approved_seen' }));
              }}
              className="text-orange-200 hover:text-orange-100 transition-colors"
              title="Close notification"
              aria-label="Close wholesale approval notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
      
      {/* Animated Credit Counter */}
      {showAnimatedCounter && creditNotifications.length > 0 && (
        <AnimatedCreditCounter
          previousBalance={previousCreditBalance}
          newBalance={creditBalance}
          amountAdded={creditNotifications.reduce((sum, n) => sum + n.amount, 0)}
          reason={creditNotifications.length === 1 ? creditNotifications[0].reason : undefined}
          onAnimationComplete={handleAnimatedCounterComplete}
        />
      )}
      
      {/* Credit Notification (fallback for when animation isn't triggered) */}
      {showCreditNotification && creditNotifications.length > 0 && (
        <>
          {creditNotifications.some(n => n.type === 'credit_limit_warning') ? (
            // Credit Limit Warning Notification
            <div className="mb-6 p-4 rounded-xl animate-pulse" style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(248, 113, 113, 0.35) 50%, rgba(254, 202, 202, 0.2) 100%)',
              backdropFilter: 'blur(25px) saturate(200%)',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
            }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-red-300 font-bold text-lg">Credit Limit Reached!</h3>
                  <p className="text-red-200 text-sm">
                    You've reached your $100.00 credit limit. Please use your existing credits on future orders.
                  </p>
                  <p className="text-red-200 text-xs mt-1">
                    You will not earn additional credits until you spend some of your current balance.
                  </p>
                </div>
                <button
                  onClick={handleDismissCreditNotification}
                  className="text-red-300 hover:text-red-100 transition-colors"
                  title="Close notification"
                  aria-label="Close credit notification"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ) : (
            // Regular Credit Added Notification
            <div className="mb-6 p-4 rounded-xl animate-pulse" style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
              backdropFilter: 'blur(25px) saturate(200%)',
              border: '2px solid rgba(255, 215, 0, 0.6)',
              boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
            }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <div className="flex-1">
                  <h3 className="text-yellow-300 font-bold text-lg">Store Credit Added!</h3>
                  <p className="text-yellow-200 text-sm">
                    You've received <span className="font-bold">${creditNotifications.reduce((sum, n) => sum + n.amount, 0).toFixed(2)}</span> in store credit!
                  </p>
                  {creditNotifications.length === 1 && creditNotifications[0].reason && (
                    <p className="text-yellow-200 text-xs mt-1">
                      Reason: {creditNotifications[0].reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleDismissCreditNotification}
                  className="text-yellow-300 hover:text-yellow-100 transition-colors"
                  title="Close notification"
                  aria-label="Close credit notification"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Store Credit Display - Compact */}
      {creditBalance > 0 && (
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: creditBalance >= 100 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.6) 0%, rgba(248, 113, 113, 0.4) 25%, rgba(254, 202, 202, 0.25) 50%, rgba(239, 68, 68, 0.15) 75%, rgba(254, 202, 202, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(250, 204, 21, 0.6) 0%, rgba(255, 215, 0, 0.4) 25%, rgba(250, 204, 21, 0.25) 50%, rgba(255, 193, 7, 0.15) 75%, rgba(250, 204, 21, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(200%)',
            border: creditBalance >= 100 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 215, 0, 0.5)',
            boxShadow: creditBalance >= 100 
              ? 'rgba(239, 68, 68, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
              : 'rgba(250, 204, 21, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
          }}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{creditBalance >= 100 ? '🚨' : <i className="fas fa-coins text-yellow-400"></i>}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    ${creditBalance.toFixed(2)} Store Credit
                  </h3>
                  <p className={`text-sm ${creditBalance >= 100 ? 'text-red-300' : 'text-yellow-300'}`}>
                    {creditBalance >= 100 ? 'Limit reached ($100.00)' : 'Available to use'}
                  </p>
                  {creditBalance >= 100 && (
                    <p className="text-red-200 text-xs mt-1">
                      Spend credits to earn more on future orders
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/products'}
                className="px-3 md:px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
                style={{
                  background: creditBalance >= 100 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(248, 113, 113, 0.35) 50%, rgba(254, 202, 202, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
                  backdropFilter: 'blur(25px) saturate(200%)',
                  border: creditBalance >= 100 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 215, 0, 0.6)',
                  boxShadow: creditBalance >= 100 
                    ? 'rgba(239, 68, 68, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                    : 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                }}
              >
                <svg className="w-3 md:w-4 h-3 md:h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="text-xs md:text-sm">Use Credits</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Deals - Mobile: Swipeable, Desktop: Grid */}
      <div className="mt-3 lg:mt-0">
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🎯 Current Deals
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                  Limited Time
                </span>
              </h2>
            </div>
          </div>
          <div className="p-6">
          
          {/* Mobile: Horizontal Scroll */}
          <div className="lg:hidden">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 max-w-full">
              {/* Deal 1 - Reorder Discount */}
              <button 
                onClick={() => setCurrentView('all-orders')}
                className="flex-shrink-0 w-64 rounded-lg p-3 border border-yellow-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                    10% OFF
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Reorder Special
                    </p>
                    <p className="text-xs text-gray-300">10% off any repeat order</p>
                  </div>
                </div>
              </button>

              {/* Deal 2 - Free Next-Day Shipping */}
              <Link href="/products">
                <div className="flex-shrink-0 w-64 rounded-lg p-3 border border-green-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                     style={{ 
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                      FREE
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#10b981' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                        Next-Day Shipping
                      </p>
                      <p className="text-xs text-gray-300">1,000+ stickers</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Deal 3 - Holographic Discount */}
              <Link href="/products/holographic-stickers">
                <div className="flex-shrink-0 w-64 rounded-lg p-3 border border-purple-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                     style={{ 
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                      20% OFF
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">✨ Holographic</p>
                      <p className="text-xs text-gray-300">All holographic stickers</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {/* Deal 1 - Reorder Discount */}
            <button 
              onClick={() => setCurrentView('all-orders')}
              className="rounded-lg p-3 border border-yellow-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                  10% OFF
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Reorder Special
                  </p>
                  <p className="text-xs text-gray-300">10% off any repeat order</p>
                </div>
              </div>
            </button>

            {/* Deal 2 - Free Next-Day Shipping */}
            <Link href="/products">
              <div className="rounded-lg p-3 border border-green-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                    FREE
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#10b981' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      Next-Day Shipping
                    </p>
                    <p className="text-xs text-gray-300">1,000+ stickers</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Deal 3 - Holographic Discount */}
            <Link href="/products/holographic-stickers">
              <div className="rounded-lg p-3 border border-purple-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                    20% OFF
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">✨ Holographic</p>
                    <p className="text-xs text-gray-300">All holographic stickers</p>
                  </div>
                </div>
              </div>
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reorder - PRIORITY 2 */}
      {(() => {
        const lastDeliveredOrder = orders.filter(order => order.status === 'Delivered')[0];
        return lastDeliveredOrder ? (
          <div 
            className="rounded-2xl overflow-hidden mb-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Quick Reorder
                </h2>
                <div className="text-xs font-bold px-3 py-1 rounded-full"
                     style={{
                       background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                       color: '#030140'
                     }}>
                  10% OFF
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-lg p-4"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)'
                   }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">Your Last Order - Mission {getOrderDisplayNumber(lastDeliveredOrder)}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lastDeliveredOrder.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-300">Qty: {item.quantity} • ${item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <p className="text-sm text-gray-300">
                        Original: <span className="line-through">${lastDeliveredOrder.total}</span>
                      </p>
                      <p className="text-sm font-bold text-white">
                        With 10% off: <span style={{ color: '#ffd713' }}>${(lastDeliveredOrder.total * 0.9).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleReorder(lastDeliveredOrder.id)}
                      disabled={reorderingId === lastDeliveredOrder.id}
                      className="px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                      style={{
                        backgroundColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#ffd713',
                        color: '#030140',
                        boxShadow: reorderingId === lastDeliveredOrder.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#e6c211'
                      }}
                    >
                      {reorderingId === lastDeliveredOrder.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          🔄 Reorder Now
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-400 text-center">Save 10% • Same Great Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Active Orders - Excel-Style Table */}
      {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length > 0 ? (
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px dashed rgba(249, 115, 22, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.1), inset 0 0 20px rgba(249, 115, 22, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔥 Active Orders
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                  {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length}
                </span>
              </h2>
              <button 
                onClick={() => setCurrentView('all-orders')}
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200 text-sm"
              >
                View All →
              </button>
            </div>
          </div>
          
          {/* Table Header - Desktop Only */}
          <div className="hidden md:block px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="grid grid-cols-16 gap-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <div className="col-span-3">Preview</div>
              <div className="col-span-2">ORDER #</div>
              <div className="col-span-4">Items</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-3">Actions</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').map((order) => {
              return (
                <div key={order.id}>
                  <div className="px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                    {/* Desktop Row Layout */}
                    <div className="hidden md:grid grid-cols-16 gap-4 items-center">
                      
                      {/* Preview Column */}
                      <div className="col-span-3">
                        <div className="flex gap-2 flex-wrap">
                                                     {order.items.map((item: any, index: number) => {
                             const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                             const productImage = getProductImage(item, itemData);
                             
                             return (
                               <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                {productImage && productImage.trim() !== '' ? (
                                  <div 
                                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105 relative"
                                    onClick={() => {
                                      setSelectedDesignImage(productImage);
                                      setCurrentView('design-vault');
                                    }}
                                    title={`Click to view ${item.name} in Design Vault`}
                                  >
                                    <AIFileImage
                                      src={productImage}
                                      filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                      alt={item.name}
                                      className="max-w-full max-h-full object-contain rounded"
                                      size="thumbnail"
                                      showFileType={false}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 overflow-hidden">
                                    <img 
                                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                      alt="No file uploaded"
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Order Column */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white text-sm">
                          {getOrderDisplayNumber(order)}
                        </div>
                      </div>

                      {/* Items Column */}
                      <div className="col-span-4">
                        <div className="space-y-1">
                          {(() => {
                            // Group items by product name
                            const groupedItems = order.items.reduce((acc: any, item: any) => {
                              const productName = item.name || item.productName;
                              if (!acc[productName]) {
                                acc[productName] = {
                                  name: productName,
                                  totalQuantity: 0
                                };
                              }
                              acc[productName].totalQuantity += item.quantity;
                              return acc;
                            }, {});

                            return Object.values(groupedItems).map((groupedItem: any, index: number) => (
                              <div key={index} className="text-sm text-white">
                                {groupedItem.totalQuantity} {groupedItem.name}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Date Column */}
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Total Column */}
                      <div className="col-span-2">
                        <div className="text-sm font-semibold text-white">
                          ${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="col-span-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            View Details
                          </button>
                          <button
                            onClick={() => handleReorder(order.id)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                          {isOrderShippedWithTracking(order) && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              Track Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-base">
                            {getOrderDisplayNumber(order)}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            ${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}
                          </div>
                        </div>

                                                 <div className="flex gap-2 flex-wrap">
                           {order.items.map((item: any, index: number) => {
                             const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                             const productImage = getProductImage(item, itemData);

                             return (
                               <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                {productImage && productImage.trim() !== '' ? (
                                  <AIFileImage
                                    src={productImage}
                                    filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    size="thumbnail"
                                    showFileType={false}
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-lg overflow-hidden">
                                    <img 
                                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                      alt="No file uploaded"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleReorder(order.id)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            Reorder
                          </button>
                          {isOrderShippedWithTracking(order) && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              Track Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracker Subrow */}
                  {renderOrderProgressTracker(order)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State for No Active Orders */
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔥 Active Orders
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                  0
                </span>
              </h2>
            </div>
          </div>
          
          <div className="px-6 py-8 text-center">
            <h3 className="text-white text-lg font-semibold mb-2">There are no active orders</h3>
            <p className="text-gray-400 text-sm mb-6">Ready to create something amazing? Start your first order!</p>
            <button
              onClick={() => window.location.href = '/products'}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Quick Order Section - Sticker Types */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">🚀 Quick Order</h2>
          <Link 
            href="/products"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            View All Products →
          </Link>
        </div>
        
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Vinyl Stickers */}
          <Link href="/products/vinyl-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                  alt="Vinyl Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(168, 242, 106, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Vinyl →</h3>
            </div>
          </Link>

          {/* Holographic Stickers */}
          <Link href="/products/holographic-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                  alt="Holographic Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">Holographic →</h3>
            </div>
          </Link>

          {/* Glitter Stickers */}
          <Link href="/products/glitter-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                  alt="Glitter Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Glitter →</h3>
            </div>
          </Link>

          {/* Chrome Stickers */}
          <Link href="/products/chrome-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                  alt="Chrome Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-gray-300 transition-colors">Chrome →</h3>
            </div>
          </Link>

          {/* Sticker Sheets */}
          <Link href="/products/sticker-sheets">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                  alt="Sticker Sheets" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Sheets →</h3>
            </div>
          </Link>
        </div>

        {/* Mobile Scrollable */}
        <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-6 md:px-4 max-w-full">
          <div className="flex space-x-3 w-max">
            {/* Vinyl Mobile */}
            <Link href="/products/vinyl-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Vinyl →</h3>
              </div>
            </Link>

            {/* Holographic Mobile */}
            <Link href="/products/holographic-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Holographic →</h3>
              </div>
            </Link>

            {/* Glitter Mobile */}
            <Link href="/products/glitter-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Glitter →</h3>
              </div>
            </Link>

            {/* Chrome Mobile */}
            <Link href="/products/chrome-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Chrome →</h3>
              </div>
            </Link>

            {/* Sheets Mobile */}
            <Link href="/products/sticker-sheets">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sheets" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Sheets →</h3>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Section with Pagination */}
      {orders.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">📦 Recent Orders</h2>
            <button 
              onClick={() => setCurrentView('all-orders')}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
            >
              View All ({totalOrders}) →
            </button>
          </div>
          
          {/* Orders List */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Table Header - Desktop Only */}
            <div className="hidden md:block px-6 py-3 border-b border-white/10 bg-white/5">
              <div className="grid grid-cols-16 gap-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <div className="col-span-3">Preview</div>
                <div className="col-span-2">ORDER #</div>
                <div className="col-span-4">Items</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-3">Actions</div>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-white/5">
              {currentOrders.map((order) => (
                <div key={order.id}>
                  <div className="px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                    {/* Desktop Row Layout */}
                    <div className="hidden md:grid grid-cols-16 gap-4 items-center">
                      
                      {/* Preview Column */}
                      <div className="col-span-3">
                        <div className="flex gap-2 flex-wrap">
                          {order.items.map((item: any, index: number) => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            const productImage = getProductImage(item, itemData);
                            
                            return (
                              <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                {productImage && productImage.trim() !== '' ? (
                                  <div 
                                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105 relative"
                                    onClick={() => {
                                      setSelectedDesignImage(productImage);
                                      setCurrentView('design-vault');
                                    }}
                                    title={`Click to view ${item.name} in Design Vault`}
                                  >
                                    <AIFileImage
                                      src={productImage}
                                      filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                      alt={item.name}
                                      className="max-w-full max-h-full object-contain rounded"
                                      size="thumbnail"
                                      showFileType={false}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 overflow-hidden">
                                    <img 
                                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                      alt="No file uploaded"
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Order Column */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white text-sm">
                          {getOrderDisplayNumber(order)}
                        </div>
                      </div>

                      {/* Items Column */}
                      <div className="col-span-4">
                        <div className="space-y-1">
                          {(() => {
                            const groupedItems = order.items.reduce((acc: any, item: any) => {
                              const productName = item.name || item.productName;
                              if (!acc[productName]) {
                                acc[productName] = {
                                  name: productName,
                                  totalQuantity: 0
                                };
                              }
                              acc[productName].totalQuantity += item.quantity;
                              return acc;
                            }, {});

                            return Object.values(groupedItems).map((groupedItem: any, index: number) => (
                              <div key={index} className="text-sm text-white">
                                {groupedItem.totalQuantity} {groupedItem.name}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Date Column */}
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Total Column */}
                      <div className="col-span-2">
                        <div className="text-sm font-semibold text-white">
                          ${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="col-span-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            View Details
                          </button>
                          <button
                            onClick={() => handleReorder(order.id)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                          {isOrderShippedWithTracking(order) && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              Track Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-base">
                            {getOrderDisplayNumber(order)}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            ${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {order.items.map((item: any, index: number) => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            const productImage = getProductImage(item, itemData);

                            return (
                              <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                {productImage && productImage.trim() !== '' ? (
                                  <AIFileImage
                                    src={productImage}
                                    filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    size="thumbnail"
                                    showFileType={false}
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-lg overflow-hidden">
                                    <img 
                                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                                      alt="No file uploaded"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleReorder(order.id)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            Reorder
                          </button>
                          {isOrderShippedWithTracking(order) && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              Track Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracker Subrow */}
                  {renderOrderProgressTracker(order)}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalOrders)} of {totalOrders} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: currentPage === 1 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                        color: 'white'
                      }}
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 ${
                            currentPage === page ? 'text-white' : 'text-gray-400'
                          }`}
                          style={{
                            background: currentPage === page 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                        color: 'white'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DefaultView; 