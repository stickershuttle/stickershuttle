import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import AdminLayout from '../../components/AdminLayout';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import WholesaleStatsCard from '../../components/WholesaleStatsCard';
import WholesaleEditModal from '../../components/WholesaleEditModal';
import { GET_WHOLESALE_ANALYTICS, GET_WHOLESALE_TOP_PERFORMERS } from '../../lib/wholesale-analytics-mutations';

// GraphQL Queries and Mutations
const GET_PENDING_WHOLESALE_APPLICATIONS = gql`
  query GetPendingWholesaleApplications {
    getPendingWholesaleApplications {
      id
      userId
      firstName
      lastName
      companyName
      wholesaleMonthlyCustomers
      wholesaleOrderingFor
      wholesaleFitExplanation
      wholesaleStatus
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_WHOLESALE_CUSTOMERS = gql`
  query GetAllWholesaleCustomers {
    getAllWholesaleCustomers {
      id
      userId
      firstName
      lastName
      companyName
      wholesaleMonthlyCustomers
      wholesaleOrderingFor
      wholesaleFitExplanation
      wholesaleStatus
      wholesaleCreditRate
      wholesaleApprovedAt
      wholesaleApprovedBy
      createdAt
      updatedAt
    }
  }
`;

const APPROVE_WHOLESALE_APPLICATION = gql`
  mutation ApproveWholesaleApplication($userId: ID!, $approvedBy: ID!) {
    approveWholesaleApplication(userId: $userId, approvedBy: $approvedBy) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
        wholesaleStatus
        wholesaleCreditRate
        wholesaleApprovedAt
      }
    }
  }
`;

const REJECT_WHOLESALE_APPLICATION = gql`
  mutation RejectWholesaleApplication($userId: ID!, $rejectedBy: ID!) {
    rejectWholesaleApplication(userId: $userId, rejectedBy: $rejectedBy) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
        wholesaleStatus
        wholesaleCreditRate
        wholesaleApprovedAt
      }
    }
  }
`;

const WholesaleAdmin = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [processing, setProcessing] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Fetch pending applications
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useQuery(
    GET_PENDING_WHOLESALE_APPLICATIONS,
    {
      pollInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch all wholesale customers
  const { data: allData, loading: allLoading, refetch: refetchAll } = useQuery(
    GET_ALL_WHOLESALE_CUSTOMERS,
    {
      pollInterval: 60000, // Refresh every minute
    }
  );

  // Fetch wholesale analytics
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(
    GET_WHOLESALE_ANALYTICS,
    {
      pollInterval: 300000, // Refresh every 5 minutes
    }
  );

  // Fetch top performers
  const { data: performersData, loading: performersLoading, refetch: refetchPerformers } = useQuery(
    GET_WHOLESALE_TOP_PERFORMERS,
    {
      variables: { limit: 10 },
      pollInterval: 300000, // Refresh every 5 minutes
    }
  );

  // Mutations
  const [approveApplication] = useMutation(APPROVE_WHOLESALE_APPLICATION);
  const [rejectApplication] = useMutation(REJECT_WHOLESALE_APPLICATION);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const handleApprove = async (application: any) => {
    if (!user?.id) return;
    
    setProcessing(application.userId);
    try {
      const { data } = await approveApplication({
        variables: {
          userId: application.userId,
          approvedBy: user.id
        }
      });

      if (data?.approveWholesaleApplication?.success) {
        console.log('✅ Application approved:', data.approveWholesaleApplication.message);
        refetchPending();
        refetchAll();
      } else {
        console.error('❌ Approval failed:', data?.approveWholesaleApplication?.message);
      }
    } catch (error) {
      console.error('❌ Error approving application:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (application: any) => {
    if (!user?.id) return;
    
    setProcessing(application.userId);
    try {
      const { data } = await rejectApplication({
        variables: {
          userId: application.userId,
          rejectedBy: user.id
        }
      });

      if (data?.rejectWholesaleApplication?.success) {
        console.log('✅ Application rejected:', data.rejectWholesaleApplication.message);
        refetchPending();
        refetchAll();
      } else {
        console.error('❌ Rejection failed:', data?.rejectWholesaleApplication?.message);
      }
    } catch (error) {
      console.error('❌ Error rejecting application:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  const handleUpdateComplete = () => {
    refetchAll();
    refetchAnalytics();
    refetchPerformers();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </span>
    );
  };

  const pendingApplications = pendingData?.getPendingWholesaleApplications || [];
  const allCustomers = allData?.getAllWholesaleCustomers || [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Wholesale Management</h1>
          <p className="text-gray-300">Review and manage wholesale applications and customers</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 p-1 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'analytics'
                ? 'text-white'
                : 'text-gray-300 hover:text-white'
            }`}
            style={activeTab === 'analytics' ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            } : {}}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'text-white'
                : 'text-gray-300 hover:text-white'
            }`}
            style={activeTab === 'pending' ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            } : {}}
          >
            Pending Applications
            {pendingApplications.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                {pendingApplications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'all'
                ? 'text-white'
                : 'text-gray-300 hover:text-white'
            }`}
            style={activeTab === 'all' ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            } : {}}
          >
            All Wholesale Customers ({allCustomers.length})
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">
              📊 Wholesale Analytics
            </h2>
            
            {analyticsLoading ? (
              <div className="text-center text-gray-300 py-8">Loading analytics...</div>
            ) : (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <WholesaleStatsCard
                    title="Total Customers"
                    value={analyticsData?.getWholesaleAnalytics?.totalWholesaleCustomers || 0}
                    icon={<span>👥</span>}
                  />
                  <WholesaleStatsCard
                    title="Total Revenue"
                    value={`$${(analyticsData?.getWholesaleAnalytics?.totalWholesaleRevenue || 0).toLocaleString()}`}
                    icon={<span>💰</span>}
                  />
                  <WholesaleStatsCard
                    title="Avg Order Value"
                    value={`$${(analyticsData?.getWholesaleAnalytics?.averageOrderValue || 0).toFixed(2)}`}
                    icon={<span>📈</span>}
                  />
                  <WholesaleStatsCard
                    title="Total Orders"
                    value={analyticsData?.getWholesaleAnalytics?.totalOrders || 0}
                    icon={<span>📦</span>}
                  />
                </div>

                {/* Monthly Performance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <WholesaleStatsCard
                    title="Monthly Revenue"
                    value={`$${(analyticsData?.getWholesaleAnalytics?.monthlyRevenue || 0).toLocaleString()}`}
                    subtitle="Last 30 days"
                    icon={<span>📊</span>}
                    trend={{
                      value: analyticsData?.getWholesaleAnalytics?.growthRate || 0,
                      isPositive: (analyticsData?.getWholesaleAnalytics?.growthRate || 0) >= 0
                    }}
                  />
                  <WholesaleStatsCard
                    title="Monthly Orders"
                    value={analyticsData?.getWholesaleAnalytics?.monthlyOrders || 0}
                    subtitle="Last 30 days"
                    icon={<span>🛒</span>}
                  />
                  <WholesaleStatsCard
                    title="Growth Rate"
                    value={`${(analyticsData?.getWholesaleAnalytics?.growthRate || 0).toFixed(1)}%`}
                    subtitle="Month over month"
                    icon={<span>📈</span>}
                    trend={{
                      value: analyticsData?.getWholesaleAnalytics?.growthRate || 0,
                      isPositive: (analyticsData?.getWholesaleAnalytics?.growthRate || 0) >= 0
                    }}
                  />
                </div>

                {/* Credit Rate Distribution */}
                {analyticsData?.getWholesaleAnalytics?.creditRateDistribution && (
                  <div
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-4">Credit Rate Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {analyticsData.getWholesaleAnalytics.creditRateDistribution.map((rate: any) => (
                        <div key={rate.creditRate} className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {(rate.creditRate * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-300">
                            {rate.customerCount} customers
                          </div>
                          <div className="text-xs text-gray-400">
                            {rate.percentage.toFixed(1)}% of total
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Performers */}
                <div
                  className="p-6 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Performers</h3>
                  
                  {performersLoading ? (
                    <div className="text-center text-gray-300 py-4">Loading top performers...</div>
                  ) : (
                    <div className="space-y-4">
                      {performersData?.getWholesaleTopPerformers?.map((performer: any, index: number) => (
                        <div key={performer.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 text-blue-300 rounded-full text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {performer.firstName} {performer.lastName}
                              </div>
                              <div className="text-sm text-gray-300">{performer.companyName}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              ${performer.totalRevenue.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-300">
                              {performer.totalOrders} orders • ${performer.averageOrderValue.toFixed(2)} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Applications Tab */}
        {activeTab === 'pending' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">
              Pending Applications ({pendingApplications.length})
            </h2>
            
            {pendingLoading ? (
              <div className="text-center text-gray-300 py-8">Loading applications...</div>
            ) : pendingApplications.length === 0 ? (
              <div className="text-center text-gray-300 py-8">
                <div className="mb-4">🎉</div>
                <div>No pending applications</div>
              </div>
            ) : (
              <div className="grid gap-6">
                {pendingApplications.map((application: any) => (
                  <div
                    key={application.id}
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {application.firstName} {application.lastName}
                        </h3>
                        <p className="text-gray-300">{application.companyName}</p>
                        <p className="text-sm text-gray-400">Applied: {formatDate(application.createdAt)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(application)}
                          disabled={processing === application.userId}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                          {processing === application.userId ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(application)}
                          disabled={processing === application.userId}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                          {processing === application.userId ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Monthly Customers:</span>
                        <p className="text-white font-medium">{application.wholesaleMonthlyCustomers}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Ordering For:</span>
                        <p className="text-white font-medium">{application.wholesaleOrderingFor}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Business Fit:</span>
                        <p className="text-white font-medium text-xs">{application.wholesaleFitExplanation?.substring(0, 100)}...</p>
                      </div>
                    </div>

                    {application.wholesaleFitExplanation && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <span className="text-gray-400 text-sm">Full Business Explanation:</span>
                        <p className="text-white mt-1">{application.wholesaleFitExplanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Customers Tab */}
        {activeTab === 'all' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">
              All Wholesale Customers ({allCustomers.length})
            </h2>
            
            {allLoading ? (
              <div className="text-center text-gray-300 py-8">Loading customers...</div>
            ) : allCustomers.length === 0 ? (
              <div className="text-center text-gray-300 py-8">No wholesale customers yet</div>
            ) : (
              <div className="grid gap-4">
                {allCustomers.map((customer: any) => (
                  <div
                    key={customer.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {customer.firstName} {customer.lastName}
                          </h3>
                          {getStatusBadge(customer.wholesaleStatus)}
                        </div>
                        <p className="text-gray-300 mb-1">{customer.companyName}</p>
                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Credit Rate:</span>
                            <p className="text-green-300 font-medium">{(customer.wholesaleCreditRate * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Monthly Customers:</span>
                            <p className="text-white">{customer.wholesaleMonthlyCustomers}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Ordering For:</span>
                            <p className="text-white">{customer.wholesaleOrderingFor}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Status Changed:</span>
                            <p className="text-white">{customer.wholesaleApprovedAt ? formatDate(customer.wholesaleApprovedAt) : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="px-4 py-2 rounded-lg font-medium text-white transition-colors"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        <WholesaleEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          customer={selectedCustomer}
          onUpdate={handleUpdateComplete}
        />
      </div>
    </AdminLayout>
  );
};

export default WholesaleAdmin; 