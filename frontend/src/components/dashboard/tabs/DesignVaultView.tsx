import React from 'react';
import AIFileImage from '../../AIFileImage';

interface DesignVaultViewProps {
  orders: any[];
  selectedDesignImage: string | null;
  reorderingId: string | null;
  setCurrentView: (view: string) => void;
  handleReorder: (orderId: string) => void;
  getProductImage: (item: any, itemData?: any) => string | null;
}

const DesignVaultView: React.FC<DesignVaultViewProps> = ({
  orders,
  selectedDesignImage,
  reorderingId,
  setCurrentView,
  handleReorder,
  getProductImage,
}) => {
  // Helper function to check if an order contains deal items
  const isOrderFromDeal = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order?.items?.some((item: any) => item.calculatorSelections?.isDeal === true);
  };

  // Extract all unique designs from orders
  const allDesigns: { image: string; orderId: string; orderNumber: string; itemName: string; date: string }[] = [];
  const seenImages = new Set<string>();

  orders.forEach(order => {
    order.items?.forEach((item: any) => {
      const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
      const productImage = getProductImage(item, itemData);
      
      if (productImage && !seenImages.has(productImage)) {
        seenImages.add(productImage);
        allDesigns.push({
          image: productImage,
          orderId: order.id,
          orderNumber: order.orderNumber || order.id,
          itemName: item.name || 'Custom Sticker',
          date: order.date
        });
      }
    });
  });

  // Sort by date (newest first)
  allDesigns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
          </svg>
          Design Vault
        </h2>
        <button 
          onClick={() => setCurrentView('default')}
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-300">All your designs in one place</p>
        <p className="text-sm text-gray-400">{allDesigns.length} unique designs</p>
      </div>

      {allDesigns.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allDesigns.map((design, index) => (
            <div 
              key={index}
              className={`group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                selectedDesignImage === design.image ? 'ring-4 ring-pink-500 shadow-xl' : ''
              }`}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="aspect-square p-3">
                <AIFileImage
                  src={design.image}
                  filename={design.image.split('/').pop()?.split('?')[0] || 'design.jpg'}
                  alt={design.itemName}
                  className="w-full h-full object-contain rounded-lg"
                  size="preview"
                  showFileType={false}
                />
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex flex-col justify-end">
                <p className="text-white font-semibold text-sm mb-1 truncate">{design.itemName}</p>
                <p className="text-gray-300 text-xs mb-3">Order #{design.orderNumber}</p>
                
                <button
                  onClick={() => handleReorder(design.orderId)}
                  disabled={reorderingId === design.orderId || isOrderFromDeal(design.orderId)}
                  className="w-full px-3 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: (reorderingId === design.orderId || isOrderFromDeal(design.orderId))
                      ? 'rgba(102, 102, 102, 0.5)' 
                      : 'linear-gradient(135deg, rgba(236, 72, 153, 0.4) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(236, 72, 153, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    boxShadow: (reorderingId === design.orderId || isOrderFromDeal(design.orderId))
                      ? 'none' 
                      : 'rgba(236, 72, 153, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  {reorderingId === design.orderId ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : isOrderFromDeal(design.orderId) ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Re-order Disabled for Deals
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Reorder
                    </>
                  )}
                </button>
              </div>

              {/* Selected indicator */}
              {selectedDesignImage === design.image && (
                <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Selected
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div 
          className="text-center py-16 rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No Designs Yet</h3>
          <p className="text-gray-400 mb-6">Your designs will appear here after you place your first order.</p>
          <button
            onClick={() => window.location.href = '/products'}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(236, 72, 153, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: 'rgba(236, 72, 153, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            }}
          >
            <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Start Creating
          </button>
        </div>
      )}
    </div>
  );
};

export default DesignVaultView;