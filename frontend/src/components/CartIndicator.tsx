import React from 'react';
import Link from 'next/link';
import { useCart } from './CartContext';
import { getCartUrl } from '@/utils/domain-aware-links';

interface CartIndicatorProps {
  className?: string;
}

export default function CartIndicator({ className = "" }: CartIndicatorProps) {
  const { cart } = useCart();
  const itemCount = cart.length;

  return (
    <Link
      href={getCartUrl()}
      className={`text-white transition-all duration-200 transform hover:scale-110 p-2 relative ${className}`}
      aria-label="Shopping cart"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      
      {itemCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </div>
      )}
    </Link>
  );
} 