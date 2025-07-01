import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OrderDetailsRedirect() {
  const router = useRouter();
  const { orderNumber } = router.query;

  useEffect(() => {
    if (orderNumber) {
      // Redirect to dashboard with order-details view
      // The dashboard will need to handle loading the specific order
      router.replace({
        pathname: '/account/dashboard',
        query: {
          view: 'order-details',
          orderNumber: orderNumber
        }
      });
    }
  }, [orderNumber, router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Redirecting to order details...</div>
    </div>
  );
} 