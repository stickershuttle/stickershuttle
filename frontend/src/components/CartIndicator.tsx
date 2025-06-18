import React from 'react';
import Link from 'next/link';
import { useCart } from './CartContext';

interface CartIndicatorProps {
  className?: string;
}

export default function CartIndicator({ className = "" }: CartIndicatorProps) {
  const { cart } = useCart();
  const itemCount = cart.length;

  return (
    <Link
      href="/cart"
      className={`text-white transition-all duration-200 transform hover:scale-110 p-2 relative ${className}`}
      aria-label="Shopping cart"
    >
      <span className="text-2xl">💳</span>
      
      {itemCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </div>
      )}
    </Link>
  );
} 