import React from 'react';
import Image from 'next/image';

interface CalculatorSelections {
  [key: string]: any; // More flexible to handle both old and new formats
}

interface OrderItem {
  id: string;
  productName: string;
  productCategory: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  calculatorSelections: CalculatorSelections;
  customFiles: string[];
  customerNotes?: string;
}

interface OrderInvoiceProps {
  order: {
    id: string;
    shopifyOrderNumber?: string;
    shopifyOrderId?: string;
    orderCreatedAt: string;
    orderStatus: string;
    fulfillmentStatus?: string;
    totalPrice: number;
    currency?: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerEmail?: string;
    trackingNumber?: string;
    trackingCompany?: string;
    items: OrderItem[];
  };
  onClose: () => void;
}

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ order, onClose }) => {
  // Calculate the actual order total from items if the order.totalPrice is 0
  const calculateOrderTotal = () => {
    if (order.totalPrice && order.totalPrice > 0) {
      return order.totalPrice;
    }
    
    // If order.totalPrice is 0, calculate from items
    const calculatedTotal = order.items.reduce((total, item) => {
      return total + (item.totalPrice || (item.unitPrice * item.quantity));
    }, 0);
    
    console.log('🔍 OrderInvoice: Calculated total from items:', calculatedTotal);
    return calculatedTotal;
  };

  const actualOrderTotal = calculateOrderTotal();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSelectionIcon = (key: string) => {
    const iconClasses: { [key: string]: string } = {
      size: 'fas fa-ruler-combined',
      material: 'fas fa-palette',
      cut: 'fas fa-cut',
      proof: 'fas fa-eye',
      rush: 'fas fa-bolt',
      finish: 'fas fa-magic',
      shape: 'fas fa-shapes',
      color: 'fas fa-fill-drip',
      quantity: 'fas fa-hashtag',
      whiteOption: 'fas fa-palette'
    };
    return iconClasses[key] || 'fas fa-clipboard-list';
  };

  // Helper function to format calculator selections for display
  const formatCalculatorSelections = (selections: CalculatorSelections) => {
    if (!selections || typeof selections !== 'object') {
      return [];
    }

    const displayItems: Array<{ key: string; label: string; value: string; priority: number }> = [];
    
    // Define priority order for display
    const priorityOrder: { [key: string]: number } = {
      size: 1,
      material: 2,
      cut: 3,
      finish: 4,
      whiteOption: 5,
      rush: 6,
      proof: 7
    };
    
    // Handle different formats
    Object.entries(selections).forEach(([key, selection]) => {
      // Skip internal metadata
      if (key.startsWith('_') || key === 'properties' || key === 'variant_title') {
        return;
      }

      // Skip Shopify-specific fields unless they're the only data available
      if (key === 'shopify_variant_id' || key === 'shopify_product_id') {
        return;
      }

      let displayValue = 'N/A';
      let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

      if (selection === null || selection === undefined) {
        return; // Skip null/undefined values
      }

      // Handle different selection formats
      if (typeof selection === 'object' && selection !== null) {
        // New format: { type: 'size', value: '3x3', displayValue: '3" x 3"', priceImpact: 0 }
        if (selection.displayValue) {
          displayValue = selection.displayValue;
        } else if (selection.value) {
          displayValue = selection.value.toString();
        }
      } else if (typeof selection === 'string') {
        // Simple string format: { size: '3x3' }
        displayValue = selection;
      } else if (typeof selection === 'number') {
        displayValue = selection.toString();
      } else if (typeof selection === 'boolean') {
        displayValue = selection ? 'Yes' : 'No';
      }

      // Clean up specific display labels and skip certain values
      if (key === 'whiteOption') {
        label = 'White Option';
        const whiteOptionLabels = {
          'color-only': 'Color Only',
          'partial-white': 'Partial White',
          'full-white': 'Full White'
        };
        displayValue = whiteOptionLabels[displayValue as keyof typeof whiteOptionLabels] || displayValue;
      } else if (key === 'cut' || key === 'shape') {
        label = 'Cut Style';
      } else if (key === 'material') {
        label = 'Material';
      } else if (key === 'size') {
        label = 'Size';
      } else if (key === 'finish') {
        label = 'Finish';
      } else if (key === 'rush') {
        label = 'Rush Order';
      } else if (key === 'proof') {
        label = 'Proof Option';
      }

      // Skip rush orders that are "Standard" (not actually rushed)
      if (key === 'rush' && (displayValue === 'Standard' || displayValue === 'No' || displayValue === 'false')) {
        return;
      }

      // Skip proof if it's the default "Send Proof"
      if (key === 'proof' && displayValue === 'Send Proof') {
        return;
      }

      if (displayValue && displayValue !== 'N/A') {
        displayItems.push({ 
          key, 
          label, 
          value: displayValue, 
          priority: priorityOrder[key] || 99 
        });
      }
    });

    // Sort by priority
    return displayItems.sort((a, b) => a.priority - b.priority);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: { bg: string; text: string; border: string } } = {
      'Processing': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
      'In Production': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
      'Shipped': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
      'Delivered': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
      'Proof Review Needed': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' }
    };
    
    const style = statusStyles[status] || statusStyles['Processing'];
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${style.bg} ${style.text} ${style.border}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/10"
             style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <i className="fas fa-file-invoice text-blue-400"></i> Order Invoice
                {getStatusBadge(order.orderStatus)}
              </h2>
              <p className="text-gray-400 mt-1">
                Order #{order.shopifyOrderNumber || order.shopifyOrderId || order.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              title="Close invoice"
              aria-label="Close invoice"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                <i className="fas fa-calendar-alt text-blue-400 mr-2"></i>Order Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Date:</span>
                  <span className="text-white">{formatDate(order.orderCreatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order ID:</span>
                  <span className="text-white font-mono">{order.shopifyOrderNumber || order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white">{order.orderStatus}</span>
                </div>
                {order.fulfillmentStatus && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fulfillment:</span>
                    <span className="text-white">{order.fulfillmentStatus}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tracking:</span>
                    <span className="text-white font-mono">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                <i className="fas fa-user text-blue-400 mr-2"></i>Customer Info
              </h3>
              <div className="space-y-2 text-sm">
                {(order.customerFirstName || order.customerLastName) && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{order.customerFirstName} {order.customerLastName}</span>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{order.customerEmail}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-2xl font-bold text-green-400">
                    ${actualOrderTotal.toFixed(2)} {order.currency || 'USD'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
              <i className="fas fa-box text-blue-400 mr-2"></i>Order Items ({order.items.length})
            </h3>
            
            {order.items.map((item, itemIndex) => (
              <div 
                key={item.id}
                className="rounded-xl p-6 space-y-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {item.customFiles && item.customFiles.length > 0 ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                        <Image
                          src={item.customFiles[0]}
                          alt={`${item.productName} design`}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden absolute inset-0 flex items-center justify-center text-4xl">
                          🎨
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-4xl">
                        🎨
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">
                        {item.productName}
                      </h4>
                      <p className="text-gray-400 text-sm capitalize">
                        {item.productCategory?.replace('-', ' ')} • {item.quantity} pieces
                      </p>
                    </div>

                    {/* Calculator Selections */}
                    {item.calculatorSelections && Object.keys(item.calculatorSelections).length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-3">
                          <i className="fas fa-cog text-blue-400 mr-2"></i>Configuration Details
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {formatCalculatorSelections(item.calculatorSelections).map(({ key, label, value }) => (
                            <div 
                              key={key}
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                            >
                              <div className="flex items-center gap-2">
                                <i className={`${getSelectionIcon(key)} text-blue-400`}></i>
                                <div>
                                  <p className="text-xs text-gray-400">{label}</p>
                                  <p className="text-sm text-white font-medium">{value}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {formatCalculatorSelections(item.calculatorSelections).length === 0 && (
                            <div className="col-span-full text-center py-4 text-gray-400">
                              <i className="fas fa-info-circle mr-2"></i>
                              Configuration details not available for this order
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Proof Status - Mockup for now */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-300 mb-2">
                        <i className="fas fa-check-circle text-green-400 mr-2"></i>Proof Status
                      </h5>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm text-green-300 font-medium">✅ Proof Accepted</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {item.customerNotes && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-2">💬 Notes</h5>
                        <p className="text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/10">
                          {item.customerNotes}
                        </p>
                      </div>
                    )}

                    {/* Pricing Details */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-gray-300 mb-2">
                        <i className="fas fa-dollar-sign text-green-400 mr-2"></i>Pricing Breakdown
                      </h5>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Price per sticker:</p>
                            <p className="text-lg font-bold text-green-400">
                              ${(item.unitPrice).toFixed(3)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Quantity:</p>
                            <p className="text-lg font-bold text-white">
                              {item.quantity} pieces
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Unit Price:</p>
                            <p className="text-md font-semibold text-white">
                              ${item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Total Cost:</p>
                            <p className="text-md font-semibold text-white">
                              ${(item.totalPrice || (item.unitPrice * item.quantity)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Price per sticker calculation */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Cost per individual sticker:</span>
                            <span className="text-lg font-bold text-yellow-400">
                              ${((item.totalPrice || (item.unitPrice * item.quantity)) / item.quantity).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Files Section */}
                    {item.customFiles && item.customFiles.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-2">
                          <i className="fas fa-file-upload text-blue-400 mr-2"></i>Uploaded Files
                        </h5>
                        <div className="space-y-2">
                          {item.customFiles.map((fileUrl, fileIndex) => (
                            <div key={fileIndex} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                <img 
                                  src={fileUrl} 
                                  alt={`File ${fileIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white font-medium">Design File {fileIndex + 1}</p>
                                <a 
                                  href={fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                  View full size
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className="rounded-xl p-6"
               style={{
                 backgroundColor: 'rgba(16, 185, 129, 0.1)',
                 border: '1px solid rgba(16, 185, 129, 0.3)'
               }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Order Total</h3>
                <p className="text-sm text-gray-400">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-400">
                  ${actualOrderTotal.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">{order.currency || 'USD'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => window.print()}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white'
              }}
            >
              🖨️ Print Invoice
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 bg-gray-600 hover:bg-gray-500 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoice; 