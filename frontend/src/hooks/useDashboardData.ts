import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { getSupabase } from '../lib/supabase';
import { GET_USER_ORDERS, CLAIM_GUEST_ORDERS } from '../lib/order-mutations';

export const useDashboardData = () => {
  // Dashboard hook loaded
  
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // GraphQL query for user orders (conditional)
  const {
    data: ordersData,
    loading: queryLoading,
    error: queryError,
    refetch: refetchOrders,
    networkStatus
  } = useQuery(GET_USER_ORDERS, {
    variables: { userId: user?.id || '' },
    skip: !user?.id, // Skip query if no user ID
    fetchPolicy: 'cache-and-network', // Check cache first, then network for fresh data
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true, // Track network status changes
    onError: (error) => {
      console.error('❌ GET_USER_ORDERS query error:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        stack: error.stack
      });
    }
  });

  // Mutation for claiming guest orders
  const [claimGuestOrders] = useMutation(CLAIM_GUEST_ORDERS);

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          const currentUser = session?.user || null;
          
          // console.log('🔍 User session check:', {
          //   hasSession: !!session,
          //   hasUser: !!currentUser,
          //   userId: currentUser?.id,
          //   userEmail: currentUser?.email
          // });
          
          setUser(currentUser);

          if (currentUser) {
            // Fetching real orders for user
            
            // Try to claim any guest orders made with this email
            try {
              // Attempting to claim guest orders
              const { data: claimData } = await claimGuestOrders({
                variables: {
                  userId: currentUser.id,
                  email: currentUser.email
                }
              });
              
              if (claimData?.claimGuestOrders?.claimedOrdersCount > 0) {
                // Claimed guest orders
              } else {
                console.log('ℹ️ No guest orders found to claim');
              }
            } catch (claimError) {
              console.error('❌ Could not claim guest orders:', claimError);
              console.error('❌ GraphQL errors:', claimError.graphQLErrors);
              console.error('❌ Network error:', claimError.networkError);
            }

            // All orders come from Stripe webhooks
            console.log('✅ Using Stripe order data - no sync needed');
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setOrdersError('Failed to load user data');
      } finally {
        setUserLoading(false);
      }
    };

    checkUser();
  }, [claimGuestOrders]);

  // Update orders when GraphQL data changes
  useEffect(() => {
    setOrdersLoading(queryLoading);
    
    if (queryError) {
      console.error('❌ GraphQL orders error:', queryError);
      console.error('❌ GraphQL errors:', queryError.graphQLErrors);
      console.error('❌ Network error:', queryError.networkError);
      console.error('❌ Error details:', JSON.stringify(queryError, null, 2));
      setOrdersError('Failed to load order data');
    } else {
      setOrdersError(null);
    }

    if (ordersData?.getUserOrders) {
      console.log('📊 Phase 2: Real orders loaded:', ordersData.getUserOrders.length);
      
      // Debug: Log the actual data structure received
      if (ordersData.getUserOrders.length > 0) {
        console.log('🔍 First order data structure:', JSON.stringify(ordersData.getUserOrders[0], null, 2));
        
        // Debug: Check specific price fields
        const firstOrder = ordersData.getUserOrders[0];
        console.log('💰 Order price fields:', {
          totalPrice: firstOrder.totalPrice,
          total_price: firstOrder.total_price,
          actualValue: firstOrder.totalPrice || firstOrder.total_price,
          type: typeof (firstOrder.totalPrice || firstOrder.total_price)
        });
        
        if (firstOrder.items && firstOrder.items.length > 0) {
          const firstItem = firstOrder.items[0];
          console.log('💰 Item price fields:', {
            unitPrice: firstItem.unitPrice,
            unit_price: firstItem.unit_price,
            totalPrice: firstItem.totalPrice,
            total_price: firstItem.total_price,
            actualUnitPrice: firstItem.unitPrice || firstItem.unit_price,
            actualTotalPrice: firstItem.totalPrice || firstItem.total_price
          });
        }
      }
      
      // Transform GraphQL data to match dashboard format
      // Keep full order data for invoice while providing simplified view for dashboard
      const transformedOrders = ordersData.getUserOrders
        .filter(order => order != null) // Filter out null orders
        .map(order => {
          console.log('🔍 RAW ORDER DATA:', JSON.stringify(order, null, 2));
          
          // Calculate order total - try different field names and calculate from items if needed
          let orderTotal = order.totalPrice || order.total_price || 0;
          
          // If orderTotal is still 0, calculate from items
          if (!orderTotal || orderTotal === 0) {
            if (order.items && order.items.length > 0) {
              orderTotal = order.items.reduce((sum, item) => {
                const itemTotal = item.totalPrice || item.total_price || ((item.unitPrice || item.unit_price || 0) * (item.quantity || 1));
                return sum + itemTotal;
              }, 0);
              console.log(`🔍 Order ${order.id} calculated total from items: ${orderTotal}`);
            }
          }
          
          console.log(`🔍 Order ${order.id} final total:`, {
            orderId: order.id,
            totalPrice: order.totalPrice,
            total_price: order.total_price,
            calculatedTotal: orderTotal,
            type: typeof orderTotal
          });
          
          // Create mission number using order ID
          const getMissionNumber = (order) => {
            // Use the order's internal ID as the mission number
            console.log(`🎯 DEBUG: Mission number for order ${order.id}:`, {
              orderId: order.id,
              orderNumber: order.orderNumber
            });
            
            // Use the order number if available, otherwise use the internal ID
            if (order.orderNumber) {
              console.log(`✅ Using order number: ${order.orderNumber}`);
              return order.orderNumber;
            }
            
            // Fallback to our internal order ID
            console.log(`🔄 Using internal order ID: ${order.id}`);
            return order.id;
          };

          const missionId = getMissionNumber(order);
          console.log(`🎯 FINAL MISSION ID: ${missionId} for order ${order.id}`);
          
          // Handle proofs data
          console.log(`🔍 PROOF DEBUG for order ${order.id}:`, {
            proofs: order.proofs,
            proofsLength: order.proofs?.length || 0,
            proof_status: order.proof_status,
            proof_sent_at: order.proof_sent_at
          });
          
          // 🚚 TRACKING DEBUG - Let's see what tracking data we have
          console.log(`🚚 TRACKING DEBUG for order ${order.id}:`, {
            trackingNumber: order.trackingNumber,
            trackingCompany: order.trackingCompany,
            trackingUrl: order.trackingUrl,
            orderStatus: order.orderStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            rawOrderData: {
              tracking_number: order.tracking_number,
              tracking_company: order.tracking_company,
              tracking_url: order.tracking_url
            }
          });
          
          const hasProofs = order.proofs && order.proofs.length > 0;
          const firstProofUrl = hasProofs ? order.proofs[0].proofUrl : null;
          
          // Determine proof status for dashboard
          let proofStatus = 'Building Proof'; // Default status
          if (order.order_status === 'Printing' || order.orderStatus === 'Printing') {
            proofStatus = 'Printing';
          } else if (order.proof_status === 'awaiting_approval') {
            proofStatus = 'Proof Review Needed';
          } else if (order.proof_status === 'approved') {
            proofStatus = 'Printing';
          } else if (order.proof_status === 'label_printed') {
            proofStatus = 'Shipped';
          } else if (order.proof_status === 'shipped') {
            proofStatus = 'Shipped';
          } else if (order.proof_status === 'delivered') {
            proofStatus = 'Delivered';
          } else if (hasProofs && order.proof_sent_at) {
            proofStatus = 'Proof Review Needed';
          } else if (hasProofs) {
            proofStatus = 'Proof Ready';
          }

          const transformedOrder = {
            id: order.id, // Keep original order ID
            orderNumber: order.orderNumber, // Preserve order number (SS-00001 format)
            order_number: order.order_number || order.orderNumber, // Support both formats
            stripePaymentIntentId: order.stripePaymentIntentId, // Preserve Stripe payment intent
            date: order.orderCreatedAt || order.createdAt || new Date().toISOString(),
            status: hasProofs && order.proof_status ? proofStatus : mapOrderStatus(order.orderStatus, order.fulfillmentStatus),
            total: orderTotal, // Use the calculated total
            trackingNumber: order.trackingNumber || null,
            proofUrl: firstProofUrl, // Use first proof URL if available
            
            // Add proof-related fields for dashboard
            proofs: order.proofs || [],
            proof_status: order.proof_status,
            proof_sent_at: order.proof_sent_at,
            
            // Keep full order data for invoice
            _fullOrderData: order,
            
            items: (order.items || [])
              .filter(item => item != null) // Filter out null items
              .map(item => {
                // Calculate item price - try total first, then calculate from unit price * quantity
                const itemTotalPrice = item.totalPrice || item.total_price || 0;
                const itemUnitPrice = item.unitPrice || item.unit_price || 0;
                const itemQuantity = item.quantity || 1;
                
                // Use total price if available, otherwise calculate from unit price * quantity
                const finalItemPrice = itemTotalPrice > 0 ? itemTotalPrice : (itemUnitPrice * itemQuantity);
                
                console.log(`🔍 Item ${item.id} price calculation:`, {
                  totalPrice: item.totalPrice,
                  total_price: item.total_price,
                  unitPrice: item.unitPrice,
                  unit_price: item.unit_price,
                  quantity: itemQuantity,
                  finalPrice: finalItemPrice
                });
                
                return {
                  id: item.id || 'unknown',
                  name: item.productName || item.product_name || 'Custom Product',
                  quantity: itemQuantity,
                  size: extractSize(item.calculatorSelections || item.calculator_selections),
                  material: extractMaterial(item.calculatorSelections || item.calculator_selections),
                  design: item.productName || item.product_name || 'Custom Design',
                  price: finalItemPrice, // Use the calculated total price for this item
                  image: extractFirstCustomFile(item.customFiles || item.custom_files) || '/api/placeholder/64/64',
                  
                  // Keep full item data for invoice
                  _fullItemData: item
                };
              })
          };
          
          console.log(`🎯 TRANSFORMED ORDER:`, {
            id: transformedOrder.id,
            orderNumber: transformedOrder.orderNumber,
            stripePaymentIntentId: transformedOrder.stripePaymentIntentId,
            originalOrderNumber: order.orderNumber,
            originalStripePaymentIntentId: order.stripePaymentIntentId,
            originalOrderId: order.id
          });
          
          return transformedOrder;
        });
      
      console.log('📊 Transformed orders:', transformedOrders.map(o => ({ 
        id: o.id, 
        total: o.total, 
        itemCount: o.items.length,
        firstItemPrice: o.items[0]?.price 
      })));
      
      setOrders(transformedOrders);
    } else if (user && !queryLoading) {
      // User is logged in but no orders found
      setOrders([]);
    }
  }, [ordersData, queryError, queryLoading, user]);

  // Add network status debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
      console.log('🔍 Dashboard Query Network Status:', {
        networkStatus,
        loading: queryLoading,
        hasData: !!ordersData,
        hasError: !!queryError,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [networkStatus, queryLoading, ordersData, queryError, user?.id]);

  // Helper functions to transform data
  const mapOrderStatus = (orderStatus, fulfillmentStatus) => {
    if (fulfillmentStatus === 'fulfilled') return 'Delivered';
    if (fulfillmentStatus === 'partial') return 'Shipped';
    if (orderStatus === 'paid') return 'In Production';
    if (orderStatus === 'pending') return 'Processing';
    return orderStatus || 'Processing';
  };

  const extractSize = (selections) => {
    if (!selections) return '';
    if (typeof selections === 'string') {
      try {
        selections = JSON.parse(selections);
      } catch {
        return '';
      }
    }
    // Check for size in calculator selections
    if (selections.size && selections.size.displayValue) {
      return selections.size.displayValue;
    }
    return selections.size || selections.dimensions || '';
  };

  const extractMaterial = (selections) => {
    if (!selections) return 'Premium Vinyl';
    if (typeof selections === 'string') {
      try {
        selections = JSON.parse(selections);
      } catch {
        return 'Premium Vinyl';
      }
    }
    // Check for material in calculator selections
    if (selections.material && selections.material.displayValue) {
      return selections.material.displayValue;
    }
    return selections.material || selections.finish || 'Premium Vinyl';
  };

  const extractImage = (selections) => {
    if (!selections) return null;
    if (typeof selections === 'string') {
      try {
        selections = JSON.parse(selections);
      } catch {
        return null;
      }
    }
    return selections.designImage || selections.uploadedImage || null;
  };

  const extractFirstCustomFile = (customFiles) => {
    if (!customFiles) return null;
    if (Array.isArray(customFiles) && customFiles.length > 0) {
      return customFiles[0];
    }
    return null;
  };

  // Refresh data function
  const refreshOrders = async () => {
    if (!user) return;
    
    console.log('🔄 Phase 2: Refreshing real order data (forcing network fetch)...');
    try {
      // Force a network-only refetch to bypass cache
      await refetchOrders({
        fetchPolicy: 'network-only'
      });
      console.log('✅ Phase 2: Real order data refreshed from network');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      setOrdersError('Failed to refresh orders');
    }
  };

  return {
    user,
    userLoading,
    orders,
    ordersLoading: userLoading || ordersLoading,
    ordersError,
    refreshOrders,
    hasOrders: orders.length > 0,
    isLoggedIn: !!user
  };
}; 