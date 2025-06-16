import { useState, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { getSupabase } from '../lib/supabase';
import { GET_USER_ORDERS, CLAIM_GUEST_ORDERS, SYNC_SHOPIFY_ORDERS } from '../lib/shopify-mutations';

export const useDashboardData = () => {
  console.log('🚀 DASHBOARD HOOK LOADED - VERSION 2.0'); // Debug to ensure hook is reloaded
  
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
    refetch: refetchOrders
  } = useQuery(GET_USER_ORDERS, {
    variables: { userId: user?.id || '' },
    skip: !user?.id, // Skip query if no user ID
    fetchPolicy: 'cache-and-network', // Check cache first, then network for fresh data
    errorPolicy: 'all'
  });

  // Mutation for claiming guest orders
  const [claimGuestOrders] = useMutation(CLAIM_GUEST_ORDERS);

  // Lazy query for syncing Shopify orders
  const [syncShopifyOrders, { loading: syncLoading }] = useLazyQuery(SYNC_SHOPIFY_ORDERS, {
    onCompleted: (data) => {
      if (data?.syncShopifyOrders?.success) {
        console.log(`✅ Synced ${data.syncShopifyOrders.synced} Shopify orders`);
        // Refetch orders after sync
        refetchOrders();
      }
    },
    onError: (error) => {
      console.error('❌ Error syncing Shopify orders:', error);
    }
  });

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          const currentUser = session?.user || null;
          
          console.log('🔍 User session check:', {
            hasSession: !!session,
            hasUser: !!currentUser,
            userId: currentUser?.id,
            userEmail: currentUser?.email
          });
          
          setUser(currentUser);

          if (currentUser) {
            console.log('🔍 Phase 2: Fetching real orders for user:', currentUser.email);
            
            // Try to claim any guest orders made with this email
            try {
              console.log('🔄 Attempting to claim guest orders for:', currentUser.email);
              const { data: claimData } = await claimGuestOrders({
                variables: {
                  userId: currentUser.id,
                  email: currentUser.email
                }
              });
              
              if (claimData?.claimGuestOrders?.claimedOrdersCount > 0) {
                console.log(`✅ Claimed ${claimData.claimGuestOrders.claimedOrdersCount} guest orders`);
              } else {
                console.log('ℹ️ No guest orders found to claim');
              }
            } catch (claimError) {
              console.error('❌ Could not claim guest orders:', claimError);
              console.error('❌ GraphQL errors:', claimError.graphQLErrors);
              console.error('❌ Network error:', claimError.networkError);
            }

            // Temporarily disabled automatic sync to prevent duplicates
            // TODO: Re-enable once sync logic is fixed to update instead of create
            console.log('ℹ️ Automatic Shopify sync disabled to prevent duplicates');
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
          
          // Create mission number using exact Shopify order number
          const getMissionNumber = (order) => {
            // Check both camelCase and snake_case field names
            const shopifyOrderNumber = order.shopifyOrderNumber || order.shopify_order_number;
            const shopifyOrderId = order.shopifyOrderId || order.shopify_order_id;
            
            console.log(`🎯 DEBUG: Mission number for order ${order.id}:`, {
              shopifyOrderNumber: shopifyOrderNumber,
              shopifyOrderId: shopifyOrderId,
              orderId: order.id
            });
            
            // Use the exact Shopify order number if available
            if (shopifyOrderNumber) {
              // Remove any # prefix and return the exact number
              const cleanNumber = shopifyOrderNumber.replace(/^#/, '');
              console.log(`✅ Using exact Shopify order number: ${cleanNumber}`);
              return cleanNumber;
            }
            
            // If no Shopify order number, use the Shopify order ID
            if (shopifyOrderId) {
              console.log(`⚠️ Using Shopify order ID: ${shopifyOrderId}`);
              return shopifyOrderId.toString();
            }
            
            // Fallback to our internal order ID
            console.log(`🔄 Using internal order ID: ${order.id}`);
            return order.id;
          };

                      const missionId = getMissionNumber(order);
            console.log(`🎯 FINAL MISSION ID: ${missionId} for order ${order.id}`);
            
            const transformedOrder = {
            id: order.id, // Keep original order ID
            shopifyOrderNumber: order.shopifyOrderNumber || order.shopify_order_number, // Preserve Shopify order number
            shopifyOrderId: order.shopifyOrderId || order.shopify_order_id, // Preserve Shopify order ID
            date: order.orderCreatedAt || order.createdAt || new Date().toISOString(),
            status: mapOrderStatus(order.orderStatus, order.fulfillmentStatus),
            total: orderTotal, // Use the calculated total
            trackingNumber: order.trackingNumber || null,
            proofUrl: null, // TODO: Add proof URL logic
            
            // Keep full order data for invoice (including original IDs)
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
            shopifyOrderNumber: transformedOrder.shopifyOrderNumber,
            shopifyOrderId: transformedOrder.shopifyOrderId,
            originalShopifyOrderNumber: order.shopifyOrderNumber,
            originalShopify_order_number: order.shopify_order_number,
            originalShopifyOrderId: order.shopifyOrderId,
            originalShopify_order_id: order.shopify_order_id
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
    
    console.log('🔄 Phase 2: Refreshing real order data...');
    try {
      await refetchOrders();
      console.log('✅ Phase 2: Real order data refreshed');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      setOrdersError('Failed to refresh orders');
    }
  };

  return {
    user,
    userLoading,
    orders,
    ordersLoading: userLoading || ordersLoading || syncLoading,
    ordersError,
    refreshOrders,
    hasOrders: orders.length > 0,
    isLoggedIn: !!user,
    syncShopifyOrders: () => {
      if (user) {
        syncShopifyOrders({
          variables: {
            userId: user.id,
            email: user.email
          }
        });
      }
    }
  };
}; 