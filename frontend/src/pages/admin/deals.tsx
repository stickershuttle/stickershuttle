import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { getSupabase } from '../../lib/supabase';
import { PRESET_DEALS, DealProduct, getAllActiveDeals } from '@/data/deals/preset-deals';

// Admin emails
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

// DealCard component outside main component to prevent recreation on every render
const DealCard = React.memo(({ 
  deal, 
  isCurrentlyEditing, 
  editFormData, 
  onFieldChange, 
  onToggleActive, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onDelete 
}: {
  deal: DealProduct;
  isCurrentlyEditing: boolean;
  editFormData: Partial<DealProduct>;
  onFieldChange: (field: keyof DealProduct, value: any) => void;
  onToggleActive: (dealId: string) => void;
  onStartEdit: (deal: DealProduct) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (dealId: string) => void;
}) => {
  return (
    <div 
      className="rounded-xl p-6 h-full flex flex-col relative"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Status Badge - Top Left */}
      <div className="absolute -top-2 -left-2 z-10">
        <button
          onClick={() => onToggleActive(deal.id)}
          className={`px-3 py-1 rounded-full text-sm font-bold shadow-lg ${
            deal.isActive
              ? 'bg-gradient-to-r from-green-500 to-green-400 text-white'
              : 'bg-gradient-to-r from-gray-500 to-gray-400 text-white'
          }`}
        >
          {deal.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Save Pill - Top Right */}
      {deal.savings && (
        <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-sm font-medium holographic-save-container z-10">
          <span className="holographic-save-text">Save ${deal.savings}</span>
        </div>
      )}

      {/* Deal Image */}
      <div className="mb-4 flex justify-center">
        <img 
          src={deal.defaultImage} 
          alt={deal.name}
          className="w-24 h-24 object-contain"
        />
      </div>

      {/* Deal Info - Editable */}
      <div className="text-center mb-4 flex-grow">
        {isCurrentlyEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editFormData.name || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-lg font-bold text-center focus:outline-none focus:border-purple-500"
              placeholder="Deal Name"
            />
            <textarea
              value={editFormData.shortDescription || ''}
              onChange={(e) => onFieldChange('shortDescription', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500 resize-none"
              rows={2}
              placeholder="Short Description"
            />
            <div className="flex items-center gap-2 justify-center">
              <input
                type="number"
                value={editFormData.dealPrice || ''}
                onChange={(e) => onFieldChange('dealPrice', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-2xl font-bold text-center focus:outline-none focus:border-purple-500"
                placeholder="0"
                step="0.01"
              />
              {editFormData.originalPrice && (
                <input
                  type="number"
                  value={editFormData.originalPrice || ''}
                  onChange={(e) => onFieldChange('originalPrice', parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400 text-lg text-center focus:outline-none focus:border-purple-500"
                  placeholder="0"
                  step="0.01"
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
              {deal.name}
            </h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span 
                className={`text-4xl font-bold ${
                  deal.name.includes('Holographic') ? 'holographic-price-text' : 
                  deal.name.includes('Chrome') ? 'chrome-price-text' : 
                  'text-green-400 glow-price-text'
                }`}
                style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}
              >
                ${deal.dealPrice}
              </span>
              {deal.originalPrice && (
                <span className="text-lg text-gray-400 line-through glow-original-price" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  ${deal.originalPrice}
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm">{deal.shortDescription}</p>
          </>
        )}
      </div>

      {/* Deal Details - Editable */}
      {isCurrentlyEditing && (
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                value={editFormData.dealQuantity || ''}
                onChange={(e) => onFieldChange('dealQuantity', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Size</label>
              <input
                type="text"
                value={editFormData.dealSize || ''}
                onChange={(e) => onFieldChange('dealSize', e.target.value)}
                className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                placeholder='3"'
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Savings ($)</label>
            <input
              type="number"
              value={editFormData.savings || ''}
              onChange={(e) => onFieldChange('savings', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
              placeholder="59"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Image URL</label>
            <input
              type="url"
              value={editFormData.defaultImage || ''}
              onChange={(e) => onFieldChange('defaultImage', e.target.value)}
              className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {isCurrentlyEditing ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSaveEdit}
              className="py-2 rounded-lg font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="py-2 rounded-lg font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onStartEdit(deal)}
              className="py-2 rounded-lg font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(deal.id)}
              className="py-2 rounded-lg font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

DealCard.displayName = 'DealCard';

export default function AdminDeals() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealProduct[]>(PRESET_DEALS);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealProduct | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<DealProduct>>({});

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
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
        loadDeals();
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, []);

  // Load deals from localStorage or use preset deals
  const loadDeals = () => {
    try {
      const savedDeals = localStorage.getItem('sticker-shuttle-admin-deals');
      if (savedDeals) {
        const parsedDeals = JSON.parse(savedDeals);
        setDeals(parsedDeals);
      } else {
        setDeals(PRESET_DEALS);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
      setDeals(PRESET_DEALS);
    }
  };

  // Save deals to localStorage and update frontend
  const saveDeals = (updatedDeals: DealProduct[]) => {
    localStorage.setItem('sticker-shuttle-admin-deals', JSON.stringify(updatedDeals));
    setDeals(updatedDeals);
    
    // Dispatch event to notify frontend deals page
    window.dispatchEvent(new CustomEvent('deals-updated', { 
      detail: { deals: updatedDeals } 
    }));
  };



  // Create new deal
  const createNewDeal = () => {
    const newDeal: DealProduct = {
      id: `deal-${Date.now()}`,
      sku: `DEAL-${Date.now()}`,
      name: 'New Deal',
      description: 'New deal description',
      shortDescription: 'New deal',
      category: 'deals',
      basePrice: 0.29,
      dealPrice: 29,
      dealQuantity: 100,
      dealSize: '3"',
      originalPrice: 88,
      savings: 59,
      pricingModel: 'flat-rate',
      images: ['https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'],
      defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
      features: ['Custom Shapes', 'Premium Quality'],
      customizable: true,
      minQuantity: 1,
      maxQuantity: 1000,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calculatorConfig: {
        showPreview: true,
        allowFileUpload: true,
        requireProof: false,
        hasCustomSize: false
      }
    };

    const updatedDeals = [...deals, newDeal];
    saveDeals(updatedDeals);
    handleStartEdit(newDeal);
  };

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof DealProduct, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Memoized callback handlers
  const handleToggleActive = useCallback((dealId: string) => {
    const updatedDeals = deals.map(deal => 
      deal.id === dealId ? { ...deal, isActive: !deal.isActive } : deal
    );
    saveDeals(updatedDeals);
  }, [deals]);

  const handleStartEdit = useCallback((deal: DealProduct) => {
    setEditingDeal(deal);
    setEditFormData({
      name: deal.name,
      shortDescription: deal.shortDescription,
      dealPrice: deal.dealPrice,
      dealQuantity: deal.dealQuantity,
      dealSize: deal.dealSize,
      originalPrice: deal.originalPrice,
      savings: deal.savings,
      isActive: deal.isActive,
      defaultImage: deal.defaultImage
    });
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingDeal(null);
    setEditFormData({});
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingDeal || !editFormData) return;

    const updatedDeal: DealProduct = {
      ...editingDeal,
      ...editFormData,
      updatedAt: new Date().toISOString()
    };

    const updatedDeals = deals.map(deal => 
      deal.id === editingDeal.id ? updatedDeal : deal
    );

    saveDeals(updatedDeals);
    handleCancelEdit();
  }, [editingDeal, editFormData, deals, handleCancelEdit]);

  const handleDeleteDeal = useCallback((dealId: string) => {
    if (confirm('Are you sure you want to delete this deal?')) {
      const updatedDeals = deals.filter(deal => deal.id !== dealId);
      saveDeals(updatedDeals);
    }
  }, [deals]);

  if (loading) {
    return (
      <AdminLayout title="Deals Management - Admin">
        <div className="flex-1 pl-2 pr-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }



  return (
    <AdminLayout title="Deals Management - Admin">
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
        <div className="flex-1 pl-2 pr-4 sm:pr-6 xl:pr-8 py-6">
          {/* Header Section */}
          <section className="py-8">
            <div className="w-full mx-auto px-4">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-4">
                  🛠️ Admin Management
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white flex items-center justify-center gap-3" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                  Manage Deals
                </h1>
                <p className="text-gray-400 mt-4">
                  Edit deals that appear on the frontend deals page. Changes are reflected immediately.
                </p>
              </div>
            </div>
          </section>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <div 
              className="rounded-xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Deals</span>
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">{deals.length}</div>
            </div>

            <div 
              className="rounded-xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Active Deals</span>
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">{deals.filter(d => d.isActive).length}</div>
            </div>

            <div 
              className="rounded-xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg Price</span>
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">
                ${deals.length > 0 ? (deals.reduce((sum, d) => sum + d.dealPrice, 0) / deals.length).toFixed(0) : '0'}
              </div>
            </div>

            <div 
              className="rounded-xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Savings</span>
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">
                ${deals.reduce((sum, d) => sum + (d.savings || 0), 0)}
              </div>
            </div>
          </div>

          {/* Create New Deal Button */}
          <div className="mb-8 text-center">
            <button
              onClick={createNewDeal}
              className="px-8 py-3 rounded-lg font-bold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              + Create New Deal
            </button>
          </div>

          {/* Deals Grid */}
          <section className="pb-8">
            <div className="w-full mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {deals.map((deal) => (
                  <DealCard 
                    key={deal.id} 
                    deal={deal}
                    isCurrentlyEditing={editingDeal?.id === deal.id}
                    editFormData={editFormData}
                    onFieldChange={handleFieldChange}
                    onToggleActive={handleToggleActive}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={handleDeleteDeal}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section className="pb-8">
            <div className="w-full mx-auto px-4">
              <div 
                className="rounded-xl p-6 text-center"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <h3 className="text-2xl font-bold text-white mb-4">Admin Instructions</h3>
                <div className="text-gray-300 space-y-2">
                  <p>• Click "Edit" on any deal card to modify its details</p>
                  <p>• Toggle the Active/Inactive status to control visibility on the frontend</p>
                  <p>• Create new deals using the "Create New Deal" button</p>
                  <p>• Changes are automatically saved and reflected on the frontend deals page</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Matching Styles from Frontend */}
      <style jsx global>{`
        .holographic-save-container {
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          backdrop-filter: blur(35px) !important;
          -webkit-backdrop-filter: blur(35px) !important;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 
                      inset 0 0 20px rgba(255, 255, 255, 0.1) !important;
          font-weight: normal !important;
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .holographic-save-text {
          background: linear-gradient(45deg, 
            #ff0080, #ff8000, #ffff00, #80ff00, 
            #00ff80, #0080ff, #8000ff, #ff0080) !important;
          background-size: 400% 400% !important;
          animation: holographic-shift-deals 3s ease-in-out infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        @keyframes holographic-shift-deals {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .glow-price-text {
          text-shadow: 0 0 10px rgba(124, 232, 105, 0.5), 
                       0 0 20px rgba(124, 232, 105, 0.3), 
                       0 0 30px rgba(124, 232, 105, 0.2) !important;
        }

        .glow-original-price {
          text-shadow: 0 0 5px rgba(156, 163, 175, 0.3) !important;
        }

        .holographic-price-text {
          background: linear-gradient(45deg, 
            #ff0080, #ff4000, #ff8000, #ffff00, #80ff00, 
            #00ff80, #00ffff, #0080ff, #8000ff, #ff0080, 
            #ff0080, #ff4000, #ff8000, #ffff00, #80ff00) !important;
          background-size: 400% 400% !important;
          -webkit-animation: holographic-shift-price 2s linear infinite !important;
          animation: holographic-shift-price 2s linear infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3) !important;
        }

        @keyframes holographic-shift-price {
          0% { background-position: 0% 0%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }

        .chrome-price-text {
          background: linear-gradient(45deg, 
            #c0c0c0, #ffffff, #e8e8e8, #d4d4d4, 
            #ffffff, #c0c0c0, #a8a8a8, #ffffff) !important;
          background-size: 400% 400% !important;
          animation: chrome-shift-price 3s ease-in-out infinite !important;
          color: transparent !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          text-shadow: 0 0 10px rgba(192, 192, 192, 0.5), 
                       0 0 20px rgba(255, 255, 255, 0.3) !important;
        }

        @keyframes chrome-shift-price {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 25%; }
          50% { background-position: 0% 75%; }
          75% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </AdminLayout>
  );
} 