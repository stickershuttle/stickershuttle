import React from 'react';
import AIFileImage from '../../AIFileImage';
import OrderProgressTracker from '../../OrderProgressTracker';

interface OrderDetailsPopupViewProps {
  selectedOrderForDetails: any;
  setSelectedOrderForDetails: (order: any | null) => void;
  handleReorder: (orderId: string) => void;
  isOrderShippedWithTracking: (order: any) => boolean;
  handleTrackOrder: (order: any) => void;
  generatePrintPDF: () => void;
  generateDownloadPDF: () => void;
  getProductImage: (item: any, itemData?: any) => string | null;
}

const OrderDetailsPopupView: React.FC<OrderDetailsPopupViewProps> = ({
  selectedOrderForDetails,
  setSelectedOrderForDetails,
  handleReorder,
  isOrderShippedWithTracking,
  handleTrackOrder,
  generatePrintPDF,
  generateDownloadPDF,
  getProductImage,
}) => {
  if (!selectedOrderForDetails) return null;

  const order = selectedOrderForDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/10"
             style={{ background: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Order #{order.orderNumber || order.id}
            </h2>
            <button
              onClick={() => setSelectedOrderForDetails(null)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              aria-label="Close order details"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <p className="text-sm text-gray-400 mb-1">Order Date</p>
              <p className="text-white font-medium">
                {new Date(order.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="p-4 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p className={`font-medium ${
                order.status === 'Delivered' ? 'text-green-400' :
                order.status === 'Shipped' ? 'text-blue-400' :
                order.status === 'In Production' ? 'text-purple-400' :
                order.status === 'Proof Review Needed' ? 'text-orange-400' :
                'text-gray-300'
              }`}>
                {order.status}
              </p>
            </div>
            
            <div className="p-4 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <p className="text-sm text-gray-400 mb-1">Total</p>
              <p className="text-white font-bold text-lg">${order.total}</p>
            </div>
          </div>

          {/* Progress Tracker */}
          <OrderProgressTracker order={order} />

          {/* Items */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any, index: number) => {
                const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                const productImage = getProductImage(item, itemData);
                
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    {productImage ? (
                      <div className="w-20 h-20 rounded-lg bg-white/10 p-2 flex-shrink-0">
                        <AIFileImage
                          src={productImage}
                          filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                          alt={item.name}
                          className="w-full h-full object-contain rounded"
                          size="thumbnail"
                          showFileType={false}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-400">
                        Quantity: {item.quantity} • ${item.price}
                      </p>
                      {item.size && (
                        <p className="text-xs text-gray-500 mt-1">
                          Size: {item.size}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Info */}
          {order.tracking && (
            <div className="p-4 rounded-lg" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <h3 className="text-lg font-semibold text-white mb-3">Shipping Information</h3>
              {order.tracking.trackingNumber && (
                <div className="mb-2">
                  <p className="text-sm text-gray-400">Tracking Number</p>
                  <p className="text-white font-mono">{order.tracking.trackingNumber}</p>
                </div>
              )}
              {order.tracking.carrier && (
                <div>
                  <p className="text-sm text-gray-400">Carrier</p>
                  <p className="text-white">{order.tracking.carrier}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => handleReorder(order.id)}
              className="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                boxShadow: 'rgba(245, 158, 11, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reorder
            </button>

            {isOrderShippedWithTracking(order) && (
              <button
                onClick={() => handleTrackOrder(order)}
                className="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: 'rgba(34, 197, 94, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Track Order
              </button>
            )}

            <button
              onClick={generatePrintPDF}
              className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Print Invoice
            </button>

            <button
              onClick={generateDownloadPDF}
              className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: 'rgba(34, 197, 94, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPopupView;