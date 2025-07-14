import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_ORDER_STATUS } from '../lib/order-mutations';

interface ShipOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber?: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerEmail?: string;
  };
  onOrderUpdated: () => void;
}

const ShipOrderModal: React.FC<ShipOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  order,
  onOrderUpdated 
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);

  const commonCarriers = [
    'USPS',
    'UPS',
    'FedEx',
    'DHL',
    'Custom'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      setLoading(false);
      return;
    }

    if (!carrier) {
      setError('Please select a carrier');
      setLoading(false);
      return;
    }

    if (carrier === 'Custom' && !customCarrier.trim()) {
      setError('Please enter a custom carrier name');
      setLoading(false);
      return;
    }

    try {
      const finalCarrier = carrier === 'Custom' ? customCarrier : carrier;
      
      await updateOrderStatus({
        variables: {
          orderId: order.id,
          statusUpdate: {
            orderStatus: 'Shipped',
            fulfillmentStatus: 'partial',
            trackingNumber: trackingNumber.trim(),
            trackingCompany: finalCarrier
          }
        }
      });

      // Reset form
      setTrackingNumber('');
      setCarrier('');
      setCustomCarrier('');
      
      // Notify parent component
      onOrderUpdated();
      onClose();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTrackingNumber('');
    setCarrier('');
    setCustomCarrier('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="rounded-2xl max-w-md w-full mx-4 p-6 text-white"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Mark Order as Shipped</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300">
            Order: <span className="font-medium text-white">#{order.orderNumber || order.id.split('-')[0].toUpperCase()}</span>
          </p>
          <p className="text-sm text-gray-300">
            Customer: <span className="font-medium text-white">{order.customerFirstName} {order.customerLastName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tracking Number *
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Carrier *
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-white border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              disabled={loading}
              aria-label="Select carrier"
            >
              <option value="" style={{ background: '#1f2937', color: '#ffffff' }}>Select carrier...</option>
              {commonCarriers.map((carrierOption) => (
                <option 
                  key={carrierOption} 
                  value={carrierOption}
                  style={{ background: '#1f2937', color: '#ffffff' }}
                >
                  {carrierOption}
                </option>
              ))}
            </select>
          </div>

          {carrier === 'Custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Carrier Name *
              </label>
              <input
                type="text"
                value={customCarrier}
                onChange={(e) => setCustomCarrier(e.target.value)}
                placeholder="Enter carrier name"
                className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
              disabled={loading}
            >
              {loading ? 'Marking as Shipped...' : 'Mark as Shipped'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipOrderModal; 