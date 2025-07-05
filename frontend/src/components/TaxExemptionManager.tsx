import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_TAX_EXEMPTION } from '../lib/profile-mutations';

interface TaxExemptionManagerProps {
  customer: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    isTaxExempt?: boolean;
    taxExemptId?: string;
    taxExemptReason?: string;
    taxExemptExpiresAt?: string;
    taxExemptUpdatedAt?: string;
    taxExemptUpdatedBy?: string;
  };
  onUpdate?: () => void;
}

const TaxExemptionManager: React.FC<TaxExemptionManagerProps> = ({ customer, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    isTaxExempt: customer.isTaxExempt || false,
    taxExemptId: customer.taxExemptId || '',
    taxExemptReason: customer.taxExemptReason || '',
    taxExemptExpiresAt: customer.taxExemptExpiresAt || ''
  });

  const [updateTaxExemption, { loading }] = useMutation(UPDATE_TAX_EXEMPTION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await updateTaxExemption({
        variables: {
          userId: customer.userId,
          input: {
            isTaxExempt: formData.isTaxExempt,
            taxExemptId: formData.isTaxExempt ? formData.taxExemptId : undefined,
            taxExemptReason: formData.isTaxExempt ? formData.taxExemptReason : undefined,
            taxExemptExpiresAt: formData.isTaxExempt && formData.taxExemptExpiresAt ? formData.taxExemptExpiresAt : undefined
          }
        }
      });

      if (result.data?.updateTaxExemption?.success) {
        setIsEditing(false);
        onUpdate?.();
        console.log('✅ Tax exemption updated successfully');
      } else {
        console.error('❌ Tax exemption update failed:', result.data?.updateTaxExemption?.message);
        alert('Failed to update tax exemption status');
      }
    } catch (error) {
      console.error('❌ Error updating tax exemption:', error);
      alert('Error updating tax exemption status');
    }
  };

  const handleCancel = () => {
    setFormData({
      isTaxExempt: customer.isTaxExempt || false,
      taxExemptId: customer.taxExemptId || '',
      taxExemptReason: customer.taxExemptReason || '',
      taxExemptExpiresAt: customer.taxExemptExpiresAt || ''
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="glassmorphism p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Tax Exemption Status</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="glassmorphism-button px-4 py-2 rounded text-sm text-white hover:opacity-80 transition-opacity"
          >
            Edit
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-300">Status:</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              customer.isTaxExempt 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {customer.isTaxExempt ? 'Tax Exempt' : 'Taxable'}
            </span>
          </div>
          
          {customer.isTaxExempt && (
            <>
              {customer.taxExemptId && (
                <div className="flex space-x-2">
                  <span className="text-gray-300">Certificate ID:</span>
                  <span className="text-white">{customer.taxExemptId}</span>
                </div>
              )}
              
              {customer.taxExemptReason && (
                <div className="flex space-x-2">
                  <span className="text-gray-300">Reason:</span>
                  <span className="text-white">{customer.taxExemptReason}</span>
                </div>
              )}
              
              <div className="flex space-x-2">
                <span className="text-gray-300">Expires:</span>
                <span className="text-white">{formatDate(customer.taxExemptExpiresAt || '')}</span>
              </div>
              
              {customer.taxExemptUpdatedAt && (
                <div className="flex space-x-2">
                  <span className="text-gray-300">Last Updated:</span>
                  <span className="text-white">{formatDate(customer.taxExemptUpdatedAt)}</span>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isTaxExempt"
              checked={formData.isTaxExempt}
              onChange={(e) => setFormData({ ...formData, isTaxExempt: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isTaxExempt" className="text-white font-medium">
              Customer is tax exempt
            </label>
          </div>

          {formData.isTaxExempt && (
            <>
              <div>
                <label htmlFor="taxExemptId" className="block text-sm font-medium text-gray-300 mb-1">
                  Tax Exemption Certificate ID
                </label>
                <input
                  type="text"
                  id="taxExemptId"
                  value={formData.taxExemptId}
                  onChange={(e) => setFormData({ ...formData, taxExemptId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter certificate or license number"
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
                <label htmlFor="taxExemptReason" className="block text-sm font-medium text-gray-300 mb-1">
                  Reason for Tax Exemption
                </label>
                <select
                  id="taxExemptReason"
                  value={formData.taxExemptReason}
                  onChange={(e) => setFormData({ ...formData, taxExemptReason: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)'
                  }}
                >
                  <option value="" className="bg-gray-800 text-white">Select reason</option>
                  <option value="Non-profit organization" className="bg-gray-800 text-white">Non-profit organization</option>
                  <option value="Government entity" className="bg-gray-800 text-white">Government entity</option>
                  <option value="Educational institution" className="bg-gray-800 text-white">Educational institution</option>
                  <option value="Religious organization" className="bg-gray-800 text-white">Religious organization</option>
                  <option value="Resale certificate" className="bg-gray-800 text-white">Resale certificate</option>
                  <option value="Other" className="bg-gray-800 text-white">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="taxExemptExpiresAt" className="block text-sm font-medium text-gray-300 mb-1">
                  Exemption Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  id="taxExemptExpiresAt"
                  value={formData.taxExemptExpiresAt ? new Date(formData.taxExemptExpiresAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, taxExemptExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)'
                  }}
                />
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="glassmorphism-button px-4 py-2 rounded text-white hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-500 rounded text-gray-300 hover:bg-gray-500/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TaxExemptionManager; 