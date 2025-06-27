import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import KlaviyoManager from '@/components/KlaviyoManager';
import { useQuery } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import { GET_ALL_KLAVIYO_PROFILES } from '../../lib/klaviyo-mutations';

// Admin check
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface KlaviyoProfile {
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
  lastOrderDate?: string;
  firstOrderDate?: string;
  listMembership?: string[];
  sources?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminKlaviyo() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<KlaviyoProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubscribed, setFilterSubscribed] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [profilesPerPage] = useState(50);

  // Use Apollo Client to fetch Klaviyo profiles
  const { data: klaviyoData, loading: klaviyoLoading, error: klaviyoError, refetch } = useQuery(GET_ALL_KLAVIYO_PROFILES, {
    variables: { limit: 100 }
  });

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

  // Get profiles from Klaviyo
  const profiles = klaviyoData?.getAllKlaviyoProfiles?.profiles || [];
  const klaviyoStats = klaviyoData?.getAllKlaviyoProfiles || {};

  const handleSubscriptionUpdate = (email: string, subscribed: boolean) => {
    // Update selected customer if it matches
    if (selectedCustomer?.email === email) {
      setSelectedCustomer(prev => prev ? { ...prev, listMembership: subscribed ? ['default'] : [] } : null);
    }
    
    // Refetch Klaviyo data to get updated profiles
    refetch();
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((profile: KlaviyoProfile) => {
    const matchesSearch = !searchTerm || 
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${profile.firstName} ${profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const hasSubscription = (profile.listMembership && profile.listMembership.length > 0) || (profile.sources && profile.sources.length > 0);
    const matchesFilter = filterSubscribed === 'all' ||
      (filterSubscribed === 'subscribed' && hasSubscription) ||
      (filterSubscribed === 'unsubscribed' && !hasSubscription);
    
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProfiles.length / profilesPerPage);
  const startIndex = (currentPage - 1) * profilesPerPage;
  const endIndex = startIndex + profilesPerPage;
  const currentProfiles = filteredProfiles.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSubscribed]);

  // Calculate stats from Klaviyo data
  const subscribedProfiles = profiles.filter((p: KlaviyoProfile) => p.listMembership && p.listMembership.length > 0);
  const stats = {
    total: profiles.length,
    subscribed: subscribedProfiles.length,
    unsubscribed: profiles.length - subscribedProfiles.length,
    subscriptionRate: profiles.length > 0 ? (subscribedProfiles.length / profiles.length * 100) : 0,
    totalFromKlaviyo: klaviyoStats.totalProfiles || 0,
    uniqueFromKlaviyo: klaviyoStats.uniqueProfiles || 0
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

  return (
    <AdminLayout title="Klaviyo Management - Admin Dashboard">
      <div className="min-h-screen p-6" style={{ backgroundColor: '#030140' }}>
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750291437/e2672593-d403-4b51-b028-d913fd20cde2.png"
                alt="Klaviyo"
                className="w-10 h-10"
              />
              <h1 className="text-3xl font-bold text-white">Klaviyo Management</h1>
            </div>
            <p className="text-gray-400">
              Manage customer email subscriptions and sync data with Klaviyo
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Customers</div>
            </div>
            
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-2xl font-bold text-green-400">{stats.subscribed}</div>
              <div className="text-sm text-gray-400">Subscribed</div>
            </div>
            
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-2xl font-bold text-gray-400">{stats.unsubscribed}</div>
              <div className="text-sm text-gray-400">Unsubscribed</div>
            </div>
            
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-2xl font-bold text-blue-400">{stats.subscriptionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Subscription Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Customer List */}
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-6">Customer Subscriptions</h2>
              
              {/* Search and Filter */}
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
                
                <select
                  value={filterSubscribed}
                  onChange={(e) => setFilterSubscribed(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                  aria-label="Filter customers by subscription status"
                >
                  <option value="all" style={{ backgroundColor: '#030140' }}>All Customers</option>
                  <option value="subscribed" style={{ backgroundColor: '#030140' }}>Subscribed Only</option>
                  <option value="unsubscribed" style={{ backgroundColor: '#030140' }}>Unsubscribed Only</option>
                </select>
              </div>

              {/* Pagination Info */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredProfiles.length)} of {filteredProfiles.length} customers
                </span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {klaviyoLoading ? (
                  <div className="text-center py-8 text-gray-400">
                    Loading Klaviyo profiles...
                  </div>
                ) : currentProfiles.map((profile: KlaviyoProfile) => (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedCustomer(profile)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCustomer?.id === profile.id 
                        ? 'bg-purple-500/20 border border-purple-500/40' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">
                          {profile.firstName} {profile.lastName}
                        </div>
                        <div className="text-gray-400 text-sm">{profile.email}</div>
                        <div className="text-xs text-gray-500">
                          {profile.totalOrders} orders • ${profile.totalSpent.toFixed(2)} spent
                        </div>
                        {((profile.listMembership && profile.listMembership.length > 0) || (profile.sources && profile.sources.length > 0)) && (
                          <div className="text-xs text-blue-400 mt-1">
                            {profile.listMembership && profile.listMembership.length > 0 && (
                              <span>Lists: {profile.listMembership.join(', ')}</span>
                            )}
                            {profile.sources && profile.sources.length > 0 && (
                              <span>{profile.listMembership?.length ? ' | ' : ''}Sources: {profile.sources.join(', ')}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {((profile.listMembership && profile.listMembership.length > 0) || (profile.sources && profile.sources.length > 0)) ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                            Subscribed
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            Unsubscribed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {!klaviyoLoading && filteredProfiles.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No profiles found matching your criteria
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: currentPage === 1 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum ? 'text-white' : 'text-gray-400 hover:text-white'
                          }`}
                          style={{
                            background: currentPage === pageNum 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.4) 50%, rgba(59, 130, 246, 0.2) 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: `1px solid ${currentPage === pageNum ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                            boxShadow: currentPage === pageNum 
                              ? 'rgba(59, 130, 246, 0.4) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                              : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

                         {/* Klaviyo Manager */}
             <div>
               <KlaviyoManager
                 customer={selectedCustomer ? {
                   id: selectedCustomer.id,
                   email: selectedCustomer.email,
                   firstName: selectedCustomer.firstName,
                   lastName: selectedCustomer.lastName,
                   marketingOptIn: Boolean(
                     (selectedCustomer.listMembership && selectedCustomer.listMembership.length > 0) ||
                     (selectedCustomer.sources && selectedCustomer.sources.length > 0)
                   )
                 } : undefined}
                 onSubscriptionUpdate={handleSubscriptionUpdate}
               />
             </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 