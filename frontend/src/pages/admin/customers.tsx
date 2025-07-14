import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import { UPDATE_USER_PROFILE_NAMES } from '../../lib/profile-mutations';

// GraphQL query to get all customers
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

// Admin check - add your admin email(s) here
const ADMIN_EMAILS = ['justin@stickershuttle.com']; // Add all admin emails here

interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  marketingOptIn: boolean;
  lastOrderDate?: string;
  firstOrderDate?: string;
}

export default function AdminCustomers() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarketingStatus, setFilterMarketingStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('lastOrder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  
  // Name editing modal states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const { data, loading: customersLoading, error, refetch } = useQuery(GET_ALL_CUSTOMERS);
  const [updateUserProfileNames] = useMutation(UPDATE_USER_PROFILE_NAMES);

  // Debug logging
  useEffect(() => {
    console.log('Customers Query Debug:', {
      loading: customersLoading,
      error,
      data,
      customers: data?.getAllCustomers
    });
  }, [customersLoading, error, data]);

  // Handle opening edit modal
  const handleEditCustomerName = (customer: Customer, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click navigation
    setEditingCustomer(customer);
    setEditFirstName(customer.firstName || '');
    setEditLastName(customer.lastName || '');
    setEditError(null);
    setEditSuccess(false);
  };

  // Handle saving customer name
  const handleSaveCustomerName = async () => {
    if (!editingCustomer) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const result = await updateUserProfileNames({
        variables: {
          userId: editingCustomer.id,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim()
        }
      });

      if (result.data?.updateUserProfileNames?.success) {
        setEditSuccess(true);
        // Refresh the customers list to show updated names
        await refetch();
        
        // Close modal after a short delay to show success
        setTimeout(() => {
          setEditingCustomer(null);
          setEditSuccess(false);
        }, 1000);
      } else {
        setEditError(result.data?.updateUserProfileNames?.message || 'Failed to update customer name');
      }
    } catch (error) {
      console.error('Error updating customer name:', error);
      setEditError('An error occurred while updating the customer name');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditingCustomer(null);
    setEditFirstName('');
    setEditLastName('');
    setEditError(null);
    setEditSuccess(false);
  };

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
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
  }, []); // Remove router dependency to prevent loops

  // Filter and sort customers
  const filteredCustomers = React.useMemo(() => {
    if (!data?.getAllCustomers) return [];

    let customers = [...data.getAllCustomers];

    // Apply marketing status filter
    if (filterMarketingStatus !== 'all') {
      customers = customers.filter(customer => {
        if (filterMarketingStatus === 'subscribed') {
          return customer.marketingOptIn;
        } else if (filterMarketingStatus === 'unsubscribed') {
          return !customer.marketingOptIn;
        }
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      customers = customers.filter(customer =>
        customer.email?.toLowerCase().includes(search) ||
        customer.firstName?.toLowerCase().includes(search) ||
        customer.lastName?.toLowerCase().includes(search) ||
        customer.city?.toLowerCase().includes(search) ||
        customer.state?.toLowerCase().includes(search)
      );
    }

    // Sort customers
    customers.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'name':
          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          comparison = aName.localeCompare(bName);
          break;
        case 'location':
          const aLocation = `${a.city || ''}, ${a.state || ''}`;
          const bLocation = `${b.city || ''}, ${b.state || ''}`;
          comparison = aLocation.localeCompare(bLocation);
          break;
        case 'orders':
          comparison = a.totalOrders - b.totalOrders;
          break;
        case 'spent':
          comparison = a.totalSpent - b.totalSpent;
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'subscription':
          comparison = (a.marketingOptIn ? 1 : 0) - (b.marketingOptIn ? 1 : 0);
          break;
        case 'lastOrder':
          const aDate = new Date(a.lastOrderDate || 0).getTime();
          const bDate = new Date(b.lastOrderDate || 0).getTime();
          comparison = aDate - bDate;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return customers;
  }, [data, filterMarketingStatus, searchTerm, sortColumn, sortDirection]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => {
        setCopiedEmail(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate total stats
  const totalStats = React.useMemo(() => {
    if (!data?.getAllCustomers) return { customers: 0, revenue: 0, subscribedCount: 0 };
    
    const customers = data.getAllCustomers;
    const revenue = customers.reduce((sum: number, customer: Customer) => sum + customer.totalSpent, 0);
    const subscribedCount = customers.filter((customer: Customer) => customer.marketingOptIn).length;
    
    return { customers: customers.length, revenue, subscribedCount };
  }, [data]);

  if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  // Display error if query failed
  if (error) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Error Loading Customers</h3>
            <p className="text-sm text-gray-400 mb-4">{error.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Retry
            </button>
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
          .mobile-customer-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-customer-card:active {
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
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total Customers</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">{totalStats.customers}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>All time</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total Revenue</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                      {formatCurrency(totalStats.revenue)}
                    </p>
                    <p className="text-xs text-green-400 mt-1">↑ 23%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Email Subscribers</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">{totalStats.subscribedCount}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {totalStats.customers > 0 
                        ? `${Math.round((totalStats.subscribedCount / totalStats.customers) * 100)}% opt-in rate`
                        : '0% opt-in rate'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Avg Customer Value</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">
                      {formatCurrency(
                        totalStats.customers > 0 
                          ? totalStats.revenue / totalStats.customers
                          : 0
                      )}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Lifetime value</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Analytics Cards - Compact 2 column layout */}
            <div className="xl:hidden grid grid-cols-2 gap-3 mb-4">
              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Total Customers</div>
                <div className="text-lg font-bold text-white">{totalStats.customers}</div>
                <div className="text-xs text-gray-500 mt-1">All time</div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Total Revenue</div>
                <div className="text-lg font-bold" style={{ color: '#86efac' }}>
                  {formatCurrency(totalStats.revenue)}
                </div>
                <div className="text-xs text-green-400 mt-1">↑ 23%</div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Email Subscribers</div>
                <div className="text-lg font-bold text-white">{totalStats.subscribedCount}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalStats.customers > 0 
                    ? `${Math.round((totalStats.subscribedCount / totalStats.customers) * 100)}% opt-in`
                    : '0% opt-in'
                  }
                </div>
              </div>

              <div className="glass-container p-4">
                <div className="text-xs text-gray-400 mb-1">Avg Value</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(
                    totalStats.customers > 0 
                      ? totalStats.revenue / totalStats.customers
                      : 0
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">Lifetime</div>
              </div>
            </div>

            {/* Mobile/Tablet Filters */}
            <div className="xl:hidden mb-4">
              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 filter-pills-container">
                <button 
                  onClick={() => setFilterMarketingStatus('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                    filterMarketingStatus === 'all' 
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                      : 'bg-transparent text-gray-400 border-gray-600'
                  }`}
                >
                  All Customers
                </button>
                <button 
                  onClick={() => setFilterMarketingStatus('subscribed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                    filterMarketingStatus === 'subscribed' 
                      ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                      : 'bg-transparent text-gray-400 border-gray-600'
                  }`}
                >
                  Email Subscribers
                </button>
                <button 
                  onClick={() => setFilterMarketingStatus('unsubscribed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                    filterMarketingStatus === 'unsubscribed' 
                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/40' 
                      : 'bg-transparent text-gray-400 border-gray-600'
                  }`}
                >
                  Non-subscribers
                </button>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden xl:flex justify-end items-center gap-3 mb-4">
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  aria-label="Filter customers by subscription status"
                  value={filterMarketingStatus}
                  onChange={(e) => setFilterMarketingStatus(e.target.value)}
                  className="appearance-none bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm font-medium focus:outline-none focus:border-purple-400 transition-all cursor-pointer hover:scale-105"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px',
                    paddingRight: '32px'
                  }}
                >
                  <option value="all" style={{ backgroundColor: '#030140' }}>All Customers</option>
                  <option value="subscribed" style={{ backgroundColor: '#030140' }}>Email Subscribers</option>
                  <option value="unsubscribed" style={{ backgroundColor: '#030140' }}>Non-subscribers</option>
                </select>
                <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers..."
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

            {/* Mobile/Tablet Customer List */}
            <div className="xl:hidden">
              <div className="space-y-3 px-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => router.push(`/admin/customers/${encodeURIComponent(customer.email)}`)}
                    className="mobile-customer-card rounded-xl p-4 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white truncate flex-1">
                            {customer.firstName || customer.lastName
                              ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                              : 'Unknown Customer'}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCustomerName(customer, e);
                            }}
                            className="p-1.5 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500 hover:bg-opacity-10 transition-all"
                            title="Edit Name"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{customer.email}</p>
                        {customer.city && customer.state && (
                          <p className="text-xs text-gray-500 mt-1">{customer.city}, {customer.state}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold" style={{ color: '#86efac' }}>
                          {formatCurrency(customer.totalSpent)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {customer.totalOrders} order{customer.totalOrders !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {customer.marketingOptIn ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-300"
                            style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-400"
                            style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
                            Unsubscribed
                          </span>
                        )}
                        {customer.totalOrders > 1 && (
                          <span className="text-xs text-purple-400">Returning</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/customers/${encodeURIComponent(customer.email)}/dashboard`);
                          }}
                          className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500 hover:bg-opacity-10 transition-all"
                          title="View Customer Dashboard"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                        <div className="text-xs text-gray-500">
                          Last order: {formatDate(customer.lastOrderDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-white mb-1">No customers found</h3>
                    <p className="text-sm">Try adjusting your filters or search terms</p>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Customers Table */}
            <div className="hidden xl:block rounded-2xl overflow-hidden glass-container">
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
                <table className="min-w-full">
                  <thead
                    className="border-b border-gray-700 sticky top-0 z-20"
                    style={{
                      backgroundColor: 'rgba(3, 1, 64, 0.98)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1), 0 -1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <tr>
                      <th
                        onClick={() => handleColumnSort('name')}
                        className="pl-6 pr-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortColumn === 'name' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('location')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          City/State
                          {sortColumn === 'location' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('orders')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Total Orders
                          {sortColumn === 'orders' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('spent')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Total Spent
                          {sortColumn === 'spent' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('subscription')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Email Status
                          {sortColumn === 'subscription' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('email')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Email
                          {sortColumn === 'email' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleColumnSort('lastOrder')}
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Last Order
                          {sortColumn === 'lastOrder' && (
                            <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="cursor-pointer table-row-hover"
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: 'transparent'
                        }}
                        onClick={() => router.push(`/admin/customers/${encodeURIComponent(customer.email)}`)}
                      >
                        {/* Name */}
                        <td className="pl-6 pr-3 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {customer.firstName || customer.lastName
                                  ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                                  : 'Unknown Customer'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCustomerName(customer, e);
                                }}
                                className="p-1 rounded text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500 hover:bg-opacity-10 transition-all"
                                title="Edit Name"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                            {customer.totalOrders > 1 && (
                              <div className="text-xs text-purple-400 mt-0.5">
                                Returning customer
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* City/State */}
                        <td className="px-3 py-4">
                          <div className="text-sm text-gray-300">
                            {customer.city && customer.state
                              ? `${customer.city}, ${customer.state}`
                              : customer.city || customer.state || '-'}
                          </div>
                        </td>
                        
                        {/* Total Orders */}
                        <td className="px-3 py-4">
                          <div className="text-base font-medium text-white">
                            {customer.totalOrders}
                          </div>
                        </td>
                        
                        {/* Total Spent */}
                        <td className="px-3 py-4">
                          <div className="text-base font-semibold" style={{ color: '#86efac' }}>
                            {formatCurrency(customer.totalSpent)}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Avg: {formatCurrency(customer.averageOrderValue)}
                          </div>
                        </td>
                        
                        {/* Email Status */}
                        <td className="px-3 py-4">
                          {customer.marketingOptIn ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-300"
                              style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                              <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Subscribed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-400"
                              style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
                              <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Unsubscribed
                            </span>
                          )}
                        </td>
                        
                        {/* Email */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-1 relative">
                            <span className="text-sm text-gray-300">{customer.email}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(customer.email);
                              }}
                              className="text-gray-400 hover:text-white transition-colors"
                              title="Copy email"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            {copiedEmail === customer.email && (
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
                        </td>
                        
                        {/* Last Order */}
                        <td className="px-3 py-4">
                          <div className="text-sm text-gray-300">
                            {formatDate(customer.lastOrderDate)}
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/orders?search=${customer.email}`);
                              }}
                              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500 hover:bg-opacity-10 transition-all"
                              title="View Orders"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`mailto:${customer.email}`, '_blank');
                              }}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500 hover:bg-opacity-10 transition-all"
                              title="Send Email"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/customers/${encodeURIComponent(customer.email)}/dashboard`);
                              }}
                              className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500 hover:bg-opacity-10 transition-all"
                              title="View Customer Dashboard"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomerName(customer, e);
                              }}
                              className="p-1.5 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500 hover:bg-opacity-10 transition-all"
                              title="Edit Name"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Empty State */}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-white mb-1">No customers found</h3>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

                 {/* Name Editing Modal */}
         {editingCustomer && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="rounded-lg p-6 w-full max-w-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}>
               <h3 className="text-xl font-bold text-white mb-4">Edit Customer Name</h3>
               <div className="mb-4">
                 <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                 <input
                   type="text"
                   id="editFirstName"
                   value={editFirstName}
                   onChange={(e) => setEditFirstName(e.target.value)}
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
                 <label htmlFor="editLastName" className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                 <input
                   type="text"
                   id="editLastName"
                   value={editLastName}
                   onChange={(e) => setEditLastName(e.target.value)}
                   className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                   style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                     backdropFilter: 'blur(12px)'
                   }}
                 />
               </div>
               {editError && (
                 <div className="text-red-400 text-sm mb-4">{editError}</div>
               )}
               {editSuccess && (
                 <div className="text-green-400 text-sm mb-4">Name updated successfully!</div>
               )}
               <div className="flex justify-end gap-2">
                 <button
                   onClick={handleCloseEditModal}
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
                   onClick={handleSaveCustomerName}
                   className="px-4 py-2 text-white rounded transition-colors"
                   style={{
                     background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                     backdropFilter: 'blur(25px) saturate(180%)',
                     border: '1px solid rgba(59, 130, 246, 0.4)',
                     boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                   }}
                   disabled={editLoading}
                 >
                   {editLoading ? 'Saving...' : 'Save Changes'}
                 </button>
               </div>
             </div>
           </div>
         )}
      </div>
    </AdminLayout>
  );
} 