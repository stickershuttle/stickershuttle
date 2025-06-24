import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../../lib/supabase';
import { useDashboardData } from '../../../hooks/useDashboardData';
import Layout from '../../../components/Layout';
import useInvoiceGenerator, { InvoiceData } from '../../../components/InvoiceGenerator';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  size?: string;
  material?: string;
  design?: string;
  price: number;
  image?: string;
  customFiles?: string[];
  _fullOrderData?: any;
  _fullItemData?: any;
  calculatorSelections?: any;
  calculator_selections?: any;
  custom_files?: string[];
  customerNotes?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  date: string;
  status: string;
  total: number;
  trackingNumber?: string | null;
  trackingCompany?: string | null;
  trackingUrl?: string | null;
  proofUrl?: string;
  items: OrderItem[];
  _fullOrderData?: any;
  proofs?: Array<{
    id: string;
    proofUrl: string;
    proofTitle?: string;
    uploadedAt: string;
    status: string;
    customerNotes?: string;
    adminNotes?: string;
  }>;
  proof_status?: string;
  proof_sent_at?: string;
  orderStatus?: string;
  orderCreatedAt?: string;
  financialStatus?: string;
  shippingAddress?: {
    name?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  customerNotes?: string;
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const { orderNumber } = router.query;
  const { user, userLoading, orders, ordersLoading } = useDashboardData();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize invoice data state
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  
  // Call the hook at the top level with a default value
  const { generatePrintPDF, generateDownloadPDF } = useInvoiceGenerator(invoiceData || {
    orderNumber: '',
    orderDate: new Date().toISOString(),
    orderStatus: '',
    totalPrice: 0,
    currency: 'USD',
    subtotal: 0,
    tax: 0,
    shipping: 0,
    items: []
  });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber || !user) return;

      try {
        // Find the order in the orders array
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
          setError('No orders found');
          setLoading(false);
          return;
        }

        const foundOrder = orders.find((o: any) => 
          o.orderNumber === orderNumber || 
          o.id === orderNumber
        ) as Order | undefined;

        if (foundOrder) {
          setOrder(foundOrder);
          
          // Set invoice data after order is found
          setInvoiceData({
            orderNumber: foundOrder.orderNumber || foundOrder.id,
            orderDate: foundOrder.orderCreatedAt || foundOrder.date,
            orderStatus: foundOrder.orderStatus || foundOrder.status,
            totalPrice: foundOrder.total,
            currency: 'USD',
            subtotal: foundOrder.total,
            tax: 0,
            shipping: 0,
            items: foundOrder.items.map((item: OrderItem) => ({
              id: item.id,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.price / item.quantity,
              totalPrice: item.price,
              customFiles: item.customFiles,
              calculatorSelections: item.calculatorSelections || item.calculator_selections || item._fullOrderData,
              customerNotes: item.customerNotes
            })),
            trackingNumber: foundOrder.trackingNumber || undefined,
            trackingCompany: foundOrder.trackingCompany || undefined,
            customerEmail: (user as any)?.email,
            billingAddress: foundOrder.shippingAddress,
            customerInfo: {
              name: (user as any)?.user_metadata?.full_name || (user as any)?.email?.split('@')[0] || 'Customer',
              email: (user as any)?.email,
            }
          });
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    // Wait for user and orders to be loaded
    if (!userLoading && !ordersLoading) {
      fetchOrder();
    }
  }, [orderNumber, user, userLoading, orders, ordersLoading]);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-400';
      case 'shipped':
      case 'out for delivery':
      case 'in_transit':
      case 'out_for_delivery':
        return 'bg-blue-400';
      case 'processing':
      case 'in production':
      case 'pre_transit':
        return 'bg-yellow-400';
      case 'proof review needed':
        return 'bg-orange-400';
      case 'cancelled':
      case 'return_to_sender':
      case 'failure':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'proof review needed':
        return 'Proof Review Needed';
      case 'in production':
        return 'In Production';
      case 'out for delivery':
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'in_transit':
        return 'In Transit';
      case 'pre_transit':
        return 'Pre-Transit';
      case 'return_to_sender':
        return 'Return to Sender';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'shipped':
      case 'out for delivery':
      case 'out_for_delivery':
      case 'in_transit':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        );
      case 'processing':
      case 'in production':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'proof review needed':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Order Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The requested order could not be found.'}</p>
            <button
              onClick={() => router.push('/account/dashboard')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-3xl font-bold text-white">Order Details</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={generatePrintPDF}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'white'
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14a1 1 0 011-1h8a1 1 0 011 1v4H5v-4z" clipRule="evenodd" />
                </svg>
                Print
              </button>
              <button
                onClick={generateDownloadPDF}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'white'
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download
              </button>
            </div>
          </div>

          {/* Main Order Container */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Order Header */}
            <div className="p-8 border-b border-white/10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Order #{order.orderNumber || order.id}
                  </h2>
                  <p className="text-gray-300">
                    Placed on {new Date(order.orderCreatedAt || order.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(order.orderStatus || order.status)}`}></div>
                    <span className="flex items-center gap-2 text-lg font-semibold text-white">
                      {getStatusIcon(order.orderStatus || order.status)}
                      {getStatusDisplayText(order.orderStatus || order.status)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${order.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Shipping Address if available */}
              {order.shippingAddress && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Shipping Address
                  </h4>
                  <div className="text-white">
                    <p>{order.shippingAddress.name}</p>
                    <p className="text-gray-300">
                      {order.shippingAddress.street1}
                      {order.shippingAddress.street2 && <>, {order.shippingAddress.street2}</>}
                    </p>
                    <p className="text-gray-300">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                    </p>
                    {order.shippingAddress.country && (
                      <p className="text-gray-300">{order.shippingAddress.country}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Items - Focus on Calculator Selections */}
            <div className="p-8">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Order Items & Specifications
              </h3>
              
              <div className="space-y-6">
                {order.items.map((item, index) => {
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
                    <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex items-start gap-6">
                        {/* Product Image */}
                        {firstImage && (
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 bg-black/20">
                              <img 
                                src={firstImage} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {customFiles && customFiles.length > 1 && (
                              <p className="text-xs text-gray-400 mt-1 text-center">
                                +{customFiles.length - 1} more file{customFiles.length > 2 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-1">{item.name}</h4>
                              <p className="text-gray-300">Quantity: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">${item.price.toFixed(2)}</p>
                              <p className="text-gray-400 text-sm">${(item.price / item.quantity).toFixed(2)} each</p>
                            </div>
                          </div>

                          {/* Calculator Selections - Detailed View */}
                          {calculatorSelections && (
                            <div className="bg-black/20 rounded-lg p-4 border border-white/5 mb-4">
                              <h5 className="text-sm font-semibold text-purple-400 mb-3">Product Specifications</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(calculatorSelections).map(([key, value]: [string, any]) => {
                                  if (!value || key === 'total' || key === 'quantity' || key === 'uploadedFiles' || key === 'designFiles') return null;
                                  
                                  const formatKey = (key: string) => {
                                    const keyMap: { [key: string]: string } = {
                                      'size': 'Size',
                                      'material': 'Material',
                                      'finish': 'Finish',
                                      'turnaround': 'Turnaround Time',
                                      'proofOption': 'Proof Option',
                                      'cutToShape': 'Cut to Shape',
                                      'weatherproofLaminate': 'Weatherproof Laminate',
                                      'grommets': 'Grommets',
                                      'poleHem': 'Pole Hem'
                                    };
                                    return keyMap[key] || key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
                                  };

                                  const formatValue = (value: any) => {
                                    if (typeof value === 'object' && value !== null) {
                                      if (value.displayValue) return value.displayValue;
                                      if (value.label) return value.label;
                                      if (value.width && value.height) return `${value.width}" × ${value.height}"`;
                                      if (value.value) return value.value;
                                    }
                                    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                                    return String(value);
                                  };

                                  return (
                                    <div key={key} className="border-l-2 border-purple-400/30 pl-3">
                                      <p className="text-xs text-gray-400 uppercase tracking-wide">{formatKey(key)}</p>
                                      <p className="text-white font-medium">{formatValue(value)}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Customer Notes */}
                          {(itemData.customerNotes || order.customerNotes) && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                              <p className="text-blue-400 text-sm font-medium mb-1">Customer Notes</p>
                              <p className="text-white text-sm">{itemData.customerNotes || order.customerNotes}</p>
                            </div>
                          )}

                          {/* Tracking Information - Moved inside item */}
                          {order.trackingNumber && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                              <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Tracking Information
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-gray-300 text-sm">Tracking Number</p>
                                    <p className="text-white font-mono">{order.trackingNumber}</p>
                                  </div>
                                  {order.trackingCompany && (
                                    <div className="text-right">
                                      <p className="text-gray-300 text-sm">Carrier</p>
                                      <p className="text-white">{order.trackingCompany}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="pt-3 border-t border-white/10">
                                  <a 
                                    href={order.trackingUrl || `https://www.google.com/search?q=${encodeURIComponent(order.trackingNumber)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-white rounded-lg transition-all duration-200 hover:scale-105"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 16l5.447 2.724A1 1 0 0021 19.382V8.618a1 1 0 00-.553-.894L15 5m0 13V5m0 0L9 2" />
                                    </svg>
                                    Track Order
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Order Timeline - Moved inside item */}
                          <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                            <h5 className="text-sm font-semibold text-gray-400 mb-3">Order Timeline</h5>
                            
                            <div className="relative">
                              {/* Timeline Line */}
                              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-white/10"></div>
                              
                              <div className="space-y-3">
                                {/* Order Placed */}
                                <div className="flex items-start gap-3">
                                  <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                  <div className="flex-1">
                                    <p className="text-white font-medium text-sm">Order Placed</p>
                                    <p className="text-gray-400 text-xs">
                                      {new Date(order.orderCreatedAt || order.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>

                                {/* Proof Activities */}
                                {order.proofs && order.proofs.length > 0 && (
                                  <>
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                      <div className="flex-1">
                                        <p className="text-white font-medium text-sm">Design proofs created</p>
                                        <p className="text-gray-400 text-xs">Your custom design has been prepared for review</p>
                                      </div>
                                    </div>
                                    
                                    {order.proof_sent_at && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                        <div className="flex-1">
                                          <p className="text-white font-medium text-sm">Proofs sent for approval</p>
                                          <p className="text-gray-400 text-xs">
                                            {new Date(order.proof_sent_at).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Production Status */}
                                {(order.orderStatus === 'in production' || order.orderStatus === 'processing') && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">In production</p>
                                      <p className="text-gray-400 text-xs">Your order is being manufactured</p>
                                    </div>
                                  </div>
                                )}

                                {/* Shipped */}
                                {order.trackingNumber && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">Shipping label created</p>
                                      <p className="text-gray-400 text-xs">Tracking: {order.trackingNumber}</p>
                                      <p className="text-gray-400 text-xs">Ready for carrier pickup</p>
                                    </div>
                                  </div>
                                )}

                                {/* In Transit */}
                                {(order.orderStatus === 'in_transit' || order.orderStatus === 'shipped') && order.trackingNumber && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">Package in transit</p>
                                      <p className="text-gray-400 text-xs">Your package is on its way to you</p>
                                    </div>
                                  </div>
                                )}

                                {/* Out for Delivery */}
                                {(order.orderStatus === 'out_for_delivery' || order.orderStatus === 'out for delivery') && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">Out for delivery</p>
                                      <p className="text-gray-400 text-xs">Your package will be delivered today</p>
                                    </div>
                                  </div>
                                )}

                                {/* Delivered */}
                                {order.orderStatus === 'delivered' && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">Order delivered</p>
                                      <p className="text-gray-400 text-xs">Your order has been successfully delivered</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400">Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                    <p className="text-gray-400">Total Quantity: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">Total: ${order.total.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">USD</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 