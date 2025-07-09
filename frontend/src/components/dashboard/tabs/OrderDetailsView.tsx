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
  getOrderDisplayNumber: (order: any) => any;
  getProductImage: (item: any, itemData?: any) => string | null;
  user: any;
  profile: any;
  refreshOrders: () => void;
  orders: any[];
}

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  selectedOrderForInvoice,
  setSelectedOrderForInvoice,
  setCurrentView,
  handleReorder,
  handleTrackOrder,
  getOrderDisplayNumber,
  getProductImage,
  user,
  profile,
  refreshOrders,
  orders,
}) => {
  // Initialize invoice generator
  const invoiceData: InvoiceData = selectedOrderForInvoice ? {
    orderNumber: selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id,
    orderDate: selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.date,
    orderStatus: selectedOrderForInvoice.orderStatus || selectedOrderForInvoice.status,
    totalPrice: selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
    currency: selectedOrderForInvoice.currency || 'USD',
    subtotal: selectedOrderForInvoice.subtotal || selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
    tax: selectedOrderForInvoice.tax || 0,
    shipping: selectedOrderForInvoice.shipping || 0,
    items: selectedOrderForInvoice.items.map((item: any) => ({
      id: item.id,
      productName: item.productName || item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || (item.price / item.quantity),
      totalPrice: item.totalPrice || item.price,
      customFiles: item.customFiles,
      calculatorSelections: item.calculatorSelections || item._fullOrderData,
      customerNotes: item.customerNotes
    })),
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
          className="px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
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
          <button 
            onClick={() => {
              setCurrentView('all-orders');
              setSelectedOrderForInvoice(null);
            }}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7 7-7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Orders</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>

        {/* Action Buttons - Stack on Mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={generatePrintPDF}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'white'
            }}
            title="Print Invoice"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14a1 1 0 011-1h8a1 1 0 011 1v4H5v-4z" clipRule="evenodd" />
            </svg>
            Print Invoice
          </button>
          <button
            onClick={generateDownloadPDF}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'white'
            }}
            title="Download Invoice"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Invoice
          </button>
        </div>
      </div>

      <div className="container-style p-4 md:p-8">
        {/* Shipping Address if available */}
        {selectedOrderForInvoice.shippingAddress && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Shipping Address
            </h4>
            <div className="text-white">
              <p>{selectedOrderForInvoice.shippingAddress.name}</p>
              <p className="text-gray-300">
                {selectedOrderForInvoice.shippingAddress.street1}
                {selectedOrderForInvoice.shippingAddress.street2 && <>, {selectedOrderForInvoice.shippingAddress.street2}</>}
              </p>
              <p className="text-gray-300">
                {selectedOrderForInvoice.shippingAddress.city}, {selectedOrderForInvoice.shippingAddress.state} {selectedOrderForInvoice.shippingAddress.zip}
              </p>
              {selectedOrderForInvoice.shippingAddress.country && (
                <p className="text-gray-300">{selectedOrderForInvoice.shippingAddress.country}</p>
              )}
            </div>
          </div>
        )}

        {/* Order Items - Enhanced Version */}
        <div className="space-y-6">
          {selectedOrderForInvoice.items.map((item: any, index: number) => {
            // Get calculator selections from the correct location
            const itemData = item._fullItemData || item;
            const calculatorSelections = itemData.calculatorSelections || itemData.calculator_selections || item._fullOrderData;
            const customFiles = itemData.customFiles || itemData.custom_files || item.customFiles;
            const firstImage = Array.isArray(customFiles) && customFiles.length > 0 ? customFiles[0] : null;
            
            console.log('Order item debug:', {
              itemId: item.id,
              hasFullItemData: !!item._fullItemData,
              calculatorSelections,
              customFiles,
              firstImage
            });
            
            return (
              <div 
                key={item.id || index} 
                className="bg-white/5 rounded-lg p-4 md:p-6 border border-white/10"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                  {/* Product Image or File Upload */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    {firstImage ? (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-white/20 bg-black/20 mx-auto sm:mx-0">
                        <AIFileImage
                          src={firstImage}
                          filename={firstImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                          alt={item.productName || item.name}
                          className="w-full h-full object-cover"
                          size="thumbnail"
                          showFileType={false}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 mx-auto sm:mx-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-white/10 border border-white/20 overflow-hidden">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752082666/No-File-Uploaded_vedqkk.png"
                            alt="No file uploaded"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button 
                          onClick={() => window.open('mailto:orbit@stickershuttle.com?subject=Design Upload for Order #' + (selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id) + '&body=I selected Upload File Later on my order and wanted to send you my file! Here it is!')}
                          className="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 text-white"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}
                        >
                          Send Design
                        </button>
                      </div>
                    )}
                    {customFiles && customFiles.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        +{customFiles.length - 1} more file{customFiles.length > 2 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="space-y-4 mb-4">
                      {/* Product Header - Mobile Optimized */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-2">{item.productName || item.name}</h4>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">
                              Order #{selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id}
                            </p>
                            <p className="text-gray-300 text-sm">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-white font-semibold text-lg">${(item.totalPrice || item.price).toFixed(2)}</p>
                          <p className="text-gray-400 text-sm">${(item.unitPrice || (item.price / item.quantity)).toFixed(2)} each</p>
                        </div>
                      </div>

                      {/* Order Date - Mobile Optimized */}
                      <div className="text-xs text-gray-400 p-2 bg-black/20 rounded-lg">
                        <span className="font-medium">Placed on:</span> {new Date(selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Calculator Selections - Enhanced View */}
                    {(() => {
                      let selections = calculatorSelections || {};
                      const orderNote = selectedOrderForInvoice.orderNote || '';
                      
                      // White options are stored per item in calculatorSelections - no fallback needed
                      
                      return Object.keys(selections).length > 0 && (
                        <div className="bg-black/20 rounded-lg p-4 border border-white/5 mb-4">
                          <h5 className="text-sm font-semibold text-purple-400 mb-3">Product Specifications</h5>
                          
                          {/* Specifications Grid - Mobile Optimized */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {selections.cut?.displayValue && (
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shape</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-300"
                                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                  {selections.cut.displayValue}
                                </span>
                              </div>
                            )}
                            {selections.material?.displayValue && (
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Material</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-300"
                                  style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                                  {selections.material.displayValue}
                                </span>
                              </div>
                            )}
                            {(() => {
                              const size = selections.size || selections.sizePreset || {};
                              return (size.width && size.height) || size.displayValue ? (
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Size</span>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-300"
                                    style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                                    {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                            {selections.whiteOption?.displayValue && (
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">White Ink</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-cyan-300"
                                  style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                  {selections.whiteOption.displayValue}
                                </span>
                              </div>
                            )}
                            {selections.kissOption?.displayValue && (
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cut Options</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-pink-300"
                                  style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                                  {selections.kissOption.displayValue}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Additional Details */}
                          {(() => {
                            // Parse data from order note string format
                            const itemString = orderNote || '';
                            
                            // Enhanced fallback logic for Instagram
                            const instagramFromString = itemString.match(/📸 Instagram: @([^\\n]+)/);
                            const instagramOptInFromString = itemString.includes('📸 Instagram') && itemString.includes('marketing');
                            const instagramHandle = itemData.instagramHandle || selections.instagram?.value || selections.instagramHandle?.value || 
                              (instagramFromString ? instagramFromString[1] : null);
                            const instagramOptIn = itemData.instagramOptIn || !!selections.instagram || instagramOptInFromString;
                            
                            // Enhanced fallback logic for rush order
                            const rushFromString = itemString.includes('🚀 Rush Order') || itemString.includes('Rush: Rush Order');
                            const rushOrder = selections.rush?.value || (selectedOrderForInvoice as any).is_rush_order || rushFromString;
                            
                            // Enhanced fallback logic for proof preference
                            const proofFromString = itemString.includes('📧') ? true : itemString.includes('❌ No Proof') ? false : null;
                            const hasProofData = selections.proof?.value !== undefined || proofFromString !== null;
                            const proofValue = selections.proof?.value !== undefined ? selections.proof.value : 
                              proofFromString !== null ? proofFromString : true;
                            
                            // Parse proof preference from order note text
                            const sendProofMatch = itemString.includes('Send FREE Proof') || itemString.includes('Send proof');
                            const noProofMatch = itemString.includes("Don't Send Proof") || itemString.includes('Skip proof');
                            const updatedHasProofData = sendProofMatch || noProofMatch || hasProofData;
                            const updatedProofValue = sendProofMatch ? true : noProofMatch ? false : proofValue;
                            
                            // Show section if ANY data exists
                            const showSection = itemData.customerNotes || instagramHandle || instagramOptIn || itemData.customerReplacementFile || 
                              rushOrder || updatedHasProofData;
                            
                            return showSection ? (
                              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                {itemData.customerNotes && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Customer Note:</span>
                                    <span className="text-gray-300 ml-2">{itemData.customerNotes}</span>
                                  </div>
                                )}
                                {(instagramHandle || instagramOptIn) && (
                                  <div className="text-sm mt-1">
                                    <span className="text-gray-500">Instagram:</span>
                                    <span className="text-gray-300 ml-2">
                                      {instagramHandle ? `@${instagramHandle}` : 'Opted in for posting'}
                                      <span className="text-pink-400 ml-2">📸</span>
                                      {instagramOptIn && instagramHandle && (
                                        <span className="ml-2 text-xs text-green-400">(Marketing opt-in)</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {rushOrder && (
                                  <div className="text-sm mt-1">
                                    <span className="text-gray-500">Rush Order:</span>
                                    <span className="text-orange-300 ml-2 font-medium">🚀 24-hour production (+40%)</span>
                                  </div>
                                )}
                                {updatedHasProofData && (
                                  <div className="text-sm mt-1">
                                    <span className="text-gray-500">Proof Preference:</span>
                                    <span className={`ml-2 ${updatedProofValue ? 'text-blue-300' : 'text-gray-300'}`}>
                                      {updatedProofValue ? '📧 Send proof for approval' : '⚡ Skip proof - direct to production'}
                                    </span>
                                  </div>
                                )}
                                {itemData.customerReplacementFile && (
                                  <div className="text-sm mt-1 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      <span className="text-orange-400 font-medium">Customer Replacement File</span>
                                    </div>
                                    <div className="ml-6 space-y-1">
                                      <div className="text-xs text-gray-300">
                                        <span className="text-gray-500">File:</span>
                                        <span className="ml-2 text-orange-400">{itemData.customerReplacementFileName || 'Customer uploaded file'}</span>
                                      </div>
                                      {itemData.customerReplacementAt && (
                                        <div className="text-xs text-gray-400">
                                          <span className="text-gray-500">Uploaded:</span>
                                          <span className="ml-2">{new Date(itemData.customerReplacementAt).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      );
                    })()}

                    {/* Customer Notes */}
                    {(itemData.customerNotes || selectedOrderForInvoice.customerNotes) && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                        <p className="text-blue-400 text-sm font-medium mb-1">Customer Notes</p>
                        <p className="text-white text-sm">{itemData.customerNotes || selectedOrderForInvoice.customerNotes}</p>
                      </div>
                    )}

                    {/* Tracking Information - Moved inside item */}
                    {selectedOrderForInvoice.trackingNumber && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Tracking Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="text-gray-300 text-sm">Tracking Number</p>
                              <p className="text-white font-mono text-sm break-all">{selectedOrderForInvoice.trackingNumber}</p>
                            </div>
                            {selectedOrderForInvoice.trackingCompany && (
                              <div className="text-left sm:text-right">
                                <p className="text-gray-300 text-sm">Carrier</p>
                                <p className="text-white">{selectedOrderForInvoice.trackingCompany}</p>
                              </div>
                            )}
                          </div>
                          <div className="pt-3 border-t border-white/10">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button 
                                onClick={() => handleTrackOrder(selectedOrderForInvoice)}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                                style={{
                                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                Track Order
                              </button>
                              <button 
                                onClick={() => handleReorder(selectedOrderForInvoice.id)}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Reorder
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsView;