import React, { useState } from 'react';
import { useAdditionalPayment } from '../hooks/useAdditionalPayment';

interface AdditionalPaymentLinkProps {
  order: {
    id: string;
    orderNumber: string;
    customerEmail: string;
    customerFirstName: string;
    customerLastName: string;
  };
}

interface AdditionalItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId: string;
  sku: string;
  calculatorSelections: any;
  customerNotes: string;
}

const AdditionalPaymentLink: React.FC<AdditionalPaymentLinkProps> = ({ order }) => {
  const [showForm, setShowForm] = useState(false);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([{
    productName: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    productId: 'additional-item',
    sku: 'ADD-ON',
    calculatorSelections: {},
    customerNotes: ''
  }]);

  const { createPaymentLink, loading, error } = useAdditionalPayment();

  const handleAddItem = () => {
    setAdditionalItems([...additionalItems, {
      productName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      productId: 'additional-item',
      sku: 'ADD-ON',
      calculatorSelections: {},
      customerNotes: ''
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof AdditionalItem, value: any) => {
    const updatedItems = [...additionalItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setAdditionalItems(updatedItems);
  };

  const handleGenerateLink = async () => {
    try {
      // Validate items
      const validItems = additionalItems.filter(item => 
        item.productName.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (validItems.length === 0) {
        alert('Please add at least one valid item with a name, quantity, and price.');
        return;
      }

      const result = await createPaymentLink(
        order.id,
        validItems,
        order.customerEmail,
        `Additional items for Order #${order.orderNumber}`
      );

      setPaymentLinkUrl(result.checkoutUrl);
      
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('Failed to generate payment link. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const totalAmount = additionalItems.reduce((sum, item) => sum + item.totalPrice, 0);

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(34, 197, 94, 0.4)'
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
        </svg>
        Additional Payment Link
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Create Additional Payment Link
          </h3>
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-400 hover:text-white"
            title="Close modal"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Order:</strong> #{order.orderNumber}
          </p>
          <p className="text-sm text-gray-300">
            <strong>Customer:</strong> {order.customerFirstName} {order.customerLastName} ({order.customerEmail})
          </p>
        </div>

        {paymentLinkUrl ? (
          <div className="mb-4 p-4 bg-green-900 bg-opacity-20 border border-green-500 rounded-lg">
            <h4 className="text-green-400 font-semibold mb-2">Payment Link Generated!</h4>
            <p className="text-sm text-gray-300 mb-3">
              Copy this link and send it to the customer manually:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentLinkUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                aria-label="Payment link URL"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-white font-medium">Additional Items</h4>
              <button
                onClick={handleAddItem}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>

            {additionalItems.map((item, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="text-sm font-medium text-white">Item #{index + 1}</h5>
                  {additionalItems.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-400 hover:text-red-300"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      placeholder="e.g., Rush Order Fee"
                      aria-label="Product name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      min="1"
                      aria-label="Quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      min="0"
                      step="0.01"
                      aria-label="Unit price"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Total Price ($)</label>
                    <input
                      type="number"
                      value={item.totalPrice.toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-300"
                      aria-label="Total price"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={item.customerNotes}
                    onChange={(e) => handleItemChange(index, 'customerNotes', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    placeholder="Additional notes for this item"
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-green-400">${totalAmount.toFixed(2)}</span>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLink}
                  disabled={loading || totalAmount === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Payment Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalPaymentLink; 