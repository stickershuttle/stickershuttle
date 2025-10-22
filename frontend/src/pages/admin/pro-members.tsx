import React, { useMemo } from 'react';
import Head from 'next/head';
import { useQuery, gql } from '@apollo/client';
import AdminLayout from '../../components/AdminLayout';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

const GET_ALL_PRO_MEMBERS = gql`
  query GetAllProMembers {
    getAllProMembers {
      id
      userId
      firstName
      lastName
      email
      displayName
      isProMember
      proStatus
      proPlan
      proCurrentPeriodStart
      proCurrentPeriodEnd
      proSubscriptionId
      createdAt
      updatedAt
    }
  }
`;

export default function ProMembersPage() {
  const { data, loading, error } = useQuery(GET_ALL_PRO_MEMBERS, {
    fetchPolicy: 'network-only',
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.getAllProMembers) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        mrr: 0,
        newToday: 0,
        newThisWeek: 0,
        newThisMonth: 0,
        monthlyPlan: 0,
        annualPlan: 0,
      };
    }

    const members = data.getAllProMembers;
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const activeMembers = members.filter((m: any) => m.proStatus === 'active');
    
    // Calculate MRR (Monthly Recurring Revenue)
    // Assuming monthly = $39, annual = $29/month ($348/year)
    const mrr = activeMembers.reduce((sum: number, member: any) => {
      if (member.proPlan === 'monthly') {
        return sum + 39;
      } else if (member.proPlan === 'annual') {
        return sum + 29; // $348/12 = $29/month
      }
      return sum;
    }, 0);

    // Count new signups
    const newToday = members.filter((m: any) => 
      m.proCurrentPeriodStart && isAfter(new Date(m.proCurrentPeriodStart), todayStart)
    ).length;

    const newThisWeek = members.filter((m: any) => 
      m.proCurrentPeriodStart && isAfter(new Date(m.proCurrentPeriodStart), weekStart)
    ).length;

    const newThisMonth = members.filter((m: any) => 
      m.proCurrentPeriodStart && isAfter(new Date(m.proCurrentPeriodStart), monthStart)
    ).length;

    const monthlyPlan = activeMembers.filter((m: any) => m.proPlan === 'monthly').length;
    const annualPlan = activeMembers.filter((m: any) => m.proPlan === 'annual').length;

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      mrr,
      newToday,
      newThisWeek,
      newThisMonth,
      monthlyPlan,
      annualPlan,
    };
  }, [data]);

  return (
    <>
      <Head>
        <title>Pro Members - Admin Dashboard - Sticker Shuttle</title>
      </Head>

      <AdminLayout title="Pro Members">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Pro" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Pro Members</h1>
                <p className="text-gray-400 text-sm">Manage and track Pro membership subscriptions</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Members */}
            <div className="p-6 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-sm mb-1">Total Members</div>
              <div className="text-3xl font-bold text-white">{stats.totalMembers}</div>
              <div className="text-xs text-gray-500 mt-1">All time</div>
            </div>

            {/* Active Members */}
            <div className="p-6 rounded-xl" style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              boxShadow: 'rgba(34, 197, 94, 0.2) 0px 8px 32px',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-green-400 text-sm mb-1">Active Members</div>
              <div className="text-3xl font-bold text-white">{stats.activeMembers}</div>
              <div className="text-xs text-green-300 mt-1">Currently subscribed</div>
            </div>

            {/* MRR */}
            <div className="p-6 rounded-xl" style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              boxShadow: 'rgba(6, 182, 212, 0.2) 0px 8px 32px',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-cyan-400 text-sm mb-1">MRR</div>
              <div className="text-3xl font-bold text-white">${stats.mrr.toLocaleString()}</div>
              <div className="text-xs text-cyan-300 mt-1">Monthly Recurring Revenue</div>
            </div>

            {/* ARR */}
            <div className="p-6 rounded-xl" style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              boxShadow: 'rgba(168, 85, 247, 0.2) 0px 8px 32px',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-purple-400 text-sm mb-1">ARR</div>
              <div className="text-3xl font-bold text-white">${(stats.mrr * 12).toLocaleString()}</div>
              <div className="text-xs text-purple-300 mt-1">Annual Recurring Revenue</div>
            </div>
          </div>

          {/* New Signups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-xs mb-1">New Today</div>
              <div className="text-2xl font-bold text-white">{stats.newToday}</div>
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-xs mb-1">New This Week</div>
              <div className="text-2xl font-bold text-white">{stats.newThisWeek}</div>
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-xs mb-1">New This Month (MTD)</div>
              <div className="text-2xl font-bold text-white">{stats.newThisMonth}</div>
            </div>
          </div>

          {/* Plan Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-sm mb-2">Monthly Plans</div>
              <div className="text-2xl font-bold text-white">{stats.monthlyPlan}</div>
              <div className="text-xs text-gray-500 mt-1">${39}/month per member</div>
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="text-gray-400 text-sm mb-2">Annual Plans</div>
              <div className="text-2xl font-bold text-white">{stats.annualPlan}</div>
              <div className="text-xs text-gray-500 mt-1">${348}/year per member</div>
            </div>
          </div>

          {/* Members List */}
          <div className="rounded-xl overflow-hidden" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">All Pro Members</h2>
            </div>

            {loading && (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading Pro members...
              </div>
            )}

            {error && (
              <div className="p-8 text-center text-red-400">
                Error loading members: {error.message}
              </div>
            )}

            {!loading && !error && data?.getAllProMembers && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Member</th>
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Email</th>
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Plan</th>
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Status</th>
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Started</th>
                      <th className="p-4 text-left text-gray-400 text-sm font-medium">Renews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.getAllProMembers.map((member: any) => (
                      <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-white">
                            {member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">{member.email || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.proPlan === 'monthly' 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {member.proPlan === 'monthly' ? 'Monthly' : member.proPlan === 'annual' ? 'Annual' : 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.proStatus === 'active' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-gray-500/20 text-gray-300'
                          }`}>
                            {member.proStatus || 'inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {member.proCurrentPeriodStart ? format(new Date(member.proCurrentPeriodStart), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {member.proCurrentPeriodEnd ? format(new Date(member.proCurrentPeriodEnd), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && (!data?.getAllProMembers || data.getAllProMembers.length === 0) && (
              <div className="p-8 text-center text-gray-400">
                No Pro members found.
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

