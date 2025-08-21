import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CREATOR_PAYOUTS, GET_CREATOR_EARNINGS } from '@/lib/stripe-connect-mutations';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface CreatorPayoutDashboardProps {
  creatorId: string;
}

const CreatorPayoutDashboard: React.FC<CreatorPayoutDashboardProps> = ({ creatorId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'earnings'>('overview');
  const [payoutLimit] = useState(20);
  const [earningsLimit] = useState(20);

  // Fetch payouts data
  const { data: payoutsData, loading: payoutsLoading } = useQuery(GET_CREATOR_PAYOUTS, {
    variables: { creatorId, limit: payoutLimit, offset: 0 },
    skip: !creatorId
  });

  // Fetch earnings data
  const { data: earningsData, loading: earningsLoading } = useQuery(GET_CREATOR_EARNINGS, {
    variables: { creatorId, limit: earningsLimit, offset: 0 },
    skip: !creatorId
  });

  const payouts = payoutsData?.getCreatorPayouts?.payouts || [];
  const earnings = earningsData?.getCreatorEarnings?.earnings || [];
  const totalEarnings = earningsData?.getCreatorEarnings?.totalEarnings || 0;
  const pendingEarnings = earningsData?.getCreatorEarnings?.pendingEarnings || 0;
  const totalPayouts = payoutsData?.getCreatorPayouts?.totalAmount || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'transferred':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'pending':
      case 'in_transit':
        return <Clock className="text-yellow-500" size={16} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'transferred':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'pending':
      case 'in_transit':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'failed':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  if (!creatorId) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Creator ID not available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalEarnings)}</p>
            </div>
            <div className="p-3 bg-green-900/20 rounded-full">
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Pending Earnings</p>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(pendingEarnings)}</p>
            </div>
            <div className="p-3 bg-yellow-900/20 rounded-full">
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Payouts</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalPayouts)}</p>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-full">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'payouts', label: 'Payouts' },
          { key: 'earnings', label: 'Earnings' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            style={activeTab === tab.key ? {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h3 className="text-xl font-bold text-white mb-6">Earnings Overview</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payouts */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Recent Payouts</h4>
              {payoutsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-700/50 rounded"></div>
                  ))}
                </div>
              ) : payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(payout.status)}
                        <div>
                          <p className="text-white font-medium">{formatCurrency(payout.amount)}</p>
                          <p className="text-xs text-gray-400">{formatDate(payout.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No payouts yet</p>
              )}
            </div>

            {/* Recent Earnings */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Recent Earnings</h4>
              {earningsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-700/50 rounded"></div>
                  ))}
                </div>
              ) : earnings.length > 0 ? (
                <div className="space-y-3">
                  {earnings.slice(0, 5).map((earning) => (
                    <div key={earning.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(earning.status)}
                        <div>
                          <p className="text-white font-medium">{formatCurrency(earning.netEarnings)}</p>
                          <p className="text-xs text-gray-400">Order #{earning.orderId.slice(-8)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(earning.status)}`}>
                        {earning.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No earnings yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h3 className="text-xl font-bold text-white mb-6">Payout History</h3>
          
          {payoutsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700/50 rounded"></div>
              ))}
            </div>
          ) : payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Arrival</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-800">
                      <td className="py-4 px-4 text-white">{formatDate(payout.createdAt)}</td>
                      <td className="py-4 px-4 text-white font-medium">{formatCurrency(payout.amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {payout.arrivalDate ? formatDate(payout.arrivalDate) : 'TBD'}
                      </td>
                      <td className="py-4 px-4 text-gray-300">{payout.description || 'Marketplace earnings'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-400">No payouts yet</p>
              <p className="text-sm text-gray-500 mt-2">Payouts are processed automatically when you have earnings</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div 
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h3 className="text-xl font-bold text-white mb-6">Earnings History</h3>
          
          {earningsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700/50 rounded"></div>
              ))}
            </div>
          ) : earnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Order</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Gross</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Platform Fee</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Net Earnings</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="border-b border-gray-800">
                      <td className="py-4 px-4 text-white">{formatDate(earning.createdAt)}</td>
                      <td className="py-4 px-4 text-blue-400 font-mono text-sm">#{earning.orderId.slice(-8)}</td>
                      <td className="py-4 px-4 text-white">{formatCurrency(earning.grossAmount)}</td>
                      <td className="py-4 px-4 text-red-300">{formatCurrency(earning.platformFee)}</td>
                      <td className="py-4 px-4 text-green-400 font-medium">{formatCurrency(earning.netEarnings)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(earning.status)}`}>
                          {earning.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-400">No earnings yet</p>
              <p className="text-sm text-gray-500 mt-2">Start selling products on the marketplace to see your earnings here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatorPayoutDashboard;
