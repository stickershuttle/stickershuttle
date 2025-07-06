import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '@/lib/supabase';

// GraphQL queries and mutations
const GET_ALL_DISCOUNTS = gql`
  query GetAllDiscountCodes {
    getAllDiscountCodes {
      id
      code
      description
      discountType
      discountValue
      minimumOrderAmount
      usageLimit
      usageCount
      validFrom
      validUntil
      active
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DISCOUNT = gql`
  mutation CreateDiscountCode($input: CreateDiscountCodeInput!) {
    createDiscountCode(input: $input) {
      id
      code
    }
  }
`;

const UPDATE_DISCOUNT = gql`
  mutation UpdateDiscountCode($id: ID!, $input: UpdateDiscountCodeInput!) {
    updateDiscountCode(id: $id, input: $input) {
      id
      code
    }
  }
`;

const DELETE_DISCOUNT = gql`
  mutation DeleteDiscountCode($id: ID!) {
    deleteDiscountCode(id: $id)
  }
`;

const GET_DISCOUNT_STATS = gql`
  query GetDiscountCodeStats($codeId: ID!) {
    getDiscountCodeStats(codeId: $codeId) {
      totalUsage
      totalDiscountGiven
      averageOrderValue
      recentUsage {
        id
        orderId
        userId
        guestEmail
        usedAt
        discountAmount
      }
    }
  }
`;

// Admin check
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minimumOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  validFrom: string;
  validUntil?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DiscountManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
    discountValue: number;
    minimumOrderAmount: number;
    usageLimit: string | number;
    validFrom: string;
    validUntil: string;
    active: boolean;
  }>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minimumOrderAmount: 0,
    usageLimit: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    active: true
  });

  // GraphQL queries and mutations
  const { data, loading, refetch, error } = useQuery(GET_ALL_DISCOUNTS, {
    skip: !isAuthorized
  });
  
  const [createDiscount, { loading: createLoading }] = useMutation(CREATE_DISCOUNT);
  const [updateDiscount, { loading: updateLoading }] = useMutation(UPDATE_DISCOUNT);
  const [deleteDiscount, { loading: deleteLoading }] = useMutation(DELETE_DISCOUNT);
  
  const { data: statsData, loading: statsLoading } = useQuery(GET_DISCOUNT_STATS, {
    variables: { codeId: selectedDiscount },
    skip: !selectedDiscount
  });

  // Check admin authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user && ADMIN_EMAILS.includes(session.user.email || '')) {
            setUser(session.user);
            setIsAuthorized(true);
          } else {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, []); // Remove router dependency to prevent loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const input = {
        ...formData,
        usageLimit: formData.usageLimit === '' ? null : parseInt(formData.usageLimit as string),
        validUntil: formData.validUntil || null
      };

      if (editingDiscount) {
        await updateDiscount({
          variables: { 
            id: editingDiscount.id,
            input 
          }
        });
      } else {
        await createDiscount({
          variables: { input }
        });
      }
      
      refetch();
      setShowForm(false);
      setEditingDiscount(null);
      resetForm();
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('Error saving discount code. Please try again.');
    }
  };

  const handleEdit = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      description: discount.description || '',
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      minimumOrderAmount: discount.minimumOrderAmount,
      usageLimit: discount.usageLimit || '',
      validFrom: discount.validFrom.split('T')[0],
      validUntil: discount.validUntil ? discount.validUntil.split('T')[0] : '',
      active: discount.active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
      await deleteDiscount({ variables: { id } });
      refetch();
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Error deleting discount code. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minimumOrderAmount: 0,
      usageLimit: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      active: true
    });
  };

  const formatDiscountValue = (discount: DiscountCode) => {
    if (discount.discountType === 'percentage') {
      return `${discount.discountValue}%`;
    } else if (discount.discountType === 'fixed_amount') {
      return `$${discount.discountValue}`;
    } else {
      return 'Free Shipping';
    }
  };

  // Calculate discount stats
  const discounts = data?.getAllDiscountCodes || [];
  const activeDiscounts = discounts.filter((d: DiscountCode) => d.active);
  const totalUsage = discounts.reduce((sum: number, d: DiscountCode) => sum + d.usageCount, 0);
  const avgDiscountValue = discounts.length > 0 
    ? discounts
        .filter((d: DiscountCode) => d.discountType === 'percentage')
        .reduce((sum: number, d: DiscountCode) => sum + d.discountValue, 0) / 
        discounts.filter((d: DiscountCode) => d.discountType === 'percentage').length || 0
    : 0;
  const mostUsedDiscount = discounts.reduce((prev: DiscountCode | null, current: DiscountCode) => 
    (!prev || current.usageCount > prev.usageCount) ? current : prev, null);

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <style jsx global>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        @media (max-width: 768px) {
          .mobile-discount-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-discount-card:active {
            transform: scale(0.98);
          }
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
        <div className="w-full py-6 xl:py-8 pl-2 pr-4 sm:pr-6 xl:pr-8"> {/* Reduced left padding, keep right padding */}
          {/* Stats Cards - Mobile and Desktop */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6 xl:mb-8">
            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Active Codes</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">{activeDiscounts.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                of {discounts.length} total
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Total Usage</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">{totalUsage}</div>
              <div className="text-xs text-gray-500 mt-1">
                times used
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Avg. Discount</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">
                {avgDiscountValue.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                percentage off
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Most Used</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-base xl:text-lg font-bold text-white truncate">
                {mostUsedDiscount?.code || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mostUsedDiscount ? `${mostUsedDiscount.usageCount} uses` : 'No usage yet'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex justify-start">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingDiscount(null);
                resetForm();
              }}
              className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              {showForm ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Discount</span>
                </div>
              )}
            </button>
          </div>

          {/* Discount Form */}
          {showForm && (
            <div className="mb-8 rounded-2xl p-4 md:p-6 glass-container">
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-white">
                {editingDiscount ? 'Edit Discount Code' : 'Create New Discount Code'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discount Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      placeholder="e.g., SAVE20"
                      required
                      disabled={!!editingDiscount}
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({...formData, discountType: e.target.value as 'percentage' | 'fixed_amount' | 'free_shipping'})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      title="Select discount type"
                    >
                      <option value="percentage" style={{ backgroundColor: '#030140' }}>Percentage</option>
                      <option value="fixed_amount" style={{ backgroundColor: '#030140' }}>Fixed Amount</option>
                      <option value="free_shipping" style={{ backgroundColor: '#030140' }}>Free Shipping</option>
                    </select>
                  </div>

                  {formData.discountType !== 'free_shipping' && (
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Discount Value *
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                        className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                        step={formData.discountType === 'percentage' ? '1' : '0.01'}
                        required
                      />
                    </div>
                  )}

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Order Amount
                    </label>
                    <input
                      type="number"
                      value={formData.minimumOrderAmount}
                      onChange={(e) => setFormData({...formData, minimumOrderAmount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Usage Limit (blank for unlimited)
                    </label>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      placeholder="Leave blank for unlimited"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="discount-valid-from" className="block text-sm font-medium text-gray-300 mb-2">
                      Valid From *
                    </label>
                    <input
                      id="discount-valid-from"
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      required
                      aria-label="Valid from date"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="discount-valid-until" className="block text-sm font-medium text-gray-300 mb-2">
                      Valid Until (optional)
                    </label>
                    <input
                      id="discount-valid-until"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400 transition-all"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      aria-label="Valid until date (optional)"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all resize-none"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      rows={3}
                      placeholder="Internal description of this discount"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="flex items-center gap-3" htmlFor="discount-active-checkbox">
                      <input
                        id="discount-active-checkbox"
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500 bg-transparent border-white/20"
                        aria-label="Make discount active"
                      />
                      <span className="text-sm font-medium text-gray-300">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createLoading || updateLoading}
                    className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    {createLoading || updateLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{editingDiscount ? 'Update' : 'Create'}</span>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.4) 0%, rgba(107, 114, 128, 0.25) 50%, rgba(107, 114, 128, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(107, 114, 128, 0.4)',
                      boxShadow: '0 8px 32px rgba(107, 114, 128, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Discount Codes List */}
          <div className="rounded-2xl overflow-hidden glass-container">
            <div className="px-4 md:px-6 py-4 border-b border-white/10">
              <h3 className="text-lg md:text-xl font-semibold text-white">Active Discount Codes</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center space-x-2 text-gray-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                  <span>Loading discount codes...</span>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 inline-block">
                  Error loading discount codes: {error.message}
                </div>
              </div>
            ) : data?.getAllDiscountCodes?.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400">No discount codes found. Create your first one above!</div>
              </div>
            ) : (
              <>
                {/* Mobile/Tablet Discount List */}
                <div className="xl:hidden">
                  <div className="space-y-3 p-4">
                    {data?.getAllDiscountCodes?.map((discount: DiscountCode) => (
                      <div
                        key={discount.id}
                        className={`mobile-discount-card rounded-xl p-4 transition-all duration-200 ${
                          discount.active 
                            ? 'border-green-500/40 bg-green-900/10' 
                            : ''
                        }`}
                        style={{
                          ...(discount.active && {
                            borderColor: 'rgba(34, 197, 94, 0.4)',
                            background: 'rgba(34, 197, 94, 0.05)',
                          })
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-mono text-base font-semibold text-white">
                              {discount.code}
                            </h3>
                            {discount.description && (
                              <p className="text-xs text-gray-400 mt-1">{discount.description}</p>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            discount.active 
                              ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                              : 'bg-red-900/30 text-red-300 border border-red-500/30'
                          }`}>
                            {discount.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Type</span>
                            <p className="text-white font-medium">{discount.discountType.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Value</span>
                            <p className="text-white font-semibold">{formatDiscountValue(discount)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Usage</span>
                            <p className="text-white">{discount.usageCount} / {discount.usageLimit || '∞'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Expires</span>
                            <p className="text-white">
                              {discount.validUntil ? new Date(discount.validUntil).toLocaleDateString() : 'No expiry'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(discount)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-blue-300 bg-blue-900/20 border border-blue-500/30 hover:bg-blue-900/30 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-red-300 bg-red-900/20 border border-red-500/30 hover:bg-red-900/30 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Usage</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Valid Until</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.getAllDiscountCodes?.map((discount: DiscountCode) => (
                        <tr key={discount.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm font-semibold text-white">{discount.code}</div>
                            {discount.description && (
                              <div className="text-xs text-gray-400 mt-1">{discount.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30">
                              {discount.discountType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-white font-semibold">{formatDiscountValue(discount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {discount.usageCount} / {discount.usageLimit || '∞'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {discount.validUntil ? new Date(discount.validUntil).toLocaleDateString() : 'No expiry'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              discount.active 
                                ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                                : 'bg-red-900/30 text-red-300 border border-red-500/30'
                            }`}>
                              {discount.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleEdit(discount)}
                                className="p-2 rounded-lg text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
                                title="Edit discount"
                                aria-label="Edit discount"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(discount.id)}
                                className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                                title="Delete discount"
                                aria-label="Delete discount"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 