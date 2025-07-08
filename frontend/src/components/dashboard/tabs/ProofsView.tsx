import React from 'react';
import Link from 'next/link';
import AIFileImage from '../../AIFileImage';
import OrderItemFileUpload from '../../OrderItemFileUpload';

interface ProofsViewProps {
  orders: any[];
  selectedDesignImage: string | null;
  setSelectedDesignImage: (image: string | null) => void;
  replacementSent: { [key: string]: boolean };
  setCurrentView: (view: string) => void;
  renderProofReviewInterface: (order: any) => React.ReactNode;
  getOrderDisplayNumber: (order: any) => number | string;
  refreshOrders: () => void;
  getProductImage: (item: any, itemData: any) => string | null;
  isOrderShippedWithTracking: (order: any) => boolean;
  handleTrackOrder: (order: any) => void;
}

const ProofsView: React.FC<ProofsViewProps> = ({
  orders,
  selectedDesignImage,
  setSelectedDesignImage,
  replacementSent,
  setCurrentView,
  renderProofReviewInterface,
  getOrderDisplayNumber,
  refreshOrders,
  getProductImage
}) => {
  // More comprehensive filtering for proofs that need review
  const proofsToReview = orders.filter(order => {
    // Check if order has proofs available
    const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
    if (!hasProofs) return false;
    
    // Check individual proof statuses within the proofs array
    if (order.proofs && order.proofs.length > 0) {
      // Only exclude order if there are NO proofs that need review (pending/sent)
      const hasPendingProofs = order.proofs.some((proof: any) => 
        proof.status === 'pending' || proof.status === 'sent'
      );
      // If no proofs need review, exclude this order
      if (!hasPendingProofs) {
        return false;
      }
    }
    
    // Exclude orders that are already approved or have changes requested at order level
    if (order.proof_status === 'approved' || order.proof_status === 'changes_requested') {
      return false;
    }
    
    // Include orders with these statuses or proof statuses (more inclusive)
    return (
      order.status === 'Printing' ||
      order.proof_status === 'approved' ||
      order.proof_status === 'sent' ||
      (hasProofs && order.proof_sent_at && order.proof_status !== 'approved') ||
      // Include orders with pending proofs that need customer action
      (hasProofs && (order.proof_status === 'pending' || !order.proof_status))
    );
  });
  
  const printingOrders = orders.filter(order => {
    return (
      (order.status === 'Printing' || order.proof_status === 'approved') && 
      order.status !== 'Shipped' && 
      order.status !== 'Delivered' &&
      order.orderStatus !== 'Shipped' &&
      order.orderStatus !== 'Delivered'
    );
  });
  
  const shippedOrders = orders.filter(order => {
    const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
    return hasProofs && (
      order.status === 'Shipped' || 
      order.orderStatus === 'Shipped' ||
      order.fulfillmentStatus === 'shipped' ||
      (order.trackingNumber && order.orderStatus !== 'Delivered')
    );
  });
  
  const deliveredOrders = orders.filter(order => {
    const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
    return hasProofs && (
      order.status === 'Delivered' || 
      order.orderStatus === 'Delivered' ||
      order.fulfillmentStatus === 'fulfilled'
    );
  });
  
  const requestChanges = orders.filter(order => 
    (order.status === 'request-changes' || order.proof_status === 'changes_requested') && 
    ((order.proofs && order.proofs.length > 0) || order.proofUrl)
  );

  return (
    <div className="space-y-6">
      {/* Current Proofs Needing Review - Only show if there are proofs to review */}
      {proofsToReview.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            ⚠️ Requires Your Review
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full animate-pulse">
              {proofsToReview.length} pending
            </span>
          </h3>
          
          {proofsToReview.map((order) => (
            <div key={order.id} className="space-y-4">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-white">
                    Order {getOrderDisplayNumber(order)}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                </div>
              </div>

              {/* Full Proof Review Interface */}
              {renderProofReviewInterface(order)}
            </div>
          ))}
        </div>
      )}

      {/* In Production Orders */}
      {printingOrders.length > 0 && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Printing
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                {printingOrders.length} printing
              </span>
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {printingOrders.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-blue-400/30"
                     style={{
                       backgroundColor: 'rgba(59, 130, 246, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(59, 130, 246, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-xs text-blue-300">Printing</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                    {/* Show grid of all proofs if multiple designs, otherwise single image */}
                    {(order.proofs && order.proofs.length > 1) ? (
                      <div className={`w-full h-full grid gap-1 ${
                        order.proofs.length === 2 ? 'grid-cols-2' :
                        order.proofs.length === 3 ? 'grid-cols-3' :
                        order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                        order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                        'grid-cols-3 grid-rows-3'
                      }`}>
                        {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                          <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                            <AIFileImage 
                              src={proof.proofUrl} 
                              filename={proof.proofTitle || `design-${index + 1}.jpg`}
                              alt={`Design ${index + 1}`}
                              className="w-full h-full object-contain"
                              size="thumbnail"
                              showFileType={true}
                            />
                            {/* Design number badge */}
                            <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                        {/* Show "+X more" if there are more than 9 proofs */}
                        {order.proofs.length > 9 && (
                          <div className="bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-bold">
                              +{order.proofs.length - 9}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <AIFileImage 
                        src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : (order.proofUrl || '')} 
                        filename={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofTitle || 'design.jpg' : 'proof.jpg'}
                        alt="Approved Proof"
                        className="w-full h-full object-contain"
                        size="preview"
                        showFileType={true}
                      />
                    )}
                    {/* Reorder Badge */}
                    {(() => {
                      const isReorder = order.items?.some((item: any) => 
                        item._fullOrderData?.calculatorSelections?.isReorder === true ||
                        item._fullOrderData?.isReorder === true
                      ) || order._fullOrderData?.items?.some((item: any) => 
                        item.calculatorSelections?.isReorder === true ||
                        item.isReorder === true
                      );
                      return isReorder ? (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                          RE-ORDER
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-3">
                    <p className="text-blue-300 text-xs font-medium">✅ Proof Approved</p>
                    <p className="text-blue-200 text-xs">Your stickers are being printed!</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shipped Orders */}
      {shippedOrders.length > 0 && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              Shipped
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                {shippedOrders.length} shipped
              </span>
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shippedOrders.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-green-400/30"
                     style={{
                       backgroundColor: 'rgba(34, 197, 94, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(34, 197, 94, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-green-300">Shipped</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                    {/* Show grid of all proofs if multiple designs, otherwise single image */}
                    {(order.proofs && order.proofs.length > 1) ? (
                      <div className={`w-full h-full grid gap-1 ${
                        order.proofs.length === 2 ? 'grid-cols-2' :
                        order.proofs.length === 3 ? 'grid-cols-3' :
                        order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                        order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                        'grid-cols-3 grid-rows-3'
                      }`}>
                        {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                          <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                            <AIFileImage 
                              src={proof.proofUrl} 
                              filename={proof.proofTitle || `design-${index + 1}.jpg`}
                              alt={`Design ${index + 1}`}
                              className="w-full h-full object-contain"
                              size="thumbnail"
                              showFileType={true}
                            />
                            {/* Design number badge */}
                            <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                        {/* Show "+X more" if there are more than 9 proofs */}
                        {order.proofs.length > 9 && (
                          <div className="bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-bold">
                              +{order.proofs.length - 9}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <AIFileImage 
                        src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : (order.proofUrl || '')} 
                        filename={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofTitle || 'design.jpg' : 'proof.jpg'}
                        alt="Approved Proof"
                        className="w-full h-full object-contain"
                        size="preview"
                        showFileType={true}
                      />
                    )}
                    {/* Reorder Badge */}
                    {(() => {
                      const isReorder = order.items?.some((item: any) => 
                        item._fullOrderData?.calculatorSelections?.isReorder === true ||
                        item._fullOrderData?.isReorder === true
                      ) || order._fullOrderData?.items?.some((item: any) => 
                        item.calculatorSelections?.isReorder === true ||
                        item.isReorder === true
                      );
                      return isReorder ? (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                          RE-ORDER
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 mb-3">
                    <p className="text-green-300 text-xs font-medium">
                      <svg className="w-4 h-4 inline mr-1" fill="white" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      Shipped
                    </p>
                    <p className="text-green-200 text-xs">Your stickers have been shipped!</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delivered Orders */}
      {deliveredOrders.length > 0 && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="white" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Delivered
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                {deliveredOrders.length} delivered
              </span>
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveredOrders.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-purple-400/30"
                     style={{
                       backgroundColor: 'rgba(168, 85, 247, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(168, 85, 247, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                      <span className="text-xs text-purple-300">Delivered</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                    {/* Show grid of all proofs if multiple designs, otherwise single image */}
                    {(order.proofs && order.proofs.length > 1) ? (
                      <div className={`w-full h-full grid gap-1 ${
                        order.proofs.length === 2 ? 'grid-cols-2' :
                        order.proofs.length === 3 ? 'grid-cols-3' :
                        order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                        order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                        'grid-cols-3 grid-rows-3'
                      }`}>
                        {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                          <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                            <AIFileImage 
                              src={proof.proofUrl} 
                              filename={proof.proofTitle || `design-${index + 1}.jpg`}
                              alt={`Design ${index + 1}`}
                              className="w-full h-full object-contain"
                              size="thumbnail"
                              showFileType={true}
                            />
                            {/* Design number badge */}
                            <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                        {/* Show "+X more" if there are more than 9 proofs */}
                        {order.proofs.length > 9 && (
                          <div className="bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-bold">
                              +{order.proofs.length - 9}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <AIFileImage 
                        src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : (order.proofUrl || '')} 
                        filename={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofTitle || 'design.jpg' : 'proof.jpg'}
                        alt="Approved Proof"
                        className="w-full h-full object-contain"
                        size="preview"
                        showFileType={true}
                      />
                    )}
                    {/* Reorder Badge */}
                    {(() => {
                      const isReorder = order.items?.some((item: any) => 
                        item._fullOrderData?.calculatorSelections?.isReorder === true ||
                        item._fullOrderData?.isReorder === true
                      ) || order._fullOrderData?.items?.some((item: any) => 
                        item.calculatorSelections?.isReorder === true ||
                        item.isReorder === true
                      );
                      return isReorder ? (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                          RE-ORDER
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 mb-3">
                    <p className="text-purple-300 text-xs font-medium">
                      <svg className="w-4 h-4 inline mr-1" fill="white" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Delivered
                    </p>
                    <p className="text-purple-200 text-xs">Your stickers have been delivered!</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Orders */}
      {requestChanges.length > 0 && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              🔄 Changes Being Reviewed
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                {requestChanges.length} pending
              </span>
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestChanges.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-amber-400/30"
                     style={{
                       backgroundColor: 'rgba(245, 158, 11, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(245, 158, 11, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-xs text-amber-300">Under Review</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3 bg-white p-2" style={{ aspectRatio: '7/5' }}>
                    <AIFileImage 
                      src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : (order.proofUrl || '')} 
                      filename={(order.proofs && order.proofs.length > 0) ? (order.proofs[0].proofTitle || 'design.jpg') : 'proof.jpg'}
                      alt="Original Proof"
                      className="w-full h-full object-contain"
                      size="preview"
                      showFileType={true}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 mb-3">
                    <p className="text-amber-300 text-xs font-medium">🔄 Changes Requested</p>
                    <p className="text-amber-200 text-xs">Your changes are being reviewed</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {proofsToReview.length === 0 && printingOrders.length === 0 && shippedOrders.length === 0 && deliveredOrders.length === 0 && requestChanges.length === 0 && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No Proofs Available</h3>
            <p className="text-gray-400 mb-6">
              When you place an order, design proofs will appear here for your review.
            </p>
            <Link 
              href="/products"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
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
              Start New Mission
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProofsView;