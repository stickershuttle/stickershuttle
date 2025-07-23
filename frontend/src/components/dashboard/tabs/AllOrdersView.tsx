import React, { useState } from 'react';
import AIFileImage from '../../AIFileImage';
// import OrderItemFileUpload from '../../OrderItemFileUpload';

interface AllOrdersViewProps {
  orders: any[];
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedDesignImage: string | null;
  setSelectedDesignImage: (image: string | null) => void;
  wholesaleClients: any[];
  refreshOrders: () => void;
  handleViewOrderDetails: (order: any) => void;
  handleReorder: (orderId: string) => void;
  handleTrackOrder: (order: any) => void;
  getOrderDisplayNumber: (order: any) => string;
  getProductImage: (item: any, itemData?: any) => string | null;
  isOrderShippedWithTracking: (order: any) => boolean;
}

// Helper function to safely format dates
const formatOrderDate = (order: any, options?: Intl.DateTimeFormatOptions): string => {
  // Try multiple date fields in order of preference
  const dateValue = order.orderCreatedAt || order.created_at || order.date || order.orderDate;
  
  // If no date found, return fallback
  if (!dateValue) {
    return 'Date not available';
  }
  
  const date = new Date(dateValue);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Use provided options or default
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options || defaultOptions);
};

const AllOrdersView: React.FC<AllOrdersViewProps> = ({
  orders,
  currentView,
  setCurrentView,
  selectedDesignImage,
  setSelectedDesignImage,
  wholesaleClients,
  refreshOrders,
  handleViewOrderDetails,
  handleReorder,
  handleTrackOrder,
  getOrderDisplayNumber,
  getProductImage,
  isOrderShippedWithTracking,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Calculate pagination values
  const totalOrders = orders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  // Helper function to check if an order contains deal items
  const isOrderFromDeal = (order: any) => {
    // First check: Search the entire order JSON for deal indicators
    const orderStr = JSON.stringify(order).toLowerCase();
    const hasDealsInJson = orderStr.includes('isDeal":true') || 
                          orderStr.includes('dealPrice') || 
                          orderStr.includes('"deal') ||
                          orderStr.includes('deal-');
    
    // Second check: Look for specific deal patterns in order number/id
    const dealPatterns = [
      order.orderNumber?.includes('100 '),  // 100 sticker deals
      order.orderNumber?.includes('chrome'), // Chrome deals  
      order.orderNumber?.includes('holographic'), // Holographic deals
      (order.id || '').includes('deal-'), // Deal IDs from deals page
    ];
    
    const hasDealsInOrderInfo = dealPatterns.some(pattern => pattern === true);
    
    const isDeal = hasDealsInJson || hasDealsInOrderInfo;
    
    return isDeal;
  };

  return (
    <div className="space-y-6 mobile-content">
      <div className="flex items-center justify-between mobile-container">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
          </svg>
          Orders
        </h2>
        <button 
          onClick={() => setCurrentView('default')}
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>
      
      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mobile-container">
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {totalOrders}
            </div>
            <div className="text-sm text-gray-300">Total Orders</div>
          </div>
        </div>
        
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {orders.reduce((sum: number, order: any) => sum + order.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0)}
            </div>
            <div className="text-sm text-gray-300">Total Stickers</div>
          </div>
        </div>
        
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {orders.filter(order => order.status !== 'Delivered').length}
            </div>
            <div className="text-sm text-gray-300">Active Orders</div>
          </div>
        </div>
      </div>
      
      {/* Orders List - Matching Active Orders Layout */}
      <div 
        className="rounded-2xl overflow-hidden mobile-container mobile-full-width"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Table Header - Desktop Only */}
        <div className="hidden md:block px-3 md:px-6 py-3 border-b border-white/10 bg-white/5">
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
          {currentOrders.map((order) => {
            // Calculate total stickers
            const totalStickers = order.items.reduce((sum: number, item: any) => {
              const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
              return sum + (itemData.quantity || item.quantity || 0);
            }, 0);
            
            return (
              <div key={order.id}>
                <div className="px-3 md:px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                  {/* Desktop Row Layout */}
                  <div className="hidden md:grid grid-cols-16 gap-4 items-center">
                    
                    {/* Preview Column - Side by Side Images */}
                    <div className="col-span-3">
                      <div className="flex gap-2 flex-wrap">
                        {order.items.map((item: any, index: number) => {
                          // Get the full item data with images
                          const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                          
                          // Get product image with sample pack support
                          const productImage = getProductImage(item, itemData);
                          
                          const name = itemData.name || item.name || 'Custom Sticker';
                          
                          return (
                            <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                              {productImage && productImage.trim() !== '' ? (
                                <div 
                                  className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105 relative"
                                  onClick={() => {
                                    // Set the selected image for highlighting in design vault
                                    setSelectedDesignImage(productImage);
                                    setCurrentView('design-vault');
                                  }}
                                  title={`Click to view ${name} in Design Vault`}
                                >
                                  <AIFileImage
                                    src={productImage}
                                    filename={productImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                    alt={name}
                                    className="max-w-full max-h-full object-contain rounded"
                                    size="thumbnail"
                                    showFileType={false}
                                  />
                                  {/* Re-Order Pill */}
                                  {itemData.isReorder && (
                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 py-0.5 rounded-full text-[8px] font-bold leading-none">
                                      RE
                                    </div>
                                  )}
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

                    {/* Items Column - Product Types with Quantities */}
                    <div className="col-span-4">
                      <div className="space-y-1">
                        {(() => {
                          // Group items by product type and sum quantities
                          const productTypes: { [key: string]: number } = {};
                          
                          order.items.forEach((item: any) => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            const quantity = itemData.quantity || item.quantity || 0;
                            const name = itemData.name || item.name || 'Custom Sticker';
                            
                            // Determine product type from name
                            let productType = 'Vinyl Stickers';
                            if (name.toLowerCase().includes('holographic') || name.toLowerCase().includes('holo')) {
                              productType = 'Holographic Stickers';
                            } else if (name.toLowerCase().includes('clear') || name.toLowerCase().includes('transparent')) {
                              productType = 'Clear Stickers';
                            } else if (name.toLowerCase().includes('white') || name.toLowerCase().includes('opaque')) {
                              productType = 'White Stickers';
                            } else if (name.toLowerCase().includes('metallic') || name.toLowerCase().includes('foil')) {
                              productType = 'Metallic Stickers';
                            }
                            
                            if (productTypes[productType]) {
                              productTypes[productType] += quantity;
                            } else {
                              productTypes[productType] = quantity;
                            }
                          });
                          
                          return Object.entries(productTypes).map(([type, quantity]: [string, number]) => (
                            <div key={type} className="text-sm text-white">
                              {quantity} {type}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                    
                    {/* Date Column */}
                    <div className="col-span-2">
                      <div className="text-xs text-gray-400">
                        {formatOrderDate(order)}
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
                        {/* Client Assignment Indicator */}
                        {(() => {
                          const assignedClientId = order._fullOrderData?.wholesaleClientId;
                          const assignedClient = assignedClientId ? 
                            wholesaleClients.find(c => c.id === assignedClientId) : null;
                          
                          if (assignedClient) {
                            return (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                <span className="truncate max-w-20" title={assignedClient.clientName}>
                                  {assignedClient.clientName}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <button
                          onClick={() => handleViewOrderDetails(order)}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1"
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
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleReorder(order.id)}
                            disabled={isOrderFromDeal(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: isOrderFromDeal(order) 
                                ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.4) 0%, rgba(107, 114, 128, 0.25) 50%, rgba(107, 114, 128, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: isOrderFromDeal(order) 
                                ? '1px solid rgba(107, 114, 128, 0.4)'
                                : '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            {isOrderFromDeal(order) ? 'Reorder (Disabled on Deals)' : 'Reorder'}
                          </button>
                        </div>
                      
                      {order.status === 'Proof Review Needed' && (
                        <button
                          onClick={() => setCurrentView('proofs')}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors duration-150 cursor-pointer"
                          style={{
                            backgroundColor: 'rgba(249, 115, 22, 0.2)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            color: 'white'
                          }}
                        >
                          Review Proof
                        </button>
                      )}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 010 2h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                          Track Order
                        </button>
                      )}
                      </div>
                    </div>
                    
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="md:hidden mobile-order-card">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4 w-full max-w-full mx-auto mobile-centered">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-white text-base">
                            {getOrderDisplayNumber(order)}
                          </div>
                          {/* Client Assignment Indicator */}
                          {(() => {
                            const assignedClientId = order._fullOrderData?.wholesaleClientId;
                            const assignedClient = assignedClientId ? 
                              wholesaleClients.find(c => c.id === assignedClientId) : null;
                            
                            if (assignedClient) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                  <span className="truncate max-w-16" title={assignedClient.clientName}>
                                    {assignedClient.clientName}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          ${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Preview Images */}
                      <div className="flex gap-2 flex-wrap">
                        {order.items.map((item: any, index: number) => {
                          const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                          let productImage = null;
                          if (itemData.customFiles?.[0]) {
                            productImage = itemData.customFiles[0];
                          } else if (itemData.image) {
                            productImage = itemData.image;
                          } else if (item.customFiles?.[0]) {
                            productImage = item.customFiles[0];
                          } else if (item.image) {
                            productImage = item.image;
                          }

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

                      {/* Actions and rest of mobile layout continues... */}
                    </div>
                  </div>
                </div>

                {/* Progress Tracker would go here if needed */}
              </div>
            );
          })}
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
  );
};

export default AllOrdersView; 