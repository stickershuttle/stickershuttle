import { useState, useCallback, useRef } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_USER_ORDERS } from '../lib/order-mutations';
import { getSupabase } from '../lib/supabase';
import { trackOrderCompleted, trackCustomerValue, trackCustomerPurchasePattern } from '../lib/business-analytics';

export const useOrderCompletion = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const monitoringInterval = useRef(null);
  const currentUser = useRef(null);

  // Get user orders query with network-only fetch policy for fresh data
  const { data, refetch } = useQuery(GET_USER_ORDERS, {
    fetchPolicy: 'network-only',
    skip: true // We'll trigger this manually
  });

  // Initialize user context
  const initializeUser = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        currentUser.current = session?.user || null;
        
        if (currentUser.current) {
          console.log('🔍 Order monitoring initialized for user:', currentUser.current.email);
          
          // Get initial order count
          const { data: initialData } = await refetch({
            userId: currentUser.current.id
          });
          
          if (initialData?.getUserOrders) {
            setLastOrderCount(initialData.getUserOrders.length);
            console.log('📊 Initial order count:', initialData.getUserOrders.length);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing user for order monitoring:', error);
    }
  }, [refetch]);

  // Start monitoring for new orders
  const startMonitoring = useCallback(async () => {
    if (isMonitoring) {
      console.log('⚠️ Order monitoring already active');
      return;
    }

    await initializeUser();
    
    if (!currentUser.current) {
      console.log('⚠️ No user context - skipping order monitoring');
      return;
    }

    console.log('🚀 Starting order completion monitoring for user:', currentUser.current.email);
    setIsMonitoring(true);

    // Poll every 3 seconds for new orders
    monitoringInterval.current = setInterval(async () => {
      try {
        console.log('🔍 Checking for new orders...');
        
        const { data: currentData } = await refetch({
          userId: currentUser.current.id
        });

        if (currentData?.getUserOrders) {
          const currentOrderCount = currentData.getUserOrders.length;
          console.log(`📊 Order count check: ${lastOrderCount} → ${currentOrderCount}`);

          // Check if we have new orders
          if (currentOrderCount > lastOrderCount) {
            const newOrdersCount = currentOrderCount - lastOrderCount;
            console.log(`🎉 Detected ${newOrdersCount} new order(s)!`);
            
            // Get the newest orders (they should be at the beginning due to date sorting)
            const newOrders = currentData.getUserOrders.slice(0, newOrdersCount);
            
            // Find the newest paid order with "Creating Proofs" status
            const newPaidOrder = newOrders.find(order => 
              order.financialStatus === 'paid' && 
              order.orderStatus === 'Creating Proofs'
            );

            if (newPaidOrder) {
              console.log('✅ New paid order detected:', {
                id: newPaidOrder.id,
                orderNumber: newPaidOrder.orderNumber,
                orderStatus: newPaidOrder.orderStatus,
                financialStatus: newPaidOrder.financialStatus,
                totalPrice: newPaidOrder.totalPrice
              });

              // Track analytics for order completion
              try {
                // Track order completion
                trackOrderCompleted(newPaidOrder, currentUser.current);

                // Calculate customer metrics for LTV and repeat purchase tracking
                const customerEmail = newPaidOrder.customerEmail || currentUser.current?.email;
                if (customerEmail) {
                  // Get customer order history to determine if this is a repeat customer
                  const customerOrders = currentData.getUserOrders.filter(order => 
                    (order.customerEmail || order.customer_email) === customerEmail ||
                    (currentUser.current && order.userId === currentUser.current.id)
                  );
                  
                  const totalOrders = customerOrders.length;
                  const isRepeatCustomer = totalOrders > 1;
                  const totalSpent = customerOrders.reduce((sum, order) => 
                    sum + parseFloat(order.totalPrice || order.total_price || 0), 0
                  );
                  
                  // Track customer value metrics
                  trackCustomerValue(customerEmail, newPaidOrder.totalPrice, isRepeatCustomer, totalOrders);
                  
                  // Track customer purchase pattern
                  const firstOrder = customerOrders.sort((a, b) => 
                    new Date(a.orderCreatedAt || a.created_at) - new Date(b.orderCreatedAt || b.created_at)
                  )[0];
                  
                  const customerData = {
                    totalOrders,
                    totalSpent,
                    firstOrderDate: firstOrder?.orderCreatedAt || firstOrder?.created_at,
                    lastOrderDate: newPaidOrder.orderCreatedAt || newPaidOrder.created_at,
                    averageOrderValue: totalSpent / totalOrders,
                    daysSinceFirstOrder: firstOrder ? 
                      Math.floor((new Date() - new Date(firstOrder.orderCreatedAt || firstOrder.created_at)) / (1000 * 60 * 60 * 24)) : 0
                  };
                  
                  trackCustomerPurchasePattern(customerEmail, customerData);
                }
                
                console.log('📊 Analytics tracked for order completion');
              } catch (analyticsError) {
                console.error('📊 Error tracking analytics:', analyticsError);
              }

              // Stop monitoring
              stopMonitoring();

              // Dispatch custom event for cart clearing and redirect
              const event = new CustomEvent('newOrderCompleted', {
                detail: {
                  order: newPaidOrder,
                  orderCount: currentOrderCount,
                  message: `Order ${newPaidOrder.orderNumber} completed successfully!`
                }
              });
              
              window.dispatchEvent(event);
              return; // Exit the polling loop
            } else {
              console.log('⏳ New orders detected but none are paid yet, continuing to monitor...');
            }

            setLastOrderCount(currentOrderCount);
          }
        }
      } catch (error) {
        console.error('❌ Error during order monitoring:', error);
      }
    }, 3000); // Check every 3 seconds

    // Auto-stop monitoring after 10 minutes (safety measure)
    setTimeout(() => {
      if (isMonitoring) {
        console.log('⏰ Order monitoring auto-stopped after 10 minutes');
        stopMonitoring();
      }
    }, 10 * 60 * 1000);

  }, [isMonitoring, lastOrderCount, refetch, initializeUser]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    setIsMonitoring(false);
    console.log('🛑 Order completion monitoring stopped');
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    isMonitoring
  };
}; 