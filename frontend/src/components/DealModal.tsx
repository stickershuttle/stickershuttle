import React, { useState, useEffect } from 'react';
import { getHolidaysForDate } from '../data/holidays';

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
  startDate?: string;
  endDate?: string;
  isScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deal: Deal) => void;
  selectedDate?: string;
  existingDeal?: Deal | null;
}

const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  existingDeal
}) => {
  const [formData, setFormData] = useState<Partial<Deal>>({
    name: '',
    headline: '',
    buttonText: 'Order Now →',
    pills: ['🏷️ Matte Vinyl Stickers', '📏 3" Max Width', '🚀 Ships Next Day'],
    isActive: true,
    orderDetails: {
      material: 'Matte',
      size: '3"',
      quantity: 100,
      price: 29
    },
    startDate: selectedDate || '',
    endDate: selectedDate || '',
    isScheduled: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingDeal) {
      setFormData(existingDeal);
    } else if (selectedDate) {
      // Check if the selected date has any holidays
      const holidaysOnDate = getHolidaysForDate(selectedDate);
      const primaryHoliday = holidaysOnDate[0]; // Use the first holiday if multiple exist
      
              // Auto-fill deal name based on holiday
        let autoName = '';
        let autoHeadline = '';
        let autoPills = ['🏷️ Matte Vinyl Stickers', '📏 3" Max Width', '🚀 Ships Next Day'];
        let autoPrice = 29;
        
        if (primaryHoliday) {
          switch (primaryHoliday.name) {
            case "Valentine's Day":
              autoName = "Valentine's Day Special";
              autoHeadline = "Love-themed stickers\nfor your special someone";
              autoPills = ['💝 Perfect for Valentine\'s', '❤️ Love-themed designs', '🚀 Ships before Feb 14th', '💕 Make someone smile'];
              autoPrice = 24; // Valentine's special pricing
              break;
            case "St. Patrick's Day":
              autoName = "St. Patrick's Day Deal";
              autoHeadline = "Lucky green stickers\nfor St. Paddy's Day";
              autoPills = ['🍀 Lucky green stickers', '🎉 Perfect for celebrations', '🚀 Ships before March 17th', '☘️ Irish-themed designs'];
              break;
            case "Easter":
              autoName = "Easter Spring Sale";
              autoHeadline = "Spring into savings\nwith Easter stickers";
              autoPills = ['🐰 Easter-themed designs', '🌸 Spring colors available', '🚀 Ships before Easter', '🥕 Perfect for egg hunts'];
              break;
            case "Mother's Day":
              autoName = "Mother's Day Special";
              autoHeadline = "Show mom you care\nwith custom stickers";
              autoPills = ['👩 Perfect for mom', '💐 Beautiful designs', '🚀 Ships before Mother\'s Day', '💝 Gift-ready packaging'];
              autoPrice = 25; // Mother's Day pricing
              break;
            case "Father's Day":
              autoName = "Father's Day Deal";
              autoHeadline = "Dad-approved stickers\nat great prices";
              autoPills = ['👨 Dad-themed designs', '🛠️ Durable materials', '🚀 Ships before Father\'s Day', '🎁 Perfect gift for dad'];
              autoPrice = 25; // Father's Day pricing
              break;
            case "Independence Day":
              autoName = "July 4th Spectacular";
              autoHeadline = "Patriotic stickers\nfor Independence Day";
              autoPills = ['🇺🇸 Patriotic designs', '🎆 Red, white & blue', '🚀 Ships before July 4th', '🎇 Perfect for celebrations'];
              break;
            case "Back to School":
              autoName = "Back to School Sale";
              autoHeadline = "Get ready for school\nwith custom stickers";
              autoPills = ['🎒 School-themed designs', '📚 Educational fun', '🚀 Ships before school starts', '✏️ Perfect for supplies'];
              autoPrice = 22; // Back to school pricing
              break;
            case "Halloween":
              autoName = "Halloween Spooktacular";
              autoHeadline = "Spooky stickers\nfor Halloween fun";
              autoPills = ['🎃 Spooky designs', '👻 Halloween-themed', '🚀 Ships before Oct 31st', '🕷️ Perfect for decorating'];
              break;
            case "Black Friday":
              autoName = "Black Friday Mega Deal";
              autoHeadline = "Biggest savings\nof the year!";
              autoPills = ['🛍️ Biggest sale of the year', '💰 Massive savings', '🚀 Limited time only', '🔥 Best deal ever'];
              autoPrice = 19; // Black Friday special pricing
              break;
            case "Cyber Monday":
              autoName = "Cyber Monday Special";
              autoHeadline = "Online exclusive\nsticker deals";
              autoPills = ['💻 Online exclusive', '⚡ Digital deals', '🚀 Fast shipping', '🎯 Limited time offer'];
              autoPrice = 20; // Cyber Monday pricing
              break;
            case "Christmas":
              autoName = "Christmas Holiday Sale";
              autoHeadline = "Festive stickers\nfor the holidays";
              autoPills = ['🎄 Christmas-themed', '🎅 Holiday designs', '🚀 Ships before Christmas', '🎁 Perfect for gifts'];
              autoPrice = 26; // Christmas pricing
              break;
            case "New Year's Day":
              autoName = "New Year New Deals";
              autoHeadline = "Start the year right\nwith fresh stickers";
              autoPills = ['🎉 New Year special', '✨ Fresh start designs', '🚀 Quick shipping', '🥳 Celebration ready'];
              autoPrice = 23; // New Year pricing
              break;
            default:
              autoName = `${primaryHoliday.name} Special`;
              autoHeadline = `Celebrate ${primaryHoliday.name}\nwith custom stickers`;
              autoPills = [`${primaryHoliday.emoji} ${primaryHoliday.name} themed`, '🏷️ Custom designs', '🚀 Fast shipping', '🎉 Perfect for celebrating'];
          }
        }

              setFormData(prev => ({
          ...prev,
          name: autoName,
          headline: autoHeadline,
          pills: autoPills,
          orderDetails: {
            material: prev.orderDetails?.material || 'Matte',
            size: prev.orderDetails?.size || '3"',
            quantity: prev.orderDetails?.quantity || 100,
            price: autoPrice
          },
          startDate: selectedDate,
          endDate: selectedDate
        }));
    }
  }, [existingDeal, selectedDate]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePillChange = (index: number, value: string) => {
    const newPills = [...(formData.pills || [])];
    newPills[index] = value;
    setFormData(prev => ({ ...prev, pills: newPills }));
  };

  const addPill = () => {
    setFormData(prev => ({
      ...prev,
      pills: [...(prev.pills || []), '']
    }));
  };

  const removePill = (index: number) => {
    const newPills = (formData.pills || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, pills: newPills }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Deal name is required';
    }

    if (!formData.headline?.trim()) {
      newErrors.headline = 'Headline is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.orderDetails?.price || formData.orderDetails.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.orderDetails?.quantity || formData.orderDetails.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const dealToSave: Deal = {
      id: existingDeal?.id || `deal-${Date.now()}`,
      name: formData.name!,
      headline: formData.headline!,
      buttonText: formData.buttonText || 'Order Now →',
      pills: formData.pills || [],
      isActive: formData.isActive ?? true,
      orderDetails: formData.orderDetails!,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isScheduled: true,
      createdAt: existingDeal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(dealToSave);
    onClose();
  };

  const getDealDuration = () => {
    if (!formData.startDate || !formData.endDate) return '';
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const getHolidaysInRange = () => {
    if (!formData.startDate || !formData.endDate) return [];
    
    const holidays = [];
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayHolidays = getHolidaysForDate(dateStr);
      holidays.push(...dayHolidays);
    }
    
    return holidays;
  };

  if (!isOpen) return null;

  const holidaysInRange = getHolidaysInRange();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {existingDeal ? 'Edit Scheduled Deal' : 'Create New Deal'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deal Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="e.g., Valentine's Day Special"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Headline *
                </label>
                <textarea
                  value={formData.headline || ''}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.headline ? 'border-red-500' : 'border-gray-700'
                  }`}
                  rows={3}
                  placeholder="100 custom&#10;stickers for $29"
                />
                {errors.headline && <p className="text-red-400 text-sm mt-1">{errors.headline}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={formData.buttonText || ''}
                  onChange={(e) => handleInputChange('buttonText', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Order Now →"
                />
              </div>

              {/* Deal Schedule */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">📅 Deal Schedule</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date *
                    </label>
                                         <input
                       type="date"
                       value={formData.startDate || ''}
                       onChange={(e) => handleInputChange('startDate', e.target.value)}
                       className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                         errors.startDate ? 'border-red-500' : 'border-gray-700'
                       }`}
                       aria-label="Deal start date"
                     />
                    {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date *
                    </label>
                                         <input
                       type="date"
                       value={formData.endDate || ''}
                       onChange={(e) => handleInputChange('endDate', e.target.value)}
                       className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                         errors.endDate ? 'border-red-500' : 'border-gray-700'
                       }`}
                       aria-label="Deal end date"
                     />
                    {errors.endDate && <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>}
                  </div>
                </div>

                {getDealDuration() && (
                  <div className="text-sm text-blue-300 mb-3">
                    Duration: {getDealDuration()}
                  </div>
                )}

                {holidaysInRange.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-yellow-300 mb-2">
                      🎉 Holidays during this deal:
                    </p>
                    <div className="space-y-1">
                      {holidaysInRange.map((holiday, idx) => (
                        <div key={idx} className="text-xs text-gray-300">
                          {holiday.emoji} {holiday.name} ({new Date(holiday.date).toLocaleDateString()})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Order Details & Pills */}
            <div className="space-y-6">
              {/* Order Details */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">📦 Order Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Material
                    </label>
                                         <select
                       value={formData.orderDetails?.material || 'Matte'}
                       onChange={(e) => handleInputChange('orderDetails.material', e.target.value)}
                       className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                       aria-label="Deal material type"
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Size
                    </label>
                    <input
                      type="text"
                      value={formData.orderDetails?.size || ''}
                      onChange={(e) => handleInputChange('orderDetails.size', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder='e.g., 3"'
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quantity *
                      </label>
                                             <input
                         type="number"
                         value={formData.orderDetails?.quantity || ''}
                         onChange={(e) => handleInputChange('orderDetails.quantity', parseInt(e.target.value))}
                         className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                           errors.quantity ? 'border-red-500' : 'border-gray-700'
                         }`}
                         min="1"
                         aria-label="Deal quantity"
                       />
                      {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price ($) *
                      </label>
                                             <input
                         type="number"
                         value={formData.orderDetails?.price || ''}
                         onChange={(e) => handleInputChange('orderDetails.price', parseFloat(e.target.value))}
                         className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                           errors.price ? 'border-red-500' : 'border-gray-700'
                         }`}
                         min="0"
                         step="0.01"
                         aria-label="Deal price"
                       />
                      {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pills/Badges */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pills/Badges
                </label>
                <div className="space-y-2">
                  {(formData.pills || []).map((pill, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={pill}
                        onChange={(e) => handlePillChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 🏷️ Matte Vinyl Stickers"
                      />
                      <button
                        onClick={() => removePill(index)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
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

              {/* Active Status */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                  Make this deal active immediately
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {existingDeal ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealModal; 