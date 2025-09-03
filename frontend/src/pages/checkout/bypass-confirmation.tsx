import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/Layout";
import { getSupabase } from "@/lib/supabase";
import { useMutation } from "@apollo/client";
import { CREATE_CUSTOMER_ORDER } from "@/lib/order-mutations";

export default function BypassConfirmationPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [bypassOrderData, setBypassOrderData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Only use Apollo Client on the client side
  const [createCustomerOrder] = useMutation(CREATE_CUSTOMER_ORDER, {
    skip: !isClient
  });

  // Get user context
  useEffect(() => {
    const getUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          setIsClient(true);
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    getUser();
  }, []);

  // Load bypass order data
  useEffect(() => {
    const storedData = sessionStorage.getItem('bypass_payment_order');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setBypassOrderData(data);
      } catch (error) {
        console.error('Error parsing bypass order data:', error);
        setError('Invalid order data');
      }
    } else {
      setError('No bypass order data found');
    }
  }, []);

  const handleCreateOrder = async () => {
    if (!bypassOrderData) {
      setError('No order data available');
      return;
    }

    if (!isClient) {
      setError('Please wait for page to load completely');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Calculate order totals
      const subtotal = bypassOrderData.cartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      const finalTotal = subtotal - (bypassOrderData.discountAmount || 0) - (bypassOrderData.creditsToApply || 0);

      // Create order with pending payment status
      const result = await createCustomerOrder({
        variables: {
          input: {
            userId: user?.id,
            guestEmail: !user ? bypassOrderData.customerInfo.email : undefined,
            orderStatus: 'pending_payment',
            fulfillmentStatus: 'pending',
            financialStatus: 'pending',
            subtotalPrice: subtotal,
            totalPrice: finalTotal,
            currency: 'USD',
            customerFirstName: bypassOrderData.customerInfo.firstName,
            customerLastName: bypassOrderData.customerInfo.lastName,
            customerEmail: bypassOrderData.customerInfo.email,
            customerPhone: bypassOrderData.customerInfo.phone,
            shippingAddress: bypassOrderData.shippingAddress,
            billingAddress: bypassOrderData.shippingAddress, // Use shipping as billing
            orderNote: bypassOrderData.orderNote,
            orderTags: ['bypass_payment', 'admin_shared_cart']
          }
        }
      });

      if (result.data?.createCustomerOrder) {
        const order = result.data.createCustomerOrder;
        setOrderNumber(order.orderNumber);
        
        // Clear the bypass order data
        sessionStorage.removeItem('bypass_payment_order');
        
        // Redirect to order confirmation after a delay
        setTimeout(() => {
          router.push(`/account/dashboard?orderCompleted=true&orderNumber=${order.orderNumber}`);
        }, 3000);
      } else {
        throw new Error('Failed to create order');
      }
    } catch (err) {
      console.error('Error creating bypass order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (userLoading) {
    return (
      <Layout title="Processing Order - Sticker Shuttle">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error && !bypassOrderData) {
    return (
      <Layout title="Error - Sticker Shuttle">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">❌ {error}</div>
            <button
              onClick={() => router.push('/cart')}
              className="px-6 py-3 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Return to Cart
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (orderNumber) {
    return (
      <Layout title="Order Created - Sticker Shuttle">
        <div className="flex items-center justify-center min-h-screen">
          <div 
            className="max-w-md w-full rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-white mb-4">Order Created Successfully!</h1>
            <p className="text-gray-300 mb-6">
              Your order <strong className="text-white">{orderNumber}</strong> has been created with pending payment status.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-yellow-300 text-sm">
                💰 <strong>Payment Bypassed:</strong> Please settle the balance of <strong>${bypassOrderData?.totalPrice?.toFixed(2)}</strong> with Sticker Shuttle within 7 days.
              </p>
            </div>
            <p className="text-gray-400 text-sm">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Confirm Bypass Payment - Sticker Shuttle">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="max-w-lg w-full rounded-2xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">💰</div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Bypass Confirmation</h1>
            <p className="text-gray-300">Create order without immediate payment</p>
          </div>

          {bypassOrderData && (
            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Items:</span>
                    <span className="text-white">{bypassOrderData.cartItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white">${bypassOrderData.cartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0).toFixed(2)}</span>
                  </div>
                  {bypassOrderData.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount:</span>
                      <span>-${bypassOrderData.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {bypassOrderData.creditsToApply > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>Credits Applied:</span>
                      <span>-${bypassOrderData.creditsToApply.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="border-white/10" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Total:</span>
                    <span className="text-white">${(bypassOrderData.cartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) - (bypassOrderData.discountAmount || 0) - (bypassOrderData.creditsToApply || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="text-yellow-300 font-semibold mb-2">⚠️ Important Notice</h4>
                <p className="text-yellow-200 text-sm">
                  By proceeding, you agree to settle the balance of <strong>${(bypassOrderData.cartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) - (bypassOrderData.discountAmount || 0) - (bypassOrderData.creditsToApply || 0)).toFixed(2)}</strong> with Sticker Shuttle within 7 days.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">❌ {error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/cart')}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                color: '#ffffff'
              }}
            >
              {isProcessing ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
