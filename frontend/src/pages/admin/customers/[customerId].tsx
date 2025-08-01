import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../../lib/supabase';
import { GET_USER_PROFILE, UPDATE_TAX_EXEMPTION, UPDATE_WHOLESALE_STATUS } from '../../../lib/profile-mutations';
import { ADD_USER_CREDITS, GET_USER_CREDIT_BALANCE, GET_USER_CREDIT_HISTORY } from '../../../lib/credit-mutations';

// Import GET_ALL_CUSTOMERS query
const GET_ALL_CUSTOMERS = gql`
  query GetAllCustomers {
    getAllCustomers {
      id
      email
      firstName
      lastName
      city
      state
      country
      totalOrders
      totalSpent
      averageOrderValue
      marketingOptIn
      lastOrderDate
      firstOrderDate
    }
  }
`;

// Import GET_ALL_USERS_WITH_ORDER_STATS query
const GET_ALL_USERS_WITH_ORDER_STATS = gql`
  query GetAllUsersWithOrderStats {
    getAllUsersWithOrderStats {
      id
      email
      firstName
      lastName
      city
      state
      country
      totalOrders
      totalSpent
      averageOrderValue
      marketingOptIn
      lastOrderDate
      firstOrderDate
    }
  }
`;

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
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [taxExemptLoading, setTaxExemptLoading] = useState(false);
  const [wholesaleLoading, setWholesaleLoading] = useState(false);
  
  // Credit management states
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  // Get all orders first
  const { data: allOrdersData, loading: ordersLoading, error } = useQuery(GET_ORDERS_BY_EMAIL);
  
  // Get all customers to find the user ID
  const { data: customersData } = useQuery(GET_ALL_CUSTOMERS);
  
  // Get all users (including those who haven't ordered) to find the user ID
  const { data: allUsersData } = useQuery(GET_ALL_USERS_WITH_ORDER_STATS);
  
  // Get user profile if we have a user ID
  const { data: userProfileData, refetch: refetchUserProfile, loading: userProfileLoading, error: userProfileError } = useQuery(GET_USER_PROFILE, {
    variables: { userId: customerUserId },
    skip: !customerUserId
  });
  
  // Get user's credit balance if we have a user ID
  const { data: creditBalanceData, refetch: refetchCreditBalance, loading: creditBalanceLoading } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: customerUserId },
    skip: !customerUserId
  });
  
  // Get user's credit history to show credits earned from orders
  const { data: creditHistoryData, loading: creditHistoryLoading } = useQuery(GET_USER_CREDIT_HISTORY, {
    variables: { userId: customerUserId, limit: 100 },
    skip: !customerUserId
  });



  // Update tax exemption mutation
  const [updateTaxExemption] = useMutation(UPDATE_TAX_EXEMPTION);
  
  // Update wholesale status mutation
  const [updateWholesaleStatus] = useMutation(UPDATE_WHOLESALE_STATUS);
  
  // Add user credits mutation
  const [addUserCredits] = useMutation(ADD_USER_CREDITS);

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

  // Find customer user ID from customers data or all users data
  useEffect(() => {
    if (customerEmail) {
      let customer = null;
      
      // First try to find in customers who have ordered
      if (customersData?.getAllCustomers) {
        customer = customersData.getAllCustomers.find(
          (c: any) => c.email.toLowerCase() === customerEmail.toLowerCase()
        );
      }
      
      // If not found, try to find in all users (including those who haven't ordered)
      if (!customer && allUsersData?.getAllUsersWithOrderStats) {
        customer = allUsersData.getAllUsersWithOrderStats.find(
          (c: any) => c.email.toLowerCase() === customerEmail.toLowerCase()
        );
      }
      
      if (customer) {
        setCustomerUserId(customer.id);
      }
    }
  }, [customersData, allUsersData, customerEmail]);

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

  // Create a mapping of order IDs to credits earned from those orders
  const orderCreditsMap = React.useMemo(() => {
    if (!creditHistoryData?.getUserCreditHistory) return {};
    
    const map: { [key: string]: number } = {};
    
    creditHistoryData.getUserCreditHistory.forEach((transaction: any) => {
      // Only include 'earned' credits that are linked to orders
      if (transaction.transactionType === 'earned' && transaction.orderId) {
        map[transaction.orderId] = parseFloat(transaction.amount) || 0;
      }
    });
    
    return map;
  }, [creditHistoryData]);

  // Calculate customer stats (paid orders only)
  const customerStats = React.useMemo(() => {
    // Get customer info from either customers or all users data
    let customer = null;
    if (customersData?.getAllCustomers && customerEmail) {
      customer = customersData.getAllCustomers.find(
        (c: any) => c.email.toLowerCase() === customerEmail.toLowerCase()
      );
    }
    if (!customer && allUsersData?.getAllUsersWithOrderStats && customerEmail) {
      customer = allUsersData.getAllUsersWithOrderStats.find(
        (c: any) => c.email.toLowerCase() === customerEmail.toLowerCase()
      );
    }
    
    if (!customer && !customerOrders.length) return null;
    
    // Filter to only include paid orders for stats calculation
    const paidOrders = customerOrders.filter((order: Order) => order.financialStatus === 'paid');
    
    if (!paidOrders.length) {
      // If no paid orders, show basic info from customer data or any order
      if (customer) {
        return {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customerEmail,
          totalOrders: customer.totalOrders || 0,
          totalSpent: customer.totalSpent || 0,
          averageOrderValue: customer.averageOrderValue || 0,
          firstOrderDate: customer.firstOrderDate || null,
          lastOrderDate: customer.lastOrderDate || null
        };
      } else if (customerOrders.length > 0) {
        // Fallback to order data if no customer data
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
      return null;
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
  }, [customerOrders, customerEmail, customersData, allUsersData]);

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

  // Handle tax exemption toggle
  const handleTaxExemptionToggle = async (isExempt: boolean) => {
    if (!customerUserId) return;
    
    setTaxExemptLoading(true);
    try {
      const { data } = await updateTaxExemption({
        variables: {
          userId: customerUserId,
          input: {
            isTaxExempt: isExempt,
            taxExemptId: isExempt ? 'ADMIN_OVERRIDE' : null,
            taxExemptReason: isExempt ? 'Admin override' : null,
            taxExemptExpiresAt: null
          }
        }
      });

      if (data?.updateTaxExemption?.success) {
        await refetchUserProfile();
        console.log('✅ Tax exemption updated successfully');
      } else {
        console.error('❌ Failed to update tax exemption:', data?.updateTaxExemption?.message);
      }
    } catch (error) {
      console.error('❌ Error updating tax exemption:', error);
    } finally {
      setTaxExemptLoading(false);
    }
  };

  // Handle wholesale status toggle
  const handleWholesaleStatusToggle = async (isWholesale: boolean) => {
    if (!customerUserId) return;

    setWholesaleLoading(true);
    try {
      const { data } = await updateWholesaleStatus({
        variables: {
          userId: customerUserId,
          isWholesaleCustomer: isWholesale,
          wholesaleCreditRate: isWholesale ? 0.025 : 0.05 // 2.5% for wholesale, 5% for retail
        }
      });

      if (data?.updateWholesaleStatus?.success) {
        await refetchUserProfile();
        console.log('✅ Wholesale status updated successfully');
      } else {
        console.error('❌ Failed to update wholesale status:', data?.updateWholesaleStatus?.message);
      }
    } catch (error) {
      console.error('❌ Error updating wholesale status:', error);
    } finally {
      setWholesaleLoading(false);
    }
  };

  // Handle adding credits
  const handleAddCredits = async () => {
    if (!customerUserId) return;
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter a valid credit amount');
      return;
    }

    setCreditLoading(true);
    try {
      const { data } = await addUserCredits({
        variables: {
          userId: customerUserId,
          amount: parseFloat(creditAmount),
          reason: creditReason || 'Store credit added by admin'
        }
      });

      if (data?.addCredits?.success) {
        await refetchCreditBalance();
        setShowAddCreditModal(false);
        setCreditAmount('');
        setCreditReason('');
        console.log('✅ Credits added successfully');
      } else {
        console.error('❌ Failed to add credits:', data?.addCredits?.message);
        alert(data?.addCredits?.message || 'Failed to add credits');
      }
    } catch (error) {
      console.error('❌ Error adding credits:', error);
      alert('Failed to add credits');
    } finally {
      setCreditLoading(false);
    }
  };

  // Handle closing add credit modal
  const handleCloseAddCreditModal = () => {
    setShowAddCreditModal(false);
    setCreditAmount('');
    setCreditReason('');
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
                    {customerStats.firstOrderDate ? 
                      new Date(customerStats.firstOrderDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                      'No orders yet'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Tax Exemption Toggle */}
            {customerUserId && (
              <div className="glass-container p-4 xl:p-6 mb-6 xl:mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">Tax Exempt</h3>
                      <p className="text-sm text-gray-400">Customer will not be charged tax at checkout</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(taxExemptLoading || userProfileLoading) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                    )}
                    {userProfileError && (
                      <span className="text-xs text-red-400">Error loading profile</span>
                    )}
                    {!userProfileLoading && !userProfileError && (
                      <>
                        <button
                          onClick={() => handleTaxExemptionToggle(!(userProfileData?.getUserProfile?.isTaxExempt || false))}
                          disabled={taxExemptLoading || userProfileLoading}
                          aria-label={`Toggle tax exemption ${userProfileData?.getUserProfile?.isTaxExempt ? 'off' : 'on'}`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
                            userProfileData?.getUserProfile?.isTaxExempt 
                              ? 'bg-purple-600' 
                              : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              userProfileData?.getUserProfile?.isTaxExempt ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-300">
                          {userProfileData?.getUserProfile?.isTaxExempt ? 'Exempt' : 'Taxable'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {userProfileData?.getUserProfile?.isTaxExempt && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-purple-300">
                        Tax exemption is active - no tax will be collected at checkout
                      </span>
                    </div>
                  </div>
                )}
                {!userProfileLoading && !userProfileData?.getUserProfile && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-yellow-300">
                        No user profile found - customer may be guest-only
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wholesale Status Toggle */}
            {customerUserId && (
              <div className="glass-container p-4 xl:p-6 mb-6 xl:mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                                         <div>
                       <h3 className="text-base font-medium text-white">Wholesale Status</h3>
                       <p className="text-sm text-gray-400">Wholesale customers get 15% discount, 2.5% credit rate, and free blind shipment</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(wholesaleLoading || userProfileLoading) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                    )}
                    {userProfileError && (
                      <span className="text-xs text-red-400">Error loading profile</span>
                    )}
                    {!userProfileLoading && !userProfileError && (
                      <>
                        <button
                          onClick={() => handleWholesaleStatusToggle(!(userProfileData?.getUserProfile?.isWholesaleCustomer || false))}
                          disabled={wholesaleLoading || userProfileLoading}
                          aria-label={`Toggle wholesale status ${userProfileData?.getUserProfile?.isWholesaleCustomer ? 'off' : 'on'}`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
                            userProfileData?.getUserProfile?.isWholesaleCustomer 
                              ? 'bg-purple-600' 
                              : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              userProfileData?.getUserProfile?.isWholesaleCustomer ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-300">
                          {userProfileData?.getUserProfile?.isWholesaleCustomer ? 'Wholesale' : 'Retail'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {userProfileData?.getUserProfile?.isWholesaleCustomer && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                                             <span className="text-sm text-blue-300">
                         This customer is a wholesale account ({userProfileData?.getUserProfile?.wholesaleStatus || 'approved'}). They will receive wholesale pricing and 15% discount.
                      </span>
                    </div>
                  </div>
                )}
                {!userProfileLoading && !userProfileData?.getUserProfile && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-yellow-300">
                        No user profile found - customer may be guest-only
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Credit Management Section */}
            {customerUserId && (
              <div className="glass-container p-4 xl:p-6 mb-6 xl:mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">Store Credits</h3>
                      <p className="text-sm text-gray-400">Current balance: {creditBalanceLoading ? 'Loading...' : formatCurrency(creditBalanceData?.getUserCreditBalance?.balance || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {creditBalanceLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                    )}
                    <button
                      onClick={() => setShowAddCreditModal(true)}
                      className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      Add Credits
                    </button>
                  </div>
                </div>
                {creditBalanceData?.getUserCreditBalance?.balance > 0 && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-300">
                        Customer has {formatCurrency(creditBalanceData?.getUserCreditBalance?.balance || 0)} in store credits available
                      </span>
                    </div>
                  </div>
                )}
                {!creditBalanceLoading && !creditBalanceData?.getUserCreditBalance && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-yellow-300">
                        No credit information found - customer may be guest-only
                      </span>
                    </div>
                  </div>
                )}
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
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-400">
                                {totalItems} item{totalItems !== 1 ? 's' : ''}
                              </div>
                              {creditHistoryLoading ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/20 rounded-full">
                                  <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-400"></div>
                                  <span className="text-xs text-gray-400">Loading...</span>
                                </div>
                              ) : orderCreditsMap[order.id] && order.financialStatus === 'paid' && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  <span className="text-xs text-green-300 font-medium">
                                    +{formatCurrency(orderCreditsMap[order.id])}
                                  </span>
                                </div>
                              )}
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Credits Earned
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
                          <td className="px-6 py-4">
                            {creditHistoryLoading ? (
                              <div className="flex items-center gap-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                                <span className="text-xs text-gray-500">Loading...</span>
                              </div>
                            ) : orderCreditsMap[order.id] && order.financialStatus === 'paid' ? (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                <span className="text-sm font-medium text-green-300">
                                  +{formatCurrency(orderCreditsMap[order.id])}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {order.financialStatus === 'paid' ? 'None' : '-'}
                              </span>
                            )}
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

        {/* Add Credits Modal */}
        {showAddCreditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg p-6 w-full max-w-md"
                 style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                   backdropFilter: 'blur(12px)'
                 }}>
              <h3 className="text-xl font-bold text-white mb-4">Add Store Credits</h3>
              <div className="mb-4">
                <label htmlFor="creditAmount" className="block text-sm font-medium text-gray-300 mb-1">Credit Amount ($)</label>
                <input
                  type="number"
                  id="creditAmount"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="creditReason" className="block text-sm font-medium text-gray-300 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  id="creditReason"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Store credit added by admin"
                  className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCloseAddCreditModal}
                  className="px-4 py-2 text-white rounded hover:bg-gray-700 transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCredits}
                  className="px-4 py-2 text-white rounded transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                  disabled={creditLoading}
                >
                  {creditLoading ? 'Adding...' : 'Add Credits'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 