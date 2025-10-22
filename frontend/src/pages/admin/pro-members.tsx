import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import AdminLayout from '@/components/AdminLayout';
import { GET_ALL_PRO_MEMBERS, GET_PRO_MEMBER_ANALYTICS } from '@/lib/admin-mutations';

export default function ProMembersPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Pro members and analytics
  const { data: membersData, loading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery(GET_ALL_PRO_MEMBERS);
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useQuery(GET_PRO_MEMBER_ANALYTICS);

  const members = membersData?.getAllProMembers || [];
  const analytics = analyticsData?.getProMemberAnalytics || {};

  // Filter members
  const filteredMembers = members.filter((member: any) => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'no-design' && !member.proCurrentDesignFile) ||
      (filterStatus === 'pending-approval' && member.proCurrentDesignFile && !member.proDesignApproved) ||
      (filterStatus === 'no-address' && (!member.proDefaultShippingAddress || !member.proDefaultShippingAddress?.address1)) ||
      (filterStatus === 'payment-failed' && member.proPaymentFailed) ||
      (filterStatus === 'active' && member.proStatus === 'active') ||
      (filterStatus === 'past-due' && member.proStatus === 'past_due');

    const matchesSearch = !searchQuery || 
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };


  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pro Members Dashboard</h1>
          <p className="text-gray-400">Manage and monitor your Pro membership subscribers</p>
        </div>

        {/* Error Messages */}
        {membersError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-red-300">Error loading Pro members: {membersError.message}</p>
          </div>
        )}
        {analyticsError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-red-300">Error loading analytics: {analyticsError.message}</p>
          </div>
        )}

        {/* Analytics Overview */}
        {!analyticsLoading && (
          <div className="space-y-6 mb-8">
            {/* Membership & Revenue Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Membership & Revenue
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Signups This Month</p>
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.monthlySignups || 0}</p>
                  <p className="text-xs text-gray-400">New Pro members</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Revenue from New Signups</p>
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency((analytics.monthlySignups || 0) * 39)}</p>
                  <p className="text-xs text-gray-400">This month's revenue</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Monthly MRR</p>
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency(analytics.monthlyMRR || 0)}</p>
                  <p className="text-xs text-gray-400">Monthly recurring</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Annual YRR</p>
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{formatCurrency(analytics.annualYRR || 0)}</p>
                  <p className="text-xs text-gray-400">Yearly recurring</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Monthly Plans</p>
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.monthlyPlanMembers || 0}</p>
                  <p className="text-xs text-gray-400">Monthly subscribers</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Annual Plans</p>
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.annualPlanMembers || 0}</p>
                  <p className="text-xs text-gray-400">Annual subscribers</p>
                </div>
              </div>
            </div>

            {/* Operations & Health Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Operations & Health
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Orders Generated</p>
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.ordersGenerated || 0}</p>
                  <p className="text-xs text-gray-400">Total automated orders</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Pending Approvals</p>
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.pendingDesignApprovals || 0}</p>
                  <p className="text-xs text-gray-400">Designs need review</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Churn Rate</p>
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.churnRate?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-gray-400">Member retention</p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Avg Orders/Member</p>
                    <div className="p-2 rounded-lg bg-teal-500/20">
                      <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.averageOrdersPerMember?.toFixed(1) || 0}</p>
                  <p className="text-xs text-gray-400">Per member lifetime</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Management Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Member Management
          </h2>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'no-design', label: 'No Design' },
              { value: 'pending-approval', label: 'Pending Approval' },
              { value: 'no-address', label: 'No Address' },
              { value: 'payment-failed', label: 'Payment Failed' },
              { value: 'past-due', label: 'Past Due' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  filterStatus === filter.value
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                } border`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members Table */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Design</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {membersLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Pro members...
                      </div>
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No Pro members found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member: any) => (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {member.proPlan === 'monthly' ? '📅 Monthly' : '📆 Annual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          member.proStatus === 'active' 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : member.proStatus === 'past_due'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}>
                          {member.proStatus === 'active' && '✓ Active'}
                          {member.proStatus === 'past_due' && '⚠️ Past Due'}
                          {member.proStatus === 'canceled' && '❌ Canceled'}
                          {!member.proStatus && 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!member.proCurrentDesignFile ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                            ❌ No Design
                          </span>
                        ) : member.proDesignApproved ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {member.proDefaultShippingAddress?.address1 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                            ✓ On File
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            ⚠️ Missing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">
                          {new Date(member.proSubscriptionStartDate || member.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {!membersLoading && filteredMembers.length > 0 && (
          <div className="mt-4 text-sm text-gray-400 text-center">
            Showing {filteredMembers.length} of {members.length} Pro members
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
