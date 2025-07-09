import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import AdminLayout from '@/components/AdminLayout';
import { GET_ALL_SHARED_CARTS } from '@/lib/admin-mutations';
import { getCanonicalUrl } from '@/utils/url';

interface SharedCart {
  id: string;
  shareId: string;
  cartData: any;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  lastAccessAt: string;
}

export default function SharedCartsAdmin() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;

  const { data, loading, error, refetch } = useQuery(GET_ALL_SHARED_CARTS, {
    variables: {
      offset: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    },
    pollInterval: 30000, // Refresh every 30 seconds
    errorPolicy: 'all'
  });

  const sharedCarts = data?.getAllSharedCarts?.sharedCarts || [];
  const totalCount = data?.getAllSharedCarts?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Filter shared carts based on search term
  const filteredCarts = sharedCarts.filter((cart: SharedCart) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cart.shareId.toLowerCase().includes(searchLower) ||
      cart.createdBy?.toLowerCase().includes(searchLower) ||
      JSON.stringify(cart.cartData).toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCartSummary = (cartData: any) => {
    try {
      const items = typeof cartData === 'string' ? JSON.parse(cartData) : cartData;
      if (!Array.isArray(items)) return 'Invalid cart data';
      
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      
      return `${totalItems} items - $${totalValue.toFixed(2)}`;
    } catch (error) {
      return 'Invalid cart data';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && !data) {
    return (
      <AdminLayout title="Shared Carts - Admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Shared Carts - Admin">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Shared Carts</h1>
            <p className="text-gray-400 mt-1">
              Manage and monitor shared cart links ({totalCount} total)
            </p>
          </div>
          
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
              color: '#ffffff'
            }}
          >
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by Share ID, creator, or cart contents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {error && !data && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            Error loading shared carts: {error.message}. Make sure your backend is running.
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="text-2xl font-bold text-white">{totalCount}</div>
            <div className="text-gray-400 text-sm">Total Shared Carts</div>
          </div>
          
          <div className="p-4 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="text-2xl font-bold text-green-400">
              {sharedCarts.filter((cart: SharedCart) => !isExpired(cart.expiresAt)).length}
            </div>
            <div className="text-gray-400 text-sm">Active</div>
          </div>
          
          <div className="p-4 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="text-2xl font-bold text-red-400">
              {sharedCarts.filter((cart: SharedCart) => isExpired(cart.expiresAt)).length}
            </div>
            <div className="text-gray-400 text-sm">Expired</div>
          </div>
          
          <div className="p-4 rounded-lg" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <div className="text-2xl font-bold text-blue-400">
              {sharedCarts.reduce((sum: number, cart: SharedCart) => sum + cart.accessCount, 0)}
            </div>
            <div className="text-gray-400 text-sm">Total Views</div>
          </div>
        </div>

        {/* Shared Carts Table */}
        <div className="rounded-lg overflow-hidden" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr className="text-left">
                  <th className="p-4 text-gray-300 font-semibold">Share ID</th>
                  <th className="p-4 text-gray-300 font-semibold">Cart Summary</th>
                  <th className="p-4 text-gray-300 font-semibold">Created By</th>
                  <th className="p-4 text-gray-300 font-semibold">Created At</th>
                  <th className="p-4 text-gray-300 font-semibold">Expires</th>
                  <th className="p-4 text-gray-300 font-semibold">Views</th>
                  <th className="p-4 text-gray-300 font-semibold">Status</th>
                  <th className="p-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCarts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      {searchTerm ? 'No shared carts match your search.' : 'No shared carts found.'}
                    </td>
                  </tr>
                ) : (
                  filteredCarts.map((cart: SharedCart) => (
                    <tr key={cart.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-sm text-white break-all">
                          {cart.shareId}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white text-sm">
                          {getCartSummary(cart.cartData)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-300 text-sm">
                          {cart.createdBy || 'Anonymous'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-300 text-sm">
                          {formatDate(cart.createdAt)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm ${isExpired(cart.expiresAt) ? 'text-red-400' : 'text-gray-300'}`}>
                          {formatDate(cart.expiresAt)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-semibold">
                          {cart.accessCount}
                        </div>
                        {cart.lastAccessAt && (
                          <div className="text-xs text-gray-400">
                            Last: {formatDate(cart.lastAccessAt)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isExpired(cart.expiresAt)
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {isExpired(cart.expiresAt) ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/shared-cart/${cart.shareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View shared cart"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            onClick={() => navigator.clipboard.writeText(getCanonicalUrl(`/shared-cart/${cart.shareId}`))}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy share URL"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} shared carts
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-white text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 