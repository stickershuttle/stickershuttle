import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { getSupabase } from '../../lib/supabase';
import DealCalendar from '../../components/DealCalendar';
import DealModal from '../../components/DealModal';

// Admin emails - same as in orders.tsx
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface Deal {
  id: string;
  name: string;
  headline: string;
  buttonText: string;
  pills: string[];
  isActive: boolean;
  orderDetails: {
    material: string;
    size: string;
    quantity: number;
    price: number;
  };
  // New scheduling fields
  startDate?: string;
  endDate?: string;
  isScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Default deal data
const defaultDeal: Deal = {
  id: 'default-100-stickers',
  name: '100 Stickers Deal',
  headline: '100 custom\nstickers for $29',
  buttonText: 'Order Now →',
  pills: [
    '🏷️ Matte Vinyl Stickers',
    '📏 3" Max Width',
    '🚀 Ships Next Day',
    '👽 Not a conspiracy theory, just great deals.'
  ],
  isActive: true,
  orderDetails: {
    material: 'Matte',
    size: '3"',
    quantity: 100,
    price: 29
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export default function AdminDeals() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([defaultDeal]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calendar and modal state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDeal, setModalDeal] = useState<Deal | null>(null);

  // Form state
  const [formData, setFormData] = useState<Deal>(defaultDeal);

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

        // Check if user email is in admin list
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
  }, [router]);

  // Load deals from localStorage (in production, this would be from database)
  const loadDeals = () => {
    const savedDeals = localStorage.getItem('sticker-shuttle-deals');
    if (savedDeals) {
      setDeals(JSON.parse(savedDeals));
    }
  };

  // Save deals to localStorage (in production, this would save to database)
  const saveDeals = (updatedDeals: Deal[]) => {
    localStorage.setItem('sticker-shuttle-deals', JSON.stringify(updatedDeals));
    setDeals(updatedDeals);
  };

  // Handle form changes
  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData as any)[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  // Handle pill changes
  const handlePillChange = (index: number, value: string) => {
    const newPills = [...formData.pills];
    newPills[index] = value;
    setFormData({
      ...formData,
      pills: newPills
    });
  };

  // Add new pill
  const addPill = () => {
    setFormData({
      ...formData,
      pills: [...formData.pills, '']
    });
  };

  // Remove pill
  const removePill = (index: number) => {
    const newPills = formData.pills.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      pills: newPills
    });
  };

  // Save deal
  const saveDeal = async () => {
    setIsSaving(true);
    
    try {
      const updatedDeal = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (isEditing && selectedDeal) {
        // Update existing deal
        const updatedDeals = deals.map(deal => 
          deal.id === selectedDeal.id ? updatedDeal : deal
        );
        saveDeals(updatedDeals);
      } else {
        // Create new deal
        const newDeal = {
          ...updatedDeal,
          id: `deal-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        saveDeals([...deals, newDeal]);
      }

      // Reset form
      setSelectedDeal(null);
      setIsEditing(false);
      setFormData(defaultDeal);
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Failed to save deal');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete deal
  const deleteDeal = (dealId: string) => {
    if (confirm('Are you sure you want to delete this deal?')) {
      const updatedDeals = deals.filter(deal => deal.id !== dealId);
      saveDeals(updatedDeals);
    }
  };

  // Toggle deal active status
  const toggleDealStatus = (dealId: string) => {
    const updatedDeals = deals.map(deal => {
      if (deal.id === dealId) {
        return { ...deal, isActive: !deal.isActive };
      }
      // Deactivate other deals (only one active at a time)
      return { ...deal, isActive: false };
    });
    saveDeals(updatedDeals);
  };

  // Edit deal
  const editDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setFormData(deal);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setSelectedDeal(null);
    setIsEditing(false);
    setFormData(defaultDeal);
  };

  // Calendar handlers
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setModalDeal(null);
    setIsModalOpen(true);
  };

  const handleDealClick = (deal: Deal) => {
    setModalDeal(deal);
    setSelectedDate('');
    setIsModalOpen(true);
  };

  const handleModalSave = (deal: Deal) => {
    if (modalDeal) {
      // Update existing deal
      const updatedDeals = deals.map(d => d.id === deal.id ? deal : d);
      saveDeals(updatedDeals);
    } else {
      // Create new deal
      saveDeals([...deals, deal]);
    }
    setIsModalOpen(false);
    setModalDeal(null);
    setSelectedDate('');
  };

  if (loading) {
    return (
      <AdminLayout title="Deals Management - Admin">
                      <div className="flex-1 pl-2 pr-8 py-6"> {/* Reduced left padding, keep right padding */}
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

  // Calculate deal stats
  const activeDeals = deals.filter(d => d.isActive);
  const avgDealPrice = deals.length > 0 
    ? deals.reduce((sum, d) => sum + d.orderDetails.price, 0) / deals.length 
    : 0;
  const lowestPrice = deals.length > 0 
    ? Math.min(...deals.map(d => d.orderDetails.price))
    : 0;
  const highestPrice = deals.length > 0 
    ? Math.max(...deals.map(d => d.orderDetails.price))
    : 0;

  // Simulated order data for deals (in production, this would come from actual order data)
  const dealOrdersCount = deals.length > 0 ? Math.floor(Math.random() * 150) + 50 : 0;
  const mostPopularDeal = deals.length > 0 ? deals[Math.floor(Math.random() * deals.length)] : null;

  return (
    <AdminLayout title="Deals Management - Admin">
      <style jsx global>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        @media (max-width: 768px) {
          .mobile-deal-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-deal-card:active {
            transform: scale(0.98);
          }
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
                  <div className="flex-1 pl-2 pr-4 sm:pr-6 xl:pr-8 py-6"> {/* Reduced left padding, keep right padding */}
          {/* Stats Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6 xl:mb-8">
            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Total Orders</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">{dealOrdersCount}</div>
              <div className="text-xs text-gray-500 mt-1">
                deals purchased
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Most Popular</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="text-base xl:text-lg font-bold text-white truncate">
                {mostPopularDeal?.name || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mostPopularDeal ? `$${mostPopularDeal.orderDetails.price}` : 'No deals yet'}
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Price Range</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="text-base xl:text-lg font-bold text-white">
                ${lowestPrice} - ${highestPrice}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                min to max
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Total Deals</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">{deals.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                created
              </div>
            </div>
          </div>

          {/* Header with Create Button */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex space-x-4">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Deal</span>
                  </div>
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 ${
                showCalendar ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{showCalendar ? 'Hide Calendar' : 'Show Calendar'}</span>
              </div>
            </button>
          </div>

          {/* Deal Form */}
          {isEditing && (
            <div className="glass-container p-4 md:p-6 mb-8">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">
                {selectedDeal ? 'Edit Deal' : 'Create New Deal'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Deal Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., 100 Stickers Deal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Headline (supports line breaks)</label>
                    <textarea
                      value={formData.headline}
                      onChange={(e) => handleInputChange('headline', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      rows={3}
                      placeholder="100 custom&#10;stickers for $29"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Button Text</label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => handleInputChange('buttonText', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Order Now →"
                    />
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="deal-material" className="block text-sm font-medium text-gray-400 mb-2">Material</label>
                    <select
                      id="deal-material"
                      value={formData.orderDetails.material}
                      onChange={(e) => handleInputChange('orderDetails.material', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      aria-label="Select material type"
                    >
                      <option value="Matte">Matte</option>
                      <option value="Glossy">Glossy</option>
                      <option value="Holographic">Holographic</option>
                      <option value="Chrome">Chrome</option>
                      <option value="Glitter">Glitter</option>
                      <option value="Clear">Clear</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Size</label>
                    <input
                      type="text"
                      value={formData.orderDetails.size}
                      onChange={(e) => handleInputChange('orderDetails.size', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder='e.g., 3"'
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="deal-quantity" className="block text-sm font-medium text-gray-400 mb-2">Quantity</label>
                      <input
                        id="deal-quantity"
                        type="number"
                        value={formData.orderDetails.quantity}
                        onChange={(e) => handleInputChange('orderDetails.quantity', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        min="1"
                        aria-label="Deal quantity"
                      />
                    </div>

                    <div>
                      <label htmlFor="deal-price" className="block text-sm font-medium text-gray-400 mb-2">Price ($)</label>
                      <input
                        id="deal-price"
                        type="number"
                        value={formData.orderDetails.price}
                        onChange={(e) => handleInputChange('orderDetails.price', parseFloat(e.target.value))}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        min="0"
                        step="0.01"
                        aria-label="Deal price in dollars"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pills/Badges */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Pills/Badges</label>
                <div className="space-y-2">
                  {formData.pills.map((pill, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={pill}
                        onChange={(e) => handlePillChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g., 🏷️ Matte Vinyl Stickers"
                      />
                      <button
                        onClick={() => removePill(index)}
                        className="px-3 md:px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addPill}
                  className="mt-3 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors text-sm"
                >
                  + Add Pill
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={saveDeal}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Deal'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Deal Calendar */}
          {showCalendar && (
            <div className="mb-8">
              <DealCalendar
                deals={deals}
                onDateClick={handleDateClick}
                onDealClick={handleDealClick}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {/* Existing Deals */}
          <div className="glass-container overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-700">
              <h2 className="text-base md:text-lg font-semibold text-white">Existing Deals</h2>
            </div>
            
            {/* Mobile/Tablet Deal List */}
            <div className="xl:hidden">
              <div className="space-y-3 p-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="mobile-deal-card rounded-xl p-4 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white">{deal.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{deal.headline.split('\n')[0]}</p>
                      </div>
                      <button
                        onClick={() => toggleDealStatus(deal.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          deal.isActive
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                      >
                        {deal.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Details</span>
                        <p className="text-white">{deal.orderDetails.quantity} × {deal.orderDetails.material}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Price</span>
                        <p className="text-white font-semibold">${deal.orderDetails.price}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editDeal(deal)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-purple-300 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDeal(deal.id)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-red-300 bg-red-900/20 border border-red-500/30 hover:bg-red-900/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {deals.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No deals created yet</p>
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Deal Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleDealStatus(deal.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            deal.isActive
                              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                          }`}
                        >
                          {deal.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{deal.name}</div>
                        <div className="text-xs text-gray-400">{deal.headline.split('\n')[0]}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {deal.orderDetails.quantity} × {deal.orderDetails.material} {deal.orderDetails.size}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">${deal.orderDetails.price}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => editDeal(deal)}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <span className="text-gray-600">|</span>
                          <button
                            onClick={() => deleteDeal(deal.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {deals.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No deals created yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Deal Modal */}
          <DealModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setModalDeal(null);
              setSelectedDate('');
            }}
            onSave={handleModalSave}
            selectedDate={selectedDate}
            existingDeal={modalDeal}
          />
        </div>
      </div>
    </AdminLayout>
  );
} 