import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_WHOLESALE_CUSTOMER } from '../lib/wholesale-analytics-mutations';

interface WholesaleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onUpdate: () => void;
}

const WholesaleEditModal: React.FC<WholesaleEditModalProps> = ({
  isOpen,
  onClose,
  customer,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    wholesaleCreditRate: 0.1,
    wholesaleMonthlyCustomers: '',
    wholesaleOrderingFor: '',
    wholesaleFitExplanation: ''
  });

  const [updateCustomer, { loading }] = useMutation(UPDATE_WHOLESALE_CUSTOMER);

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        companyName: customer.companyName || '',
        wholesaleCreditRate: customer.wholesaleCreditRate || 0.1,
        wholesaleMonthlyCustomers: customer.wholesaleMonthlyCustomers || '',
        wholesaleOrderingFor: customer.wholesaleOrderingFor || '',
        wholesaleFitExplanation: customer.wholesaleFitExplanation || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data } = await updateCustomer({
        variables: {
          userId: customer.userId,
          input: formData
        }
      });

      if (data?.updateWholesaleCustomer?.success) {
        console.log('✅ Customer updated successfully');
        onUpdate();
        onClose();
      } else {
        console.error('❌ Update failed:', data?.updateWholesaleCustomer?.message);
      }
    } catch (error) {
      console.error('❌ Error updating customer:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-gray-900 p-8 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Wholesale Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="First Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Last Name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Company Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Credit Rate
            </label>
            <select
              value={formData.wholesaleCreditRate}
              onChange={(e) => setFormData({ ...formData, wholesaleCreditRate: parseFloat(e.target.value) })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Credit Rate"
            >
              <option value={0.05}>5% (Standard)</option>
              <option value={0.10}>10% (Wholesale)</option>
              <option value={0.15}>15% (Premium)</option>
              <option value={0.20}>20% (VIP)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monthly Customers
            </label>
            <input
              type="text"
              value={formData.wholesaleMonthlyCustomers}
              onChange={(e) => setFormData({ ...formData, wholesaleMonthlyCustomers: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 50-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ordering For
            </label>
            <input
              type="text"
              value={formData.wholesaleOrderingFor}
              onChange={(e) => setFormData({ ...formData, wholesaleOrderingFor: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Retail store, Event planning"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Fit Explanation
            </label>
            <textarea
              value={formData.wholesaleFitExplanation}
              onChange={(e) => setFormData({ ...formData, wholesaleFitExplanation: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              placeholder="Describe how this customer fits your wholesale program..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {loading ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WholesaleEditModal; 