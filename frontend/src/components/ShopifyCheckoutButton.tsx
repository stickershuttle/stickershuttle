import React from 'react';
import { useCheckout } from '@/hooks/useCheckout';

interface CheckoutItem {
  title: string;
  price: number;
  quantity?: number;
  sku?: string;
}

interface CustomerInfo {
  email?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  note?: string;
}

interface ShopifyCheckoutButtonProps {
  items: CheckoutItem[];
  customerInfo?: CustomerInfo;
  className?: string;
  children?: React.ReactNode;
  onCheckoutStart?: () => void;
  onCheckoutError?: (error: string) => void;
}

const ShopifyCheckoutButton: React.FC<ShopifyCheckoutButtonProps> = ({
  items,
  customerInfo = {},
  className = '',
  children,
  onCheckoutStart,
  onCheckoutError
}) => {
  const { createQuickCheckout, loading, error } = useCheckout();

  const handleCheckout = async () => {
    if (loading) return;
    
    onCheckoutStart?.();
    
    try {
      const result = await createQuickCheckout(items, customerInfo);
      
      if (!result.success) {
        onCheckoutError?.(result.error || 'Checkout failed');
      }
      // If successful, user will be redirected to Shopify
    } catch (err) {
      onCheckoutError?.(err instanceof Error ? err.message : 'Checkout failed');
    }
  };

  const defaultButtonClass = `
    bg-gradient-to-r from-blue-600 to-purple-600 
    hover:from-blue-700 hover:to-purple-700 
    text-white font-semibold py-3 px-6 rounded-lg 
    transition-all duration-200 transform hover:scale-105 
    disabled:opacity-50 disabled:cursor-not-allowed 
    disabled:transform-none
  `.trim();

  return (
    <button
      onClick={handleCheckout}
      disabled={loading || items.length === 0}
      className={className || defaultButtonClass}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Processing...</span>
        </div>
      ) : (
        children || '🛒 Checkout with Shopify'
      )}
    </button>
  );
};

export default ShopifyCheckoutButton; 