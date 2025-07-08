import React from 'react';
import AIFileImage from '../../AIFileImage';

interface SupportViewProps {
  orders: any[];
  contactFormData: any;
  setContactFormData: React.Dispatch<React.SetStateAction<any>>;
  contactSubmitted: boolean;
  isSubmittingContact: boolean;
  showOrderDropdown: boolean;
  setShowOrderDropdown: (show: boolean) => void;
  handleContactChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleContactSubmit: (e: React.FormEvent) => void;
  getOrderDisplayNumber: (order: any) => number | string;
  getProductImage: (item: any, itemData: any) => string | null;
}

const SupportView: React.FC<SupportViewProps> = ({
  orders,
  contactFormData,
  setContactFormData,
  contactSubmitted,
  isSubmittingContact,
  showOrderDropdown,
  setShowOrderDropdown,
  handleContactChange,
  handleContactSubmit,
  getOrderDisplayNumber,
  getProductImage
}) => {
  const concernReasons = [
    { value: 'order-issue', label: 'Order Issue' },
    { value: 'proof-concerns', label: 'Proof Concerns' },
    { value: 'shipping-delay', label: 'Shipping Delay' },
    { value: 'quality-issue', label: 'Quality Issue' },
    { value: 'refund-request', label: 'Refund Request' },
    { value: 'design-help', label: 'Design Help Needed' },
    { value: 'billing-question', label: 'Billing Question' },
    { value: 'technical-issue', label: 'Technical Issue' },
    { value: 'product-inquiry', label: 'Product Inquiry' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div 
      className="rounded-2xl p-6 md:p-8"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
        </svg>
        Support
      </h2>
      
      <form onSubmit={handleContactSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="support-name" className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              id="support-name"
              name="name"
              value={contactFormData.name}
              onChange={handleContactChange}
              required
              className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="support-email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              id="support-email"
              name="email"
              value={contactFormData.email}
              onChange={handleContactChange}
              required
              className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="support-reason" className="block text-sm font-medium text-gray-300 mb-2">
            Reason for Contact
          </label>
          <select
            id="support-reason"
            name="subject"
            value={contactFormData.subject}
            onChange={handleContactChange}
            required
            className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <option value="" style={{ backgroundColor: '#030140' }}>Select a reason</option>
            {concernReasons.map(reason => (
              <option key={reason.value} value={reason.value} style={{ backgroundColor: '#030140' }}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Related Order (Optional)
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOrderDropdown(!showOrderDropdown)}
              className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <span>
                {contactFormData.relatedOrder ? 
                  (() => {
                    const selectedOrder = orders.find(order => order.id === contactFormData.relatedOrder);
                    return selectedOrder ? (
                      <div className="flex items-center gap-3">
                        <AIFileImage
                          src={getProductImage(selectedOrder.items[0], selectedOrder._fullOrderData?.items?.[0]) || selectedOrder.items[0]?.image || 'https://via.placeholder.com/40'}
                          filename={selectedOrder.items[0]?.customFiles?.[0]?.split('/').pop()?.split('?')[0] || 'design.jpg'}
                          alt="Order preview"
                          className="w-10 h-10 rounded object-cover"
                          size="thumbnail"
                          showFileType={false}
                        />
                        <span>Order #{getOrderDisplayNumber(selectedOrder)} - ${selectedOrder.total.toFixed(2)}</span>
                      </div>
                    ) : 'Select an order';
                  })() : 
                  'Select an order (optional)'
                }
              </span>
              <svg className={`w-5 h-5 transition-transform ${showOrderDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showOrderDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto"
                   style={{
                     backgroundColor: 'rgba(3, 1, 64, 0.95)',
                     backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255, 255, 255, 0.15)'
                   }}>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContactFormData((prev: any) => ({ ...prev, relatedOrder: '' }));
                      setShowOrderDropdown(false);
                    }}
                    className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors text-gray-300"
                  >
                    No specific order
                  </button>
                  
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setContactFormData((prev: any) => ({ ...prev, relatedOrder: order.id }));
                        setShowOrderDropdown(false);
                      }}
                      className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <AIFileImage
                          src={getProductImage(order.items[0], order._fullOrderData?.items?.[0]) || order.items[0]?.image || 'https://via.placeholder.com/40'}
                          filename={order.items[0]?.customFiles?.[0]?.split('/').pop()?.split('?')[0] || 'design.jpg'}
                          alt={order.items[0]?.name}
                          className="w-12 h-12 rounded object-cover"
                          size="thumbnail"
                          showFileType={false}
                        />
                        <div>
                          <div className="text-white font-medium">Order #{getOrderDisplayNumber(order)}</div>
                          <div className="text-gray-400 text-sm">{new Date(order.date).toLocaleDateString()} - ${order.total.toFixed(2)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="support-message" className="block text-sm font-medium text-gray-300 mb-2">
            Message
          </label>
          <textarea
            id="support-message"
            name="message"
            value={contactFormData.message}
            onChange={handleContactChange}
            required
            rows={5}
            className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
            placeholder="Please describe your issue or question..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmittingContact}
            className="flex-1 py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
              color: 'white'
            }}
          >
            {isSubmittingContact ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : 'Submit Request'}
          </button>
        </div>
      </form>

      {/* Success Message */}
      {contactSubmitted && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/20 border border-green-400/50">
          <p className="text-green-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Support request sent! We'll get back to you within 24 hours.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupportView;