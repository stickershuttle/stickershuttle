import React from 'react';
import AIFileImage from '../../AIFileImage';
// import OrderItemFileUpload from '../../OrderItemFileUpload';
import OrderProgressTracker from '../../OrderProgressTracker';
import useInvoiceGenerator, { InvoiceData } from '../../InvoiceGenerator';

interface OrderDetailsViewProps {
  selectedOrderForInvoice: any;
  setSelectedOrderForInvoice: (order: any | null) => void;
  setCurrentView: (view: string) => void;
  handleReorder: (orderId: string) => void;
  handleTrackOrder: (order: any) => void;
  handleViewOrderDetails: (order: any) => void;
  handleCloseOrderDetails: () => void;
  getOrderDisplayNumber: (order: any) => any;
  getProductImage: (item: any, itemData?: any) => string | null;
  user: any;
  profile: any;
  refreshOrders: () => void;
  orders: any[];
}

// Helper function to safely format dates
const formatOrderDate = (order: any, includeTime = false): string => {
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
  
  // Format the date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  selectedOrderForInvoice,
  setSelectedOrderForInvoice,
  setCurrentView,
  handleReorder,
  handleTrackOrder,
  handleViewOrderDetails,
  handleCloseOrderDetails,
  getOrderDisplayNumber,
  getProductImage,
  user,
  profile,
  refreshOrders,
  orders,
}) => {
  // Helper function to check if an order contains deal items
  const isOrderFromDeal = (order: any) => {
    return order.items?.some((item: any) => item.calculatorSelections?.isDeal === true);
  };

  // Initialize invoice generator
  const invoiceData: InvoiceData = selectedOrderForInvoice ? {
    orderNumber: selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id,
    orderDate: selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.created_at || selectedOrderForInvoice.date || new Date().toISOString(),
    orderStatus: selectedOrderForInvoice.orderStatus || selectedOrderForInvoice.status,
    totalPrice: selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
    currency: selectedOrderForInvoice.currency || 'USD',
    subtotal: selectedOrderForInvoice.subtotal || selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
    tax: selectedOrderForInvoice.tax || 0,
    shipping: selectedOrderForInvoice.shipping || 0,
    items: selectedOrderForInvoice.items.map((item: any) => {
      const itemData = item._fullItemData || item;
      const customFiles = itemData.customFiles || itemData.custom_files || item.customFiles;
      return {
        id: item.id,
        productName: item.productName || item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || (item.price / item.quantity),
        totalPrice: item.totalPrice || item.price,
        customFiles: customFiles,
        calculatorSelections: item.calculatorSelections || item._fullOrderData,
        customerNotes: item.customerNotes
      };
    }),
    trackingNumber: selectedOrderForInvoice.trackingNumber,
    trackingCompany: selectedOrderForInvoice.trackingCompany,
    customerEmail: selectedOrderForInvoice.customerEmail || user?.email,
    billingAddress: selectedOrderForInvoice.billingAddress || selectedOrderForInvoice.billing_address || selectedOrderForInvoice.shippingAddress,
    customerInfo: {
      name: profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Customer',
      email: user?.email,
    }
  } : {} as InvoiceData;

  const { generatePrintPDF, generateDownloadPDF } = useInvoiceGenerator(invoiceData);

  if (!selectedOrderForInvoice) {
    return (
      <div className="container-style p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">No Order Selected</h2>
        <p className="text-gray-300 mb-6">Please select an order to view details.</p>
        <button
          onClick={() => setCurrentView('all-orders')}
          className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            color: 'white'
          }}
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="hidden sm:inline">Order Details</span>
            <span className="sm:hidden">Details</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('all-orders')}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                color: 'white'
              }}
            >
              <span className="hidden sm:inline">← Back to Orders</span>
              <span className="sm:hidden">← Back</span>
            </button>
          </div>
        </div>

        {/* Order Basic Info */}
        <div className="container-style p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Order #{getOrderDisplayNumber(selectedOrderForInvoice)}</h3>
              <p className="text-gray-300">
                <span className="font-medium">Date:</span> {formatOrderDate(selectedOrderForInvoice, true)}
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Status:</span> {selectedOrderForInvoice.orderStatus || selectedOrderForInvoice.status || 'Processing'}
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Total:</span> ${(selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total).toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <OrderProgressTracker order={selectedOrderForInvoice} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleTrackOrder(selectedOrderForInvoice)}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
              color: 'white'
            }}
          >
            📦 Track Order
          </button>
          {!isOrderFromDeal(selectedOrderForInvoice) ? (
            <button
              onClick={() => handleReorder(selectedOrderForInvoice.id)}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                color: 'white'
              }}
            >
              🔄 Re-order
            </button>
          ) : (
            <div className="flex flex-col items-start">
              <button
                disabled
                className="px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                style={{
                  background: 'rgba(107, 114, 128, 0.5)',
                  color: 'rgba(156, 163, 175, 0.8)',
                  border: '1px solid rgba(107, 114, 128, 0.3)',
                }}
              >
                🔄 Re-order
              </button>
              <span className="text-xs text-gray-400 mt-1">Re-order Disabled for Deals</span>
        </div>
          )}
          <button
            onClick={() => generatePrintPDF()}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
              color: 'white'
            }}
          >
            🖨️ Print
          </button>
          <button
            onClick={() => generateDownloadPDF()}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
              color: 'white'
            }}
          >
            📄 Download
          </button>
        </div>
      </div>

      {/* Order Items */}
      <div className="container-style p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
          Order Items
        </h3>
        <div className="space-y-4">
          {selectedOrderForInvoice.items.map((item: any, index: number) => {
            const itemData = item._fullItemData || item;
            const calculatorSelections = itemData.calculatorSelections || itemData.calculator_selections || item._fullOrderData;
            const customFiles = itemData.customFiles || itemData.custom_files || item.customFiles;
            const firstImage = Array.isArray(customFiles) && customFiles.length > 0 ? customFiles[0] : null;
            
            const getProductImage = (item: any, itemData?: any): string | null => {
              const selections = itemData?.calculatorSelections || itemData?.calculator_selections || item._fullOrderData || {};
              const customFiles = itemData?.customFiles || itemData?.custom_files || item.customFiles || [];
              
              if (Array.isArray(customFiles) && customFiles.length > 0) {
                return customFiles[0];
              }
              
              return null;
            };
            
            return (
              <div key={index} className="p-4 rounded-lg" style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)'
              }}>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                    {firstImage ? (
                        <AIFileImage
                          src={firstImage}
                          filename={`${item.productName}-${index}`}
                          alt={`${item.productName} preview`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{item.productName}</h4>
                        <p className="text-sm text-gray-300 mb-2">
                          Quantity: {item.quantity} × ${((item.totalPrice || item.price) / item.quantity).toFixed(2)} = ${(item.totalPrice || item.price).toFixed(2)}
                        </p>
                        
                        {/* Calculator Selections */}
                        {calculatorSelections && renderCalculatorSelections(calculatorSelections)}
                        
                        {/* Custom Options */}
                        {renderCustomOptions(item, itemData, selectedOrderForInvoice)}
                        
                        {/* Customer Notes */}
                        {(itemData.customerNotes || item.customerNotes) && (
                          <div className="mt-2 p-2 rounded" style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <p className="text-xs text-gray-400 mb-1">Customer Notes:</p>
                            <p className="text-sm text-gray-300">{itemData.customerNotes || item.customerNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
                        })}
                      </div>
                    </div>
    </div>
  );

  // Helper function to render calculator selections
  function renderCalculatorSelections(selections: any) {
    if (!selections || typeof selections !== 'object') return null;
                      
                      return Object.keys(selections).length > 0 && (
      <div className="mt-2 space-y-1">
        {Object.entries(selections).map(([key, value]: [string, any]) => {
          if (key === 'isDeal' || key === 'size' || key === 'sizePreset' || key === 'proof' || !value) return null;
          
          const displayValue = typeof value === 'object' ? value.displayValue || value.value : value;
          if (!displayValue) return null;
          
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="text-xs text-gray-300">{displayValue}</span>
                              </div>
          );
        })}
        
        {/* Size information */}
        {renderSizeInfo(selections)}
                              </div>
    );
  }

  // Helper function to render size information
  function renderSizeInfo(selections: any) {
                              const size = selections.size || selections.sizePreset || {};
                              return (size.width && size.height) || size.displayValue ? (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Size:</span>
        <span className="text-xs text-gray-300">
          {size.displayValue || `${size.width}" × ${size.height}"`}
                                  </span>
                                </div>
                              ) : null;
  }

  // Helper function to render custom options
  function renderCustomOptions(item: any, itemData: any, selectedOrderForInvoice: any) {
    const selections = itemData.calculatorSelections || itemData.calculator_selections || item._fullOrderData || {};
    
    // Extract information from order notes as fallback
    const orderNote = selectedOrderForInvoice.orderNote || '';
    
    // Instagram information
                            const itemString = orderNote || '';
                            
                            const instagramFromString = itemString.match(/📸 Instagram: @([^\\n]+)/);
                            const instagramOptInFromString = itemString.includes('📸 Instagram') && itemString.includes('marketing');
                            const instagramHandle = itemData.instagramHandle || selections.instagram?.value || selections.instagramHandle?.value || 
                              (instagramFromString ? instagramFromString[1] : null);
                            const instagramOptIn = itemData.instagramOptIn || !!selections.instagram || instagramOptInFromString;
                            
    // Rush order information
                            const rushFromString = itemString.includes('🚀 Rush Order') || itemString.includes('Rush: Rush Order');
                            const rushOrder = selections.rush?.value || (selectedOrderForInvoice as any).is_rush_order || rushFromString;
                            
    // Proof information
                            const proofFromString = itemString.includes('📧') ? true : itemString.includes('❌ No Proof') ? false : null;
                            const hasProofData = selections.proof?.value !== undefined || proofFromString !== null;
                            const proofValue = selections.proof?.value !== undefined ? selections.proof.value : 
      proofFromString;
                            
    // Enhanced proof detection
                            const sendProofMatch = itemString.includes('Send FREE Proof') || itemString.includes('Send proof');
                            const noProofMatch = itemString.includes("Don't Send Proof") || itemString.includes('Skip proof');
                            const updatedHasProofData = sendProofMatch || noProofMatch || hasProofData;
                            const updatedProofValue = sendProofMatch ? true : noProofMatch ? false : proofValue;
                            
    // Show this section only if there's relevant data
                            const showSection = itemData.customerNotes || instagramHandle || instagramOptIn || itemData.customerReplacementFile || 
      rushOrder || updatedHasProofData || selections.customText || selections.customNotes;
                            
                            return showSection ? (
      <div className="mt-2 p-2 rounded" style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div className="space-y-1">
          {instagramHandle && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Instagram:</span>
              <span className="text-xs text-gray-300">@{instagramHandle}</span>
              {instagramOptIn && <span className="text-xs text-green-400">(Marketing Opt-in)</span>}
                                  </div>
                                )}
          {itemData.customerReplacementFile && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Replacement File:</span>
              <span className="text-xs text-gray-300">Yes</span>
                                  </div>
                                )}
                                {rushOrder && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Rush Order:</span>
              <span className="text-xs text-yellow-400">Yes</span>
                                  </div>
                                )}
                                {updatedHasProofData && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Proof:</span>
              <span className={`text-xs ${updatedProofValue ? 'text-green-400' : 'text-red-400'}`}>
                {updatedProofValue ? 'Send Proof' : 'Skip Proof'}
                                    </span>
                                  </div>
                                )}
          {selections.customText && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Custom Text:</span>
              <span className="text-xs text-gray-300">{selections.customText}</span>
                                        </div>
                                      )}
          {selections.customNotes && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Custom Notes:</span>
              <span className="text-xs text-gray-300">{selections.customNotes}</span>
                      </div>
                    )}
        </div>
      </div>
    ) : null;
  }
};

export default OrderDetailsView;