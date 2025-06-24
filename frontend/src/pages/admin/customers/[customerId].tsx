import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, gql } from '@apollo/client';
import { getSupabase } from '../../../lib/supabase';

// Type definitions
interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface Order {
  id: string;
  userId?: string;
  guestEmail?: string;
  orderNumber?: string;
  orderStatus: string;
  fulfillmentStatus: string;
  financialStatus: string;
  totalPrice: number;
  currency?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  orderCreatedAt?: string;
  createdAt?: string;
  proof_status?: string;
  proof_sent_at?: string;
  items?: OrderItem[];
}

// GraphQL query to get customer's orders
const GET_CUSTOMER_ORDERS = gql`
  query GetUserOrders($userId: ID!) {
    getUserOrders(userId: $userId) {
      id
      orderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      orderCreatedAt
      createdAt
      proof_status
      proof_sent_at
      items {
        id
        productName
        quantity
        totalPrice
      }
    }
  }
`;

// GraphQL query to get all orders for a customer by email
const GET_ORDERS_BY_EMAIL = gql`
  query GetAllOrders {
    getAllOrders {
      id
      userId
      guestEmail
      orderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      orderCreatedAt
      createdAt
      proof_status
      proof_sent_at
      items {
        id
        productName
        quantity
        totalPrice
      }
    }
  }
`;

// Admin check
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

export default function CustomerDetail() {
  const router = useRouter();
  const { customerId } = router.query;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  // Get all orders first
  const { data: allOrdersData, loading: ordersLoading, error } = useQuery(GET_ORDERS_BY_EMAIL);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  // Extract customer email from customerId (which is the email)
  useEffect(() => {
    if (customerId && typeof customerId === 'string') {
      setCustomerEmail(decodeURIComponent(customerId));
    }
  }, [customerId]);

  // Filter orders for this customer
  const customerOrders = React.useMemo(() => {
    if (!allOrdersData?.getAllOrders || !customerEmail) return [];
    
    return allOrdersData.getAllOrders.filter((order: Order) => 
      order.customerEmail?.toLowerCase() === customerEmail.toLowerCase()
    ).sort((a: Order, b: Order) => {
      const dateA = new Date(a.orderCreatedAt || a.createdAt || '').getTime();
      const dateB = new Date(b.orderCreatedAt || b.createdAt || '').getTime();
      return dateB - dateA; // Most recent first
    });
  }, [allOrdersData, customerEmail]);

  // Calculate customer stats (paid orders only)
  const customerStats = React.useMemo(() => {
    if (!customerOrders.length) return null;
    
    // Filter to only include paid orders for stats calculation
    const paidOrders = customerOrders.filter((order: Order) => order.financialStatus === 'paid');
    
    if (!paidOrders.length) {
      // If no paid orders, show basic info from any order
      const anyOrder = customerOrders[0];
      return {
        firstName: anyOrder.customerFirstName,
        lastName: anyOrder.customerLastName,
        email: customerEmail,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        firstOrderDate: null,
        lastOrderDate: null
      };
    }
    
    const totalSpent = paidOrders.reduce((sum: number, order: Order) => sum + (order.totalPrice || 0), 0);
    const averageOrderValue = totalSpent / paidOrders.length;
    const firstOrder = paidOrders[paidOrders.length - 1];
    const lastOrder = paidOrders[0];
    
    return {
      firstName: lastOrder.customerFirstName,
      lastName: lastOrder.customerLastName,
      email: customerEmail,
      totalOrders: paidOrders.length,
      totalSpent,
      averageOrderValue,
      firstOrderDate: firstOrder.orderCreatedAt || firstOrder.createdAt,
      lastOrderDate: lastOrder.orderCreatedAt || lastOrder.createdAt
    };
  }, [customerOrders, customerEmail]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'fulfilled':
      case 'complete':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'pending':
      case 'unfulfilled':
      case 'processing':
        return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
      case 'cancelled':
      case 'failed':
        return 'bg-red-900 bg-opacity-40 text-red-300';
      default:
        return 'bg-gray-800 bg-opacity-40 text-gray-300';
    }
  };

  // Get proof status
  const getProofStatus = (order: Order) => {
    if (order.proof_status === 'awaiting_approval') {
      return 'Awaiting Approval';
    }
    if (order.proof_status === 'approved') {
      return 'Proof Approved';
    }
    return 'Building Proof';
  };

  // Get proof status color
  const getProofStatusColor = (status: string) => {
    switch (status) {
      case 'Building Proof':
        return 'bg-yellow-400';
      case 'Awaiting Approval':
        return 'bg-cyan-400';
      case 'Proof Approved':
        return 'bg-green-400';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">Error Loading Customer</h3>
            <p className="text-sm text-gray-400">{error.message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style jsx global>{`
        .table-row-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .table-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stat-card:hover {
          transform: scale(1.02);
        }
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="w-full pt-4 sm:pt-6 xl:pt-8 pb-8">
          <div className="w-full px-4 sm:px-6 xl:px-8">
            {/* Header */}
            <div className="flex items-center gap-3 xl:gap-4 mb-6 xl:mb-8">
              <button
                onClick={() => router.push('/admin/customers')}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Back to customers"
              >
                <svg className="h-5 w-5 xl:h-6 xl:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white truncate">
                  {customerStats?.firstName} {customerStats?.lastName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 truncate">{customerEmail}</p>
              </div>
            </div>

            {/* Customer Stats */}
            {customerStats && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4 mb-6 xl:mb-8">
                <div className="stat-card p-4 xl:p-6">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 xl:mb-2">Total Orders</div>
                  <div className="text-xl xl:text-2xl font-bold text-white">{customerStats.totalOrders}</div>
                </div>
                
                <div className="stat-card p-4 xl:p-6">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 xl:mb-2">Total Spent</div>
                  <div className="text-lg xl:text-2xl font-bold" style={{ color: '#86efac' }}>
                    {formatCurrency(customerStats.totalSpent)}
                  </div>
                </div>
                
                <div className="stat-card p-4 xl:p-6">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 xl:mb-2">Avg Order</div>
                  <div className="text-lg xl:text-2xl font-bold text-white">
                    {formatCurrency(customerStats.averageOrderValue)}
                  </div>
                </div>
                
                <div className="stat-card p-4 xl:p-6">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 xl:mb-2">Since</div>
                  <div className="text-sm xl:text-lg font-medium text-white">
                    {new Date(customerStats.firstOrderDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Orders Section */}
            <div className="glass-container overflow-hidden">
              <div className="px-4 xl:px-6 py-3 xl:py-4 border-b border-gray-700">
                <h2 className="text-base xl:text-lg font-semibold text-white">Order History</h2>
              </div>
              
              {/* Mobile Order List */}
              <div className="xl:hidden">
                {customerOrders.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {customerOrders.map((order: Order) => {
                      const totalItems = order.items?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0;
                      
                      return (
                        <div
                          key={order.id}
                          className="p-4 transition-all duration-200 active:scale-[0.98]"
                          onClick={() => router.push(`/admin/orders/${order.orderNumber || order.id}`)}
                        >
                          {/* Order Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                #{order.orderNumber || order.id.split('-')[0].toUpperCase()}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {formatDate(order.orderCreatedAt)}
                              </div>
                            </div>
                            <div className="text-base font-semibold" style={{ color: '#86efac' }}>
                              {formatCurrency(order.totalPrice)}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`rounded-full ${getProofStatusColor(getProofStatus(order))}`}
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  minWidth: '6px',
                                  minHeight: '6px',
                                  boxShadow: '0 0 8px currentColor'
                                }}
                              ></div>
                              <span className="text-xs text-gray-300">{getProofStatus(order)}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
                      <p className="text-sm">This customer hasn't placed any orders yet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((order: Order) => {
                      const totalItems = order.items?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0;
                      
                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer table-row-hover"
                          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                          onClick={() => router.push(`/admin/orders/${order.orderNumber || order.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-white">
                              #{order.orderNumber || order.id.split('-')[0].toUpperCase()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300">
                              {formatDate(order.orderCreatedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`rounded-full ${getProofStatusColor(getProofStatus(order))}`}
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  minWidth: '8px',
                                  minHeight: '8px',
                                  boxShadow: '0 0 10px currentColor'
                                }}
                              ></div>
                              <span className="text-xs text-gray-300">{getProofStatus(order)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300">
                              {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold" style={{ color: '#86efac' }}>
                              {formatCurrency(order.totalPrice)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/orders/${order.orderNumber || order.id}`);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all hover:bg-opacity-80"
                              style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                border: '1px solid rgba(168, 85, 247, 0.4)'
                              }}
                            >
                              View Order
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {customerOrders.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
                      <p className="text-sm">This customer hasn't placed any orders yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 