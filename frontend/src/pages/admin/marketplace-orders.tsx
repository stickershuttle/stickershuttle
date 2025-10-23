import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import ProofUpload from '@/components/ProofUpload';
import ItemSpecificProofUpload from '@/components/ItemSpecificProofUpload';
import AIFileImage from '@/components/AIFileImage';
import EasyPostShipping from '@/components/EasyPostShipping';
import ShipOrderModal from '@/components/ShipOrderModal';
import AdditionalPaymentLink from '@/components/AdditionalPaymentLink';
import useInvoiceGenerator from '@/components/InvoiceGenerator';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import { CREATE_EASYPOST_SHIPMENT, BUY_EASYPOST_LABEL, GET_EASYPOST_LABEL } from '../../lib/easypost-mutations';
import { UPDATE_ORDER_SHIPPING_ADDRESS, MARK_ORDER_READY_FOR_PICKUP, MARK_ORDER_PICKED_UP } from '../../lib/order-mutations';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { GET_USER_PROFILE } from '../../lib/profile-mutations';

// GraphQL query to get all orders for admin
const GET_ALL_ORDERS = gql`
  query GetAllOrders {
    getAllOrders {
      id
      userId
      guestEmail
      stripePaymentIntentId
      stripeCheckoutSessionId
      orderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
      subtotalPrice
      totalTax
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      customerPhone
      shippingAddress
      billingAddress
      shipping_method
      is_express_shipping
      is_rush_order
      is_blind_shipment
      orderTags
      orderNote
      orderCreatedAt
      orderUpdatedAt
      createdAt
      updatedAt
      items {
        id
        customerOrderId
        stripeLineItemId
        productId
        productName
        productCategory
        sku
        quantity
        unitPrice
        totalPrice
        calculatorSelections
        customFiles
        customerNotes
        instagramHandle
        instagramOptIn
        fulfillmentStatus
        createdAt
        updatedAt
        customerReplacementFile
        customerReplacementFileName
        customerReplacementAt
        is_additional_payment
      }
      proofs {
        id
        orderId
        orderItemId
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
        cutLines
        replaced
        replacedAt
        originalFileName
      }
      proof_status
      proof_sent_at
      proof_link
      discountCode
      discountAmount
      creditsApplied
      wholesaleClientId
    }
  }
`;

// Helper function to detect marketplace orders
const isMarketplaceOrder = (order: any) => {
  if (!order.items || !Array.isArray(order.items)) return false;
  return order.items.some((item: any) => {
    // Check if any item has marketplace-related tags or is from a creator
    const tags = order.orderTags || [];
    return tags.includes('marketplace') || 
           tags.includes('creator') || 
           tags.includes('market-space') ||
           item.is_additional_payment === true;
  });
};

// Helper function to detect bannership orders
const isBannershipOrder = (order: any) => {
  if (!order.items || !Array.isArray(order.items)) return false;
  return order.items.some((item: any) => {
    const productName = item.productName || '';
    const category = item.productCategory || '';
    return productName.toLowerCase().includes('banner') || 
           category.toLowerCase().includes('banner') ||
           productName.toLowerCase().includes('pop up') ||
           productName.toLowerCase().includes('x-banner') ||
           productName.toLowerCase().includes('vinyl banner');
  });
};

export default function MarketplaceOrders() {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showAdditionalPaymentModal, setShowAdditionalPaymentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [isBannershipOnlyAdmin, setIsBannershipOnlyAdmin] = useState(false);

  const { generateInvoice } = useInvoiceGenerator();

  // Get user profile to check admin status
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { userId: 'current' },
    skip: typeof window === 'undefined'
  });

  useEffect(() => {
    if (profileData?.getUserProfile) {
      const profile = profileData.getUserProfile;
      setIsBannershipOnlyAdmin(profile.email === 'admin@bannership.com');
    }
  }, [profileData]);

  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ALL_ORDERS, {
    pollInterval: 30000, // Poll every 30 seconds
  });

  // Filter orders to show only marketplace orders
  const marketplaceOrders = useMemo(() => {
    if (!ordersData?.getAllOrders) return [];
    
    return ordersData.getAllOrders.filter((order: any) => {
      // Only show marketplace orders
      return isMarketplaceOrder(order);
    });
  }, [ordersData]);

  // Apply additional filters
  const filteredOrders = useMemo(() => {
    let filtered = marketplaceOrders;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((order: any) =>
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.customerEmail?.toLowerCase().includes(searchLower) ||
        order.customerFirstName?.toLowerCase().includes(searchLower) ||
        order.customerLastName?.toLowerCase().includes(searchLower) ||
        order.items?.some((item: any) => 
          item.productName?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order: any) => {
        switch (statusFilter) {
          case 'unfulfilled':
            return order.fulfillmentStatus === 'unfulfilled';
          case 'fulfilled':
            return order.fulfillmentStatus === 'fulfilled';
          case 'shipped':
            return order.fulfillmentStatus === 'shipped';
          case 'delivered':
            return order.fulfillmentStatus === 'delivered';
          case 'processing':
            return order.orderStatus === 'Processing';
          case 'printing':
            return order.orderStatus === 'Printing';
          case 'ready':
            return order.orderStatus === 'Ready for Pickup';
          case 'picked':
            return order.orderStatus === 'Picked Up';
          default:
            return true;
        }
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter((order: any) => 
        new Date(order.orderCreatedAt) >= filterDate
      );
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime();
        case 'oldest':
          return new Date(a.orderCreatedAt).getTime() - new Date(b.orderCreatedAt).getTime();
        case 'amount_high':
          return (b.totalPrice || 0) - (a.totalPrice || 0);
        case 'amount_low':
          return (a.totalPrice || 0) - (b.totalPrice || 0);
        case 'customer':
          return (a.customerFirstName || '').localeCompare(b.customerFirstName || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [marketplaceOrders, searchTerm, statusFilter, dateFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = marketplaceOrders.length;
    const unfulfilled = marketplaceOrders.filter((order: any) => order.fulfillmentStatus === 'unfulfilled').length;
    const fulfilled = marketplaceOrders.filter((order: any) => order.fulfillmentStatus === 'fulfilled').length;
    const shipped = marketplaceOrders.filter((order: any) => order.fulfillmentStatus === 'shipped').length;
    const totalRevenue = marketplaceOrders.reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);

    return { total, unfulfilled, fulfilled, shipped, totalRevenue };
  }, [marketplaceOrders]);

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setShowShipModal(false);
    setShowAdditionalPaymentModal(false);
  };

  const handleShipOrder = (order: any) => {
    setSelectedOrder(order);
    setShowShipModal(true);
  };

  const handleAdditionalPayment = (order: any) => {
    setSelectedOrder(order);
    setShowAdditionalPaymentModal(true);
  };

  const handleGenerateInvoice = async (order: any) => {
    setInvoiceOrder(order);
    setShowInvoiceModal(true);
  };

  if (ordersLoading) {
    return (
      <AdminLayout title="Marketplace Orders - Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Marketplace Orders - Admin Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace Orders</h1>
            <p className="text-gray-400 mt-1">Manage marketplace and creator orders</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Unfulfilled</p>
                <p className="text-2xl font-bold text-white">{stats.unfulfilled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Fulfilled</p>
                <p className="text-2xl font-bold text-white">{stats.fulfilled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Shipped</p>
                <p className="text-2xl font-bold text-white">{stats.shipped}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Order number, customer, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Search orders"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="processing">Processing</option>
                <option value="printing">Printing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="picked">Picked Up</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Filter by date range"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Sort orders"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
                <option value="customer">Customer Name</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-400">
                Showing {filteredOrders.length} of {marketplaceOrders.length} orders
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-white/5 cursor-pointer" onClick={() => handleOrderClick(order)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{order.orderNumber}</div>
                      <div className="text-sm text-gray-400">#{order.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {(() => {
                          const firstName = order.customerFirstName || '';
                          const lastName = order.customerLastName || '';
                          const fullName = `${firstName} ${lastName}`.trim();
                          return fullName || 'Customer Name Not Available';
                        })()}
                      </div>
                      <div className="text-sm text-gray-400">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-400">
                        {order.items?.slice(0, 2).map((item: any) => item.productName).join(', ')}
                        {order.items?.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.fulfillmentStatus === 'unfulfilled' ? 'bg-yellow-100 text-yellow-800' :
                        order.fulfillmentStatus === 'fulfilled' ? 'bg-green-100 text-green-800' :
                        order.fulfillmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.fulfillmentStatus === 'delivered' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.fulfillmentStatus || order.orderStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ${order.totalPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(order.orderCreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderClick(order);
                    }}
                    className="text-purple-400 hover:text-purple-300"
                    title="View order details"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateInvoice(order);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                    title="Generate invoice"
                  >
                    Invoice
                  </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Order {selectedOrder.orderNumber}</h2>
                    <p className="text-gray-400">Ordered on {new Date(selectedOrder.orderCreatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-white"
                    title="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Name:</span> <span className="text-white">{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</span></div>
                      <div><span className="text-gray-400">Email:</span> <span className="text-white">{selectedOrder.customerEmail}</span></div>
                      <div><span className="text-gray-400">Phone:</span> <span className="text-white">{selectedOrder.customerPhone || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Status:</span> <span className="text-white">{selectedOrder.orderStatus}</span></div>
                      <div><span className="text-gray-400">Fulfillment:</span> <span className="text-white">{selectedOrder.fulfillmentStatus}</span></div>
                      <div><span className="text-gray-400">Total:</span> <span className="text-white">${selectedOrder.totalPrice?.toFixed(2) || '0.00'}</span></div>
                      <div><span className="text-gray-400">Tracking:</span> <span className="text-white">{selectedOrder.trackingNumber || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Order Items</h3>
                  <div className="space-y-4">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{item.productName}</h4>
                            <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                            <p className="text-sm text-gray-400">Unit Price: ${item.unitPrice?.toFixed(2)}</p>
                            <p className="text-sm text-gray-400">Total: ${item.totalPrice?.toFixed(2)}</p>
                            {item.customerNotes && (
                              <p className="text-sm text-gray-400 mt-2">Notes: {item.customerNotes}</p>
                            )}
                          </div>
                          {item.customFiles && item.customFiles.length > 0 && (
                            <div className="ml-4">
                              <AIFileImage 
                                src={item.customFiles[0]} 
                                filename={item.customFiles[0].split('/').pop() || ''} 
                                alt={item.productName} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleShipOrder(selectedOrder)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Ship Order
                  </button>
                  <button
                    onClick={() => handleAdditionalPayment(selectedOrder)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    Additional Payment
                  </button>
                  <button
                    onClick={() => handleGenerateInvoice(selectedOrder)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Generate Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ship Order Modal */}
        {showShipModal && selectedOrder && (
          <ShipOrderModal
            order={selectedOrder}
            onClose={handleCloseModal}
            onSuccess={() => {
              refetchOrders();
              handleCloseModal();
            }}
          />
        )}

        {/* Additional Payment Modal */}
        {showAdditionalPaymentModal && selectedOrder && (
          <AdditionalPaymentLink
            order={selectedOrder}
            onClose={handleCloseModal}
            onSuccess={() => {
              refetchOrders();
              handleCloseModal();
            }}
          />
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && invoiceOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">Generate Invoice</h2>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="text-gray-400 hover:text-white"
                    title="Close invoice modal"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Number</label>
                    <input
                      type="text"
                      defaultValue={`INV-${invoiceOrder.orderNumber}`}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      aria-label="Invoice number"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowInvoiceModal(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await generateInvoice(invoiceOrder);
                          setShowInvoiceModal(false);
                        } catch (error) {
                          console.error('Error generating invoice:', error);
                        }
                      }}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      Generate Invoice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
