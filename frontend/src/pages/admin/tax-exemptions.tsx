import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import AdminLayout from '@/components/AdminLayout';
import TaxExemptionManager from '@/components/TaxExemptionManager';
import { GET_ALL_CUSTOMERS_WITH_PROFILES } from '@/lib/admin-mutations';

interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  isWholesaleCustomer?: boolean;
  isTaxExempt?: boolean;
  taxExemptId?: string;
  taxExemptReason?: string;
  taxExemptExpiresAt?: string;
  taxExemptUpdatedAt?: string;
  taxExemptUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const TaxExemptionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'exempt' | 'taxable'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_ALL_CUSTOMERS_WITH_PROFILES, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network'
  });

  const customers: Customer[] = data?.getAllWholesaleCustomers || [];

  // Filter customers based on search term and filter
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchTerm === '' || 
      customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
      (filter === 'exempt' && customer.isTaxExempt) ||
      (filter === 'taxable' && !customer.isTaxExempt);
    
    return matchesSearch && matchesFilter;
  });

  const handleCustomerUpdate = () => {
    refetch();
    setSelectedCustomer(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getExemptionStatusColor = (isExempt: boolean) => {
    return isExempt 
      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
      : 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  if (loading && customers.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-400">Loading customers...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && customers.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading customers: {error.message}</p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tax Exemptions - Admin Dashboard">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tax Exemption Management</h1>
          <p className="text-gray-400">Manage customer tax exemption status and documentation</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="glassmorphism p-6 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
                Search Customers
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or company..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)'
                }}
              />
            </div>
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'exempt' | 'taxable')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)'
                }}
              >
                <option value="all" className="bg-gray-800 text-white">All Customers</option>
                <option value="exempt" className="bg-gray-800 text-white">Tax Exempt</option>
                <option value="taxable" className="bg-gray-800 text-white">Taxable</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="glassmorphism p-6 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Customers</p>
                <p className="text-2xl font-bold text-white">{customers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="glassmorphism p-6 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Tax Exempt</p>
                <p className="text-2xl font-bold text-white">
                  {customers.filter(c => c.isTaxExempt).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glassmorphism p-6 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Taxable</p>
                <p className="text-2xl font-bold text-white">
                  {customers.filter(c => !c.isTaxExempt).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="glassmorphism rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Customers ({filteredCustomers.length})</h2>
          </div>
          
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              {searchTerm || filter !== 'all' ? 'No customers match your search criteria.' : 'No customers found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tax Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Certificate ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.companyName && (
                            <div className="text-sm text-gray-400">{customer.companyName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getExemptionStatusColor(customer.isTaxExempt || false)}`}>
                          {customer.isTaxExempt ? 'Tax Exempt' : 'Taxable'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.taxExemptId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.taxExemptReason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(customer.taxExemptExpiresAt || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="glassmorphism-button px-3 py-1 rounded text-white hover:opacity-80 transition-opacity"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tax Exemption Management Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-transparent max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="relative">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Manage Tax Exemption - {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  {selectedCustomer.companyName && (
                    <p className="text-gray-400 mb-6">{selectedCustomer.companyName}</p>
                  )}
                  
                  <TaxExemptionManager
                    customer={selectedCustomer}
                    onUpdate={handleCustomerUpdate}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TaxExemptionsPage; 