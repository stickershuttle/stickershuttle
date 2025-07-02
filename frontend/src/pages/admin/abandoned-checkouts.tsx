import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import AIFileImage from '@/components/AIFileImage';
import { useQuery, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';

// GraphQL query to get unpaid orders (abandoned checkouts)
const GET_ABANDONED_CHECKOUTS = gql`
  query GetAbandonedCheckouts {
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
      orderTags
      orderNote
      orderCreatedAt
      orderUpdatedAt
      createdAt
      updatedAt
      items {
        id
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
      }
    }
  }
`;

// Admin emails - same as in orders.tsx
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface Order {
  id: string;
  userId?: string;
  guestEmail?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  orderNumber?: string;
  orderStatus: string;
  fulfillmentStatus: string;
  financialStatus: string;
  trackingNumber?: string;
  trackingCompany?: string;
  trackingUrl?: string;
  subtotalPrice?: number;
  totalTax?: number;
  totalPrice: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  billingAddress?: any;
  orderCreatedAt?: string;
  createdAt?: string;
  orderNote?: string;
  items: Array<{
    id: string;
    productName: string;
    productCategory?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    calculatorSelections?: any;
    customFiles?: string[];
    customerNotes?: string;
    instagramHandle?: string;
    instagramOptIn?: boolean;
  }>;
}

// Define column configuration
const defaultColumns = [
  { id: 'status', name: 'Status', width: 'pl-6 pr-3', align: 'left' },
  { id: 'image', name: 'Image', width: 'px-3', align: 'left' },
  { id: 'total', name: 'Total', width: 'px-3', align: 'left' },
  { id: 'checkout', name: 'Checkout', width: 'px-3', align: 'left' },
  { id: 'customer', name: 'Customer', width: 'px-3', align: 'left' },
  { id: 'qty', name: 'QTY', width: 'px-3', align: 'left' },
  { id: 'items', name: 'Items', width: 'pl-4 pr-2', align: 'left' },
  { id: 'abandoned', name: 'Abandoned', width: 'px-3', align: 'left' },
  { id: 'actions', name: 'Actions', width: 'px-6', align: 'center' }
];

export default function AbandonedCheckouts() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [columns, setColumns] = useState(defaultColumns);

  const { data, loading: ordersLoading, error } = useQuery(GET_ABANDONED_CHECKOUTS);

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

        // Check if user email is in admin list
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

  // Filter for abandoned checkouts (unpaid orders)
  const abandonedCheckouts = React.useMemo(() => {
    if (!data?.getAllOrders) return [];

    let orders = data.getAllOrders.filter((order: Order) => 
      order.financialStatus !== 'paid' && 
      order.financialStatus !== 'refunded' &&
      order.financialStatus !== 'partially_refunded'
    );

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      orders = orders.filter((order: Order) =>
        order.orderNumber?.toLowerCase().includes(search) ||
        order.customerEmail?.toLowerCase().includes(search) ||
        order.customerFirstName?.toLowerCase().includes(search) ||
        order.customerLastName?.toLowerCase().includes(search) ||
        order.id.toLowerCase().includes(search)
      );
    }

    // Apply time range filter
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (selectedTimeRange) {
        case '24h':
          cutoffDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
      }
      
      orders = orders.filter((order: Order) => {
        const orderDate = new Date(order.orderCreatedAt || order.createdAt || '');
        return orderDate >= cutoffDate;
      });
    }

    // Sort orders
    orders.sort((a: Order, b: Order) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.orderCreatedAt || a.createdAt || '').getTime() -
            new Date(b.orderCreatedAt || b.createdAt || '').getTime();
          break;
        case 'total':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'checkout':
          const aCheckoutNum = a.orderNumber || a.id;
          const bCheckoutNum = b.orderNumber || b.id;
          comparison = aCheckoutNum.localeCompare(bCheckoutNum);
          break;
        case 'customer':
          const aCustomer = `${a.customerFirstName} ${a.customerLastName}`;
          const bCustomer = `${b.customerFirstName} ${b.customerLastName}`;
          comparison = aCustomer.localeCompare(bCustomer);
          break;
        case 'qty':
          const aQty = a.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const bQty = b.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          comparison = aQty - bQty;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return orders;
  }, [data, searchTerm, sortColumn, sortDirection, selectedTimeRange]);

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

  // Get time elapsed since abandonment
  const getTimeElapsed = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const now = new Date();
    const abandonedDate = new Date(dateString);
    const diffMs = now.getTime() - abandonedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
  };

  // Get status color for abandoned checkouts
  const getStatusColor = (order: Order) => {
    const abandonedDate = new Date(order.orderCreatedAt || order.createdAt || '');
    const now = new Date();
    const diffHours = (now.getTime() - abandonedDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
    } else if (diffHours < 72) {
      return 'bg-orange-900 bg-opacity-40 text-orange-300';
    } else {
      return 'bg-red-900 bg-opacity-40 text-red-300';
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Group items by product name
  const groupItemsByProduct = (items: Order['items']) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.productName;
      if (!acc[key]) {
        acc[key] = { ...item, totalQuantity: 0 };
      }
      acc[key].totalQuantity += item.quantity;
      return acc;
    }, {} as Record<string, Order['items'][0] & { totalQuantity: number }>);
    
    return Object.values(grouped);
  };

  // Handle column sorting
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calculate potential revenue
  const potentialRevenue = abandonedCheckouts.reduce((sum: number, order: Order) => sum + order.totalPrice, 0);
  const recoveryRate = 0.1; // Assume 10% recovery rate
  const estimatedRecoverable = potentialRevenue * recoveryRate;

  if (loading || ordersLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
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
        
        .sort-indicator {
          transition: all 0.2s ease;
        }
        
        .filter-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        /* Hide scrollbar for filter pills */
        .filter-pills-container {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        .filter-pills-container::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
        
        @media (max-width: 768px) {
          .mobile-order-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-order-card:active {
            transform: scale(0.98);
          }
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="pt-8 pb-8">
          <div className="w-full pl-2 pr-8"> {/* Reduced left padding, keep right padding */}
            {/* Analytics Cards - Hidden on mobile, shown on desktop */}
            <div className="hidden xl:grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total Abandoned</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold transition-all duration-200 hover:scale-105 text-white">
                      {abandonedCheckouts.length}
                    </p>
                    <p className="text-xs text-red-400 mt-1">Active carts</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Potential Revenue</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#fbbf24' }}>
                      {formatCurrency(potentialRevenue)}
                    </p>
                    <p className="text-xs text-yellow-400 mt-1">Lost revenue</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Est. Recoverable</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                      {formatCurrency(estimatedRecoverable)}
                    </p>
                    <p className="text-xs text-green-400 mt-1">~{(recoveryRate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Avg. Cart Value</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                      {abandonedCheckouts.length > 0 
                        ? formatCurrency(potentialRevenue / abandonedCheckouts.length)
                        : '$0.00'
                      }
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Per cart</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Analytics Cards - Compact 2 column layout */}
            <div className="xl:hidden grid grid-cols-2 gap-3 mb-4">
              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Total Abandoned</div>
                <div className="text-lg font-bold text-white">{abandonedCheckouts.length}</div>
                <div className="text-xs text-red-400 mt-1">Active carts</div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Potential</div>
                <div className="text-lg font-bold" style={{ color: '#fbbf24' }}>
                  {formatCurrency(potentialRevenue)}
                </div>
                <div className="text-xs text-yellow-400 mt-1">Lost revenue</div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Recoverable</div>
                <div className="text-lg font-bold" style={{ color: '#86efac' }}>
                  {formatCurrency(estimatedRecoverable)}
                </div>
                <div className="text-xs text-green-400 mt-1">~{(recoveryRate * 100).toFixed(0)}%</div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Avg. Cart</div>
                <div className="text-lg font-bold text-white">
                  {abandonedCheckouts.length > 0 
                    ? formatCurrency(potentialRevenue / abandonedCheckouts.length)
                    : '$0.00'
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">Per cart</div>
              </div>
            </div>

            {/* Mobile/Tablet Filters */}
            <div className="xl:hidden mb-4 px-4">
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Filter pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 filter-pills-container">
                  <button 
                    onClick={() => setSelectedTimeRange('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                      selectedTimeRange === 'all' 
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                        : 'bg-transparent text-gray-400 border-gray-600'
                    }`}
                  >
                    All Time
                  </button>
                  <button 
                    onClick={() => setSelectedTimeRange('24h')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                      selectedTimeRange === '24h' 
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                        : 'bg-transparent text-gray-400 border-gray-600'
                    }`}
                  >
                    Last 24h
                  </button>
                  <button 
                    onClick={() => setSelectedTimeRange('7d')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                      selectedTimeRange === '7d' 
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                        : 'bg-transparent text-gray-400 border-gray-600'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button 
                    onClick={() => setSelectedTimeRange('30d')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                      selectedTimeRange === '30d' 
                        ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                        : 'bg-transparent text-gray-400 border-gray-600'
                    }`}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Compact Filters */}
            <div className="hidden xl:flex justify-end items-center gap-3 mb-4">
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTimeRange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeRange === 'all'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: selectedTimeRange === 'all' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: `1px solid ${selectedTimeRange === 'all' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: selectedTimeRange === 'all' 
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                  }}
                >
                  All Time
                </button>
                <button
                  onClick={() => setSelectedTimeRange('24h')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeRange === '24h'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: selectedTimeRange === '24h' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: `1px solid ${selectedTimeRange === '24h' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: selectedTimeRange === '24h' 
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                  }}
                >
                  Last 24h
                </button>
                <button
                  onClick={() => setSelectedTimeRange('7d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeRange === '7d'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: selectedTimeRange === '7d' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: `1px solid ${selectedTimeRange === '7d' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: selectedTimeRange === '7d' 
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                  }}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setSelectedTimeRange('30d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeRange === '30d'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: selectedTimeRange === '30d' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: `1px solid ${selectedTimeRange === '30d' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: selectedTimeRange === '30d' 
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                  }}
                >
                  Last 30 Days
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search checkouts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                  style={{ minWidth: '200px' }}
                />
                <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden xl:block rounded-2xl overflow-hidden glass-container">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className="border-b border-gray-700 sticky top-0 z-20"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(255, 255, 255, 0.1) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    <tr>
                      {columns.map((column) => (
                        <th 
                          key={column.id}
                          className={`${column.width} py-4 text-${column.align} cursor-pointer hover:text-white transition-colors`}
                          onClick={() => column.id !== 'actions' && column.id !== 'image' && handleColumnSort(column.id)}
                        >
                          <div className={`flex items-center gap-1 ${column.align === 'center' ? 'justify-center' : ''}`}>
                            <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                              {column.name}
                            </span>
                            {column.id !== 'actions' && column.id !== 'image' && (
                              <svg className={`w-3 h-3 ${sortColumn === column.id ? 'text-purple-400 opacity-100' : 'text-gray-600 opacity-0'} ${sortDirection === 'desc' ? 'rotate-180' : ''} transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedCheckouts.map((order: Order) => {
                      const firstItem = order.items[0] || {};
                      const firstItemSelections = firstItem.calculatorSelections || {};
                      const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

                      return (
                        <tr 
                          key={order.id}
                          className="border-t border-gray-800 hover:bg-gray-800 hover:bg-opacity-30 transition-all duration-200 table-row-hover cursor-pointer"
                          onClick={() => router.push(`/admin/orders/${order.orderNumber || order.id}`)}
                        >
                          {/* Status */}
                          <td className="pl-6 pr-3 py-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`rounded-full ${getStatusColor(order)}`}
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  minWidth: '8px',
                                  minHeight: '8px',
                                  boxShadow: '0 0 10px currentColor',
                                  position: 'relative',
                                  zIndex: 10
                                }}
                              ></div>
                              <span className="text-xs text-gray-300 font-medium">Abandoned</span>
                            </div>
                          </td>
                          {/* Image Preview */}
                          <td className="px-3 py-4">
                            <div className="flex gap-2">
                              {order.items.slice(0, 2).map((item: any, index: number) => {
                                const itemImage = item.customFiles?.[0] || null;
                                
                                return (
                                  <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                    <div
                                      className="rounded-lg relative overflow-hidden flex items-center justify-center"
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                      }}
                                    >
                                      {itemImage ? (
                                        <AIFileImage
                                          src={itemImage}
                                          filename={itemImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                          alt="Design preview"
                                          className="w-full h-full object-contain p-2"
                                          size="thumbnail"
                                          showFileType={false}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <span className="text-gray-500 text-xs">📄</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {order.items.length > 2 && (
                                <div 
                                  className="flex items-center justify-center rounded-lg text-gray-400 text-xs font-medium"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
                                  +{order.items.length - 2}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Total */}
                          <td className="px-3 py-4">
                            <div className="text-base font-semibold" style={{ color: '#fbbf24' }}>
                              {formatCurrency(order.totalPrice)}
                            </div>
                          </td>
                          {/* Checkout Info */}
                          <td className="px-3 py-4">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {order.orderNumber || `#${order.id.split('-')[0].toUpperCase()}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {order.stripeCheckoutSessionId ? 'Stripe' : 'Direct'}
                              </div>
                            </div>
                          </td>
                          {/* Customer Info */}
                          <td className="px-3 py-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {order.customerFirstName} {order.customerLastName}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 relative">
                                <span className="text-xs text-gray-400">{order.customerEmail || order.guestEmail}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(order.customerEmail || order.guestEmail || '');
                                  }}
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Copy email"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                {copiedEmail === (order.customerEmail || order.guestEmail) && (
                                  <span
                                    className="absolute left-0 bottom-full mb-1 text-xs text-green-400 bg-gray-900 px-2 py-1 rounded"
                                    style={{
                                      opacity: 0.9,
                                      transition: 'opacity 0.3s ease-in-out',
                                      pointerEvents: 'none'
                                    }}
                                  >
                                    Copied
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Quantity */}
                          <td className="px-3 py-4">
                            <div className="text-base text-white">
                              {totalQuantity}
                            </div>
                          </td>
                          {/* Items */}
                          <td className="pl-4 pr-2 py-4">
                            <div className="space-y-1">
                              {groupItemsByProduct(order.items).map((item: any, idx: number) => (
                                <div key={idx}>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-purple-300"
                                    style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                                    {item.productName} {item.totalQuantity > 1 ? `x${item.totalQuantity}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          {/* Abandoned Time */}
                          <td className="px-3 py-4">
                            <div>
                              <div className="text-sm text-white">
                                {getTimeElapsed(order.orderCreatedAt || order.createdAt)}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {formatDate(order.orderCreatedAt || order.createdAt)}
                              </div>
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/orders/${order.orderNumber || order.id}`);
                              }}
                              className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Empty State */}
                {abandonedCheckouts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-white mb-1">No abandoned checkouts found</h3>
                      <p className="text-sm">Great! All carts have been converted or cleared</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="xl:hidden space-y-4">
              {abandonedCheckouts.map((order: Order) => (
                <div 
                  key={order.id} 
                  className="mobile-order-card rounded-xl p-4 transition-all duration-300 hover:shadow-xl cursor-pointer"
                  onClick={() => router.push(`/admin/orders/${order.orderNumber || order.id}`)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-base font-medium text-white">
                        #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div
                          className={`rounded-full ${getStatusColor(order)}`}
                          style={{
                            width: '6px',
                            height: '6px',
                            boxShadow: '0 0 8px currentColor'
                          }}
                        ></div>
                        <span className="text-xs text-gray-400">
                          Abandoned {getTimeElapsed(order.orderCreatedAt || order.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-bold" style={{ color: '#fbbf24' }}>
                      {formatCurrency(order.totalPrice)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-3">
                    <div className="text-sm text-white">
                      {order.customerFirstName} {order.customerLastName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {order.customerEmail || order.guestEmail}
                    </div>
                  </div>

                  {/* Items with Images */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item: any, index: number) => {
                        const itemImage = item.customFiles?.[0] || null;
                        return (
                          <div 
                            key={`mobile-preview-${item.id}-${index}`}
                            className="rounded-lg overflow-hidden border-2 border-gray-800"
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            {itemImage ? (
                              <AIFileImage
                                src={itemImage}
                                filename={itemImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                alt="Design preview"
                                className="w-full h-full object-contain p-1"
                                size="thumbnail"
                                showFileType={false}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-500 text-xs">📄</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-sm text-gray-300">
                      {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1 pb-3 border-b border-gray-700 border-opacity-30">
                    <div className="text-xs text-gray-500">
                      {order.items[0]?.productName || 'Unknown Product'}
                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-3">
                    <div className="text-xs text-gray-400">
                      {formatDate(order.orderCreatedAt || order.createdAt)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/orders/${order.orderNumber || order.id}`);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}

              {abandonedCheckouts.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400">No abandoned checkouts found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 