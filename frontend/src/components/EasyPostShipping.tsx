import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_EASYPOST_SHIPMENT, BUY_EASYPOST_LABEL } from '../lib/easypost-mutations';

interface EasyPostShippingProps {
  order: {
    id: string;
    orderNumber?: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerEmail?: string;
    shippingAddress?: any;
    items?: any[];
  };
  onClose: () => void;
  onLabelCreated?: (labelData: any) => void;
}

interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days?: number;
  delivery_date?: string;
  delivery_date_guaranteed?: boolean;
}

interface EasyPostShipment {
  id: string;
  rates: EasyPostRate[];
  to_address: any;
  from_address: any;
  parcel: any;
  reference: string;
}

const EasyPostShipping: React.FC<EasyPostShippingProps> = ({ order, onClose, onLabelCreated }) => {
  const [step, setStep] = useState<'loading' | 'rates' | 'purchasing' | 'complete' | 'error'>('loading');
  const [shipment, setShipment] = useState<EasyPostShipment | null>(null);
  const [selectedRate, setSelectedRate] = useState<EasyPostRate | null>(null);
  const [insurance, setInsurance] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [labelData, setLabelData] = useState<any>(null);

  const [createShipment] = useMutation(CREATE_EASYPOST_SHIPMENT);
  const [buyLabel] = useMutation(BUY_EASYPOST_LABEL);

  React.useEffect(() => {
    handleCreateShipment();
  }, []);

  const handleCreateShipment = async () => {
    try {
      setStep('loading');
      const { data } = await createShipment({
        variables: { orderId: order.id }
      });

      if (data.createEasyPostShipment.success) {
        setShipment(data.createEasyPostShipment.shipment);
        setStep('rates');
      } else {
        setError(data.createEasyPostShipment.error || 'Failed to create shipment');
        setStep('error');
      }
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      setError(err.message || 'Failed to create shipment');
      setStep('error');
    }
  };

  const handleBuyLabel = async () => {
    if (!selectedRate || !shipment) return;

    try {
      setStep('purchasing');
      const { data } = await buyLabel({
        variables: {
          shipmentId: shipment.id,
          rateId: selectedRate.id,
          insurance: insurance || null
        }
      });

      if (data.buyEasyPostLabel.success) {
        setLabelData(data.buyEasyPostLabel.shipment);
        setStep('complete');
        onLabelCreated?.(data.buyEasyPostLabel.shipment);
      } else {
        setError(data.buyEasyPostLabel.error || 'Failed to purchase label');
        setStep('error');
      }
    } catch (err: any) {
      console.error('Error buying label:', err);
      setError(err.message || 'Failed to purchase label');
      setStep('error');
    }
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const formatDelivery = (rate: EasyPostRate) => {
    if (rate.delivery_days) {
      return `${rate.delivery_days} business day${rate.delivery_days > 1 ? 's' : ''}`;
    }
    if (rate.delivery_date) {
      return new Date(rate.delivery_date).toLocaleDateString();
    }
    return 'Standard delivery';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">EasyPost Shipping</h2>
              <p className="text-purple-100">
                Order: {order.orderNumber || `#${order.id.split('-')[0]}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Creating shipment with EasyPost...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={handleCreateShipment}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          )}

          {step === 'rates' && shipment && (
            <div>
              {/* Shipping Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Ship From</h3>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{shipment.from_address.name}</p>
                    {shipment.from_address.company && (
                      <p>{shipment.from_address.company}</p>
                    )}
                    <p>{shipment.from_address.street1}</p>
                    {shipment.from_address.street2 && (
                      <p>{shipment.from_address.street2}</p>
                    )}
                    <p>
                      {shipment.from_address.city}, {shipment.from_address.state} {shipment.from_address.zip}
                    </p>
                    <p>{shipment.from_address.country}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Ship To</h3>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{shipment.to_address.name}</p>
                    {shipment.to_address.company && (
                      <p>{shipment.to_address.company}</p>
                    )}
                    <p>{shipment.to_address.street1}</p>
                    {shipment.to_address.street2 && (
                      <p>{shipment.to_address.street2}</p>
                    )}
                    <p>
                      {shipment.to_address.city}, {shipment.to_address.state} {shipment.to_address.zip}
                    </p>
                    <p>{shipment.to_address.country}</p>
                  </div>
                </div>
              </div>

              {/* Package Information */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Package Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Length:</span>
                    <p className="font-medium">{shipment.parcel.length}"</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Width:</span>
                    <p className="font-medium">{shipment.parcel.width}"</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Height:</span>
                    <p className="font-medium">{shipment.parcel.height}"</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Weight:</span>
                    <p className="font-medium">{shipment.parcel.weight} oz</p>
                  </div>
                </div>
              </div>

              {/* Shipping Rates */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Select Shipping Rate</h3>
                <div className="space-y-3">
                  {shipment.rates.map((rate) => (
                    <div
                      key={rate.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedRate?.id === rate.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRate(rate)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">
                              {rate.carrier} {rate.service}
                            </span>
                            {rate.delivery_date_guaranteed && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                Guaranteed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDelivery(rate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">
                            {formatCurrency(rate.rate)}
                          </p>
                          <p className="text-xs text-gray-500">{rate.currency}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Optional Insurance</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="Insurance amount (USD)"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="text-gray-600">USD</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for no insurance coverage
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyLabel}
                  disabled={!selectedRate}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Purchase Label {selectedRate && `(${formatCurrency(selectedRate.rate)})`}
                </button>
              </div>
            </div>
          )}

          {step === 'purchasing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Purchasing shipping label...</p>
            </div>
          )}

          {step === 'complete' && labelData && (
            <div className="text-center py-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="text-green-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-green-800 font-semibold text-xl mb-2">Label Created Successfully!</h3>
                <p className="text-green-700 mb-4">
                  Tracking Number: <span className="font-mono font-bold">{labelData.tracking_code}</span>
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 text-left">
                  <div className="bg-white rounded-lg p-4 border">
                    <h4 className="font-semibold text-gray-800 mb-2">Shipping Details</h4>
                    <p><strong>Carrier:</strong> {labelData.selected_rate.carrier}</p>
                    <p><strong>Service:</strong> {labelData.selected_rate.service}</p>
                    <p><strong>Cost:</strong> {formatCurrency(labelData.selected_rate.rate)}</p>
                    {labelData.selected_rate.delivery_days && (
                      <p><strong>Delivery:</strong> {formatDelivery(labelData.selected_rate)}</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border">
                    <h4 className="font-semibold text-gray-800 mb-2">Label & Tracking</h4>
                    <p><strong>Label Size:</strong> {labelData.postage_label.label_size}</p>
                    <p><strong>Format:</strong> {labelData.postage_label.label_file_type}</p>
                    {labelData.tracker.public_url && (
                      <p>
                        <strong>Track:</strong>{' '}
                        <a 
                          href={labelData.tracker.public_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Tracking
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <a
                  href={labelData.postage_label.label_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Label
                </a>
                <button
                  onClick={onClose}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EasyPostShipping; 