// Credit handlers will receive the supabase client from the API
let supabase;

// Initialize with the supabase client from the main API
const initializeWithSupabase = (supabaseClient) => {
  supabase = supabaseClient;
};

// Get user's current credit balance
const getUserCreditBalance = async (userId) => {
  try {
    const client = supabase.getServiceClient();
    const { data, error } = await client
      .rpc('get_user_credit_balance', { p_user_id: userId });
    
    if (error) throw error;
    
    // Ensure balance is always a valid number
    let balance = 0;
    if (data !== null && data !== undefined && !isNaN(parseFloat(data))) {
      balance = parseFloat(data);
    }
    
    // Also get transaction count and last transaction date
    const { data: stats, error: statsError } = await client
      .from('user_credit_balance')
      .select('total_credits, transaction_count, last_transaction_date')
      .eq('user_id', userId)
      .single();
    
    // If the RPC call fails, try to get balance from the view table
    if (balance === 0 && stats?.total_credits) {
      const totalCredits = parseFloat(stats.total_credits);
      if (!isNaN(totalCredits)) {
        balance = totalCredits;
      }
    }
    
    return {
      balance: balance,
      transactionCount: stats?.transaction_count || 0,
      lastTransactionDate: stats?.last_transaction_date || null
    };
  } catch (error) {
    console.error('Error getting user credit balance:', error);
    // Return safe defaults instead of throwing
    return {
      balance: 0,
      transactionCount: 0,
      lastTransactionDate: null
    };
  }
};

// Get unread credit notifications
const getUnreadCreditNotifications = async (userId) => {
  try {
    const client = supabase.getServiceClient();
    const { data, error } = await client
      .rpc('get_unread_credit_notifications', { p_user_id: userId });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting unread credit notifications:', error);
    throw error;
  }
};

// Mark credit notifications as read
const markCreditNotificationsRead = async (userId) => {
  try {
    const client = supabase.getServiceClient();
    const { error } = await client
      .rpc('mark_credit_notifications_read', { p_user_id: userId });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error marking credit notifications as read:', error);
    throw error;
  }
};

// Add credits to a user (admin only)
const addUserCredits = async (input, adminUserId) => {
  try {
    const { userId, amount, reason, expiresAt } = input;
    const client = supabase.getServiceClient();
    
    const { data, error } = await client
      .rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason || 'Store credit added by admin',
        p_created_by: adminUserId,
        p_expires_at: expiresAt || null
      });
    
    if (error) throw error;
    
    // Format the credit data to match GraphQL schema
    const formattedCredit = {
      id: data?.id || new Date().getTime().toString(),
      userId: userId,
      amount: amount,
      reason: reason || 'Store credit added by admin',
      createdAt: new Date().toISOString()
    };
    
    return {
      success: true,
      credit: formattedCredit
    };
  } catch (error) {
    console.error('Error adding user credits:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add credits to all users (admin only)
const addCreditsToAllUsers = async (amount, reason, adminUserId) => {
  try {
    const client = supabase.getServiceClient();
    const { data, error } = await client
      .rpc('add_credits_to_all_users', {
        p_amount: amount,
        p_reason: reason || 'Promotional credit',
        p_created_by: adminUserId
      });
    
    if (error) throw error;
    
    return {
      success: true,
      usersUpdated: data
    };
  } catch (error) {
    console.error('Error adding credits to all users:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all credit transactions (admin only)
const getAllCreditTransactions = async (limit = 50, offset = 0) => {
  try {
    const client = supabase.getServiceClient();
    
    // First get the transactions
    const { data: transactions, error, count } = await client
      .from('credits')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    // Then get user info from user_profiles table
    const userIds = [...new Set(transactions.map(t => t.user_id))];
    const { data: users, error: userError } = await client
      .from('user_profiles')
      .select('user_id, first_name, last_name, company_name')
      .in('user_id', userIds);
    
    if (userError) {
      console.warn('Could not fetch user details:', userError);
    }
    
    // Also get email addresses from auth users via admin function or API
    let authUsers = [];
    try {
      // First try using the RPC function
      const { data: authData, error: authError } = await client
        .rpc('get_user_emails_for_admin', { user_ids: userIds });
      
      if (!authError && authData) {
        authUsers = authData;
      } else {
        console.warn('RPC function failed, trying admin API:', authError);
      }
    } catch (error) {
      console.warn('RPC function not available, trying admin API:', error);
    }
    
    // Fallback: try using admin API directly
    if (authUsers.length === 0) {
      try {
        const { data: adminData, error: adminError } = await client.auth.admin.listUsers();
        if (!adminError && adminData?.users) {
          authUsers = adminData.users
            .filter(user => userIds.includes(user.id))
            .map(user => ({ id: user.id, email: user.email }));
        }
      } catch (error) {
        console.warn('Admin API also failed:', error);
      }
    }
    
    // Create user lookup maps
    const userMap = {};
    const emailMap = {};
    
    if (users) {
      users.forEach(user => {
        userMap[user.user_id] = user;
      });
    }
    
    if (authUsers) {
      authUsers.forEach(user => {
        emailMap[user.id] = user.email;
      });
    }
    
    // Get order info if needed
    const orderIds = transactions.filter(t => t.order_id).map(t => t.order_id);
    let orderMap = {};
    if (orderIds.length > 0) {
      const { data: orders } = await client
        .from('orders_main')
        .select('id, order_number')
        .in('id', orderIds);
      
      if (orders) {
        orders.forEach(order => {
          orderMap[order.id] = order;
        });
      }
    }
    
    // Format transactions
    const formattedTransactions = transactions.map(t => {
      const user = userMap[t.user_id];
      const email = emailMap[t.user_id];
      const order = orderMap[t.order_id];
      
      // Build user display name
      let userName = 'Unknown';
      if (user?.first_name || user?.last_name) {
        userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      } else if (email) {
        userName = email.split('@')[0];
      }
      
      return {
        id: t.id,
        userId: t.user_id,
        userEmail: email || 'Unknown',
        userName: userName,
        amount: t.amount,
        balance: t.balance,
        reason: t.reason,
        transactionType: t.transaction_type,
        orderId: t.order_id,
        orderNumber: order?.order_number,
        createdAt: t.created_at,
        createdBy: t.created_by,
        expiresAt: t.expires_at
      };
    });
    
    return {
      transactions: formattedTransactions,
      totalCount: count
    };
  } catch (error) {
    console.error('Error getting all credit transactions:', error);
    throw error;
  }
};

// Get user credit history
const getUserCreditHistory = async (userId) => {
  try {
    const client = supabase.getServiceClient();
    const { data: transactions, error } = await client
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get order info if needed
    const orderIds = transactions?.filter(t => t.order_id).map(t => t.order_id) || [];
    let orderMap = {};
    if (orderIds.length > 0) {
      const { data: orders } = await client
        .from('orders_main')
        .select('id, order_number')
        .in('id', orderIds);
      
      if (orders) {
        orders.forEach(order => {
          orderMap[order.id] = order;
        });
      }
    }
    
    // Format transactions
    const formattedTransactions = (transactions || []).map(t => ({
      id: t.id,
      amount: t.amount,
      balance: t.balance,
      reason: t.reason,
      transactionType: t.transaction_type,
      orderId: t.order_id,
      orderNumber: orderMap[t.order_id]?.order_number,
      createdAt: t.created_at,
      expiresAt: t.expires_at
    }));
    
    // Get current balance
    const balance = await getUserCreditBalance(userId);
    
    return {
      transactions: formattedTransactions,
      currentBalance: balance.balance
    };
  } catch (error) {
    console.error('Error getting user credit history:', error);
    throw error;
  }
};

// Apply credits to order
const applyCreditsToOrder = async (orderId, amount, userId) => {
  try {
    const client = supabase.getServiceClient();
    const safeAmount = parseFloat(amount) || 0;
    
    const { data, error } = await client
      .rpc('use_credits_for_order', {
        p_user_id: userId,
        p_order_id: orderId,
        p_amount: safeAmount
      });
    
    if (error) throw error;
    
    // Get remaining balance
    const balance = await getUserCreditBalance(userId);
    const safeBalance = parseFloat(balance.balance) || 0;
    
    return {
      success: true,
      remainingBalance: safeBalance
    };
  } catch (error) {
    console.error('Error applying credits to order:', error);
    // Try to get current balance for fallback
    try {
      const fallbackBalance = await getUserCreditBalance(userId);
      return {
        success: false,
        error: error.message,
        remainingBalance: parseFloat(fallbackBalance.balance) || 0
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        remainingBalance: 0
      };
    }
  }
};

// Deduct credits from user (for order processing)
const deductUserCredits = async ({ userId, amount, reason, orderId, transactionType }) => {
  try {
    const client = supabase.getServiceClient();
    
    // Get current balance first
    const currentBalance = await getUserCreditBalance(userId);
    const safeCurrentBalance = parseFloat(currentBalance.balance) || 0;
    const safeAmount = parseFloat(amount) || 0;
    
    if (safeCurrentBalance < safeAmount) {
      return {
        success: false,
        error: 'Insufficient credit balance',
        remainingBalance: safeCurrentBalance
      };
    }
    
    const { data, error } = await client
      .rpc('use_credits_for_order', {
        p_user_id: userId,
        p_order_id: orderId,
        p_amount: safeAmount
      });
    
    if (error) throw error;
    
    // Get updated balance
    const updatedBalance = await getUserCreditBalance(userId);
    const safeUpdatedBalance = parseFloat(updatedBalance.balance) || 0;
    
    return {
      success: true,
      transactionId: data?.id || null,
      remainingBalance: safeUpdatedBalance,
      deductedAmount: safeAmount
    };
  } catch (error) {
    console.error('Error deducting user credits:', error);
    // Get current balance for fallback
    try {
      const fallbackBalance = await getUserCreditBalance(userId);
      return {
        success: false,
        error: error.message,
        remainingBalance: parseFloat(fallbackBalance.balance) || 0
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        remainingBalance: 0
      };
    }
  }
};

// Reverse a credit transaction (for failed orders)
const reverseTransaction = async (transactionId, reason) => {
  try {
    const client = supabase.getServiceClient();
    
    const { data, error } = await client
      .rpc('reverse_credit_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason || 'Transaction reversed'
      });
    
    if (error) throw error;
    
    return {
      success: true,
      reversedAmount: data?.amount || 0
    };
  } catch (error) {
    console.error('Error reversing credit transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Confirm a credit transaction (for successful payments)
const confirmTransaction = async (transactionId, orderId, reason) => {
  try {
    const client = supabase.getServiceClient();
    
    const { data, error } = await client
      .rpc('confirm_credit_transaction', {
        p_transaction_id: transactionId,
        p_order_id: orderId,
        p_reason: reason || 'Payment confirmed'
      });
    
    if (error) throw error;
    
    return {
      success: true,
      confirmedAmount: data?.amount || 0
    };
  } catch (error) {
    console.error('Error confirming credit transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update transaction with order ID
const updateTransactionOrderId = async (transactionId, orderId) => {
  try {
    const client = supabase.getServiceClient();
    
    const { error } = await client
      .from('credits')
      .update({ order_id: orderId })
      .eq('id', transactionId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction order ID:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Earn points/credits from purchase with dynamic rates (5% standard, 10% wholesale) and $100 limit
const earnPointsFromPurchase = async (userId, orderTotal, orderId) => {
  try {
    if (!userId || userId === 'guest') {
      console.log('💰 Skipping points earning for guest user');
      return { success: false, message: 'Guest user - no points earned' };
    }

    if (orderTotal <= 0) {
      console.log('💰 No points to earn from $0 order');
      return { success: false, message: 'No points to earn' };
    }

    console.log(`💰 Attempting to earn credits from $${orderTotal} purchase for user ${userId}, order ${orderId}`);
    
    const client = supabase.getServiceClient();
    
    // Use the new dynamic rate function that handles wholesale vs regular customers
    const { data, error } = await client
      .rpc('add_user_credits_with_dynamic_rate', {
        p_user_id: userId,
        p_order_total: orderTotal,
        p_order_id: orderId,
        p_credit_limit: 100.00
      });
    
    if (error) throw error;
    
    // Handle different scenarios based on response
    if (data.success === false) {
      if (data.message === 'Credit limit reached') {
        console.log('🚫 Credit limit reached - no additional credits earned:', data);
        return {
          success: false,
          limitReached: true,
          currentBalance: data.current_balance,
          creditLimit: data.credit_limit,
          message: 'Credit limit reached - no additional credits earned'
        };
      } else {
        console.log('⚠️ Credits not earned:', data.message);
        return {
          success: false,
          message: data.message || 'Failed to earn credits'
        };
      }
    } else {
      const isWholesale = data.is_wholesale || false;
      const creditRate = Math.round((data.credit_rate || 0.05) * 100);
      
      console.log(`✅ Credits earned successfully: ${data.amount} (${creditRate}% ${isWholesale ? 'wholesale' : 'standard'} rate)`);
      
      return {
        success: true,
        limitReached: false,
        pointsEarned: data.amount,
        totalBalance: data.new_balance,
        creditRate: data.credit_rate,
        isWholesale: isWholesale,
        orderId: orderId,
        message: `$${data.amount.toFixed(2)} earned from your recent order (${creditRate}% ${isWholesale ? 'wholesale' : 'standard'} rate)`
      };
    }
  } catch (error) {
    console.error('Error earning points from purchase:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Restore credits for abandoned checkout sessions
const restoreCreditsForAbandonedCheckout = async (sessionId, reason) => {
  try {
    const client = supabase.getServiceClient();
    
    console.log('🔄 Attempting to restore credits for abandoned checkout session:', sessionId);
    
    // Find orders with this session ID that are still "Awaiting Payment"
    const { data: orders, error: orderError } = await client
      .from('orders_main')
      .select('id, user_id, credits_applied, credit_transaction_id, order_status, created_at')
      .eq('stripe_session_id', sessionId)
      .eq('order_status', 'Awaiting Payment');
    
    if (orderError) {
      console.error('❌ Error finding orders for session:', orderError);
      return { success: false, error: orderError.message };
    }
    
    if (!orders || orders.length === 0) {
      console.log('ℹ️ No pending orders found for session:', sessionId);
      return { success: true, message: 'No pending orders found' };
    }
    
    let restoredCredits = 0;
    const restoredOrders = [];
    
    for (const order of orders) {
      const creditsApplied = parseFloat(order.credits_applied) || 0;
      
      if (creditsApplied > 0 && order.credit_transaction_id) {
        console.log(`🔄 Restoring ${creditsApplied} credits for order ${order.id}`);
        
        // Reverse the credit transaction
        const reverseResult = await reverseTransaction(
          order.credit_transaction_id,
          reason || `Abandoned checkout session ${sessionId}`
        );
        
        if (reverseResult.success) {
          restoredCredits += creditsApplied;
          restoredOrders.push(order.id);
          
          // Update the order to clear credit tracking
          await client
            .from('orders_main')
            .update({
              credits_applied: 0,
              credit_transaction_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
          
          console.log(`✅ Successfully restored ${creditsApplied} credits for order ${order.id}`);
        } else {
          console.error(`❌ Failed to restore credits for order ${order.id}:`, reverseResult.error);
        }
      }
    }
    
    return {
      success: true,
      restoredCredits,
      restoredOrders,
      message: `Restored ${restoredCredits} credits for ${restoredOrders.length} orders`
    };
  } catch (error) {
    console.error('❌ Error restoring credits for abandoned checkout:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Cleanup abandoned checkout sessions and restore credits
const cleanupAbandonedCheckouts = async (maxAgeHours = 24) => {
  try {
    const client = supabase.getServiceClient();
    
    console.log(`🧹 Starting cleanup of abandoned checkouts older than ${maxAgeHours} hours`);
    
    // Find orders that are "Awaiting Payment" with session IDs older than maxAgeHours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    const { data: abandonedOrders, error: orderError } = await client
      .from('orders_main')
      .select('id, user_id, stripe_session_id, credits_applied, credit_transaction_id, created_at')
      .eq('order_status', 'Awaiting Payment')
      .not('stripe_session_id', 'is', null)
      .gt('credits_applied', 0)
      .lt('created_at', cutoffTime.toISOString());
    
    if (orderError) {
      console.error('❌ Error finding abandoned orders:', orderError);
      return { success: false, error: orderError.message };
    }
    
    if (!abandonedOrders || abandonedOrders.length === 0) {
      console.log('✅ No abandoned checkouts found requiring cleanup');
      return { success: true, message: 'No abandoned checkouts found' };
    }
    
    console.log(`🔍 Found ${abandonedOrders.length} abandoned orders with credits to restore`);
    
    let totalRestored = 0;
    const restoredSessions = [];
    
    // Group orders by session ID to avoid duplicate API calls
    const sessionGroups = {};
    abandonedOrders.forEach(order => {
      if (!sessionGroups[order.stripe_session_id]) {
        sessionGroups[order.stripe_session_id] = [];
      }
      sessionGroups[order.stripe_session_id].push(order);
    });
    
    // Process each session group
    for (const [sessionId, orders] of Object.entries(sessionGroups)) {
      console.log(`🔄 Processing abandoned session ${sessionId} with ${orders.length} orders`);
      
      const restoreResult = await restoreCreditsForAbandonedCheckout(
        sessionId,
        `Cleanup: Session abandoned for ${maxAgeHours}+ hours`
      );
      
      if (restoreResult.success) {
        totalRestored += restoreResult.restoredCredits || 0;
        restoredSessions.push(sessionId);
      }
    }
    
    console.log(`✅ Cleanup completed: Restored ${totalRestored} credits across ${restoredSessions.length} sessions`);
    
    return {
      success: true,
      totalRestored,
      restoredSessions: restoredSessions.length,
      message: `Restored ${totalRestored} credits from ${restoredSessions.length} abandoned sessions`
    };
  } catch (error) {
    console.error('❌ Error during abandoned checkout cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Reserve credits for checkout (mark as pending instead of deducting)
const reserveCreditsForCheckout = async ({ userId, amount, reason, sessionId, transactionType }) => {
  try {
    const client = supabase.getServiceClient();
    
    // Get current balance first
    const currentBalance = await getUserCreditBalance(userId);
    const safeCurrentBalance = parseFloat(currentBalance.balance) || 0;
    const safeAmount = parseFloat(amount) || 0;
    
    if (safeCurrentBalance < safeAmount) {
      return {
        success: false,
        error: 'Insufficient credit balance',
        availableBalance: safeCurrentBalance
      };
    }
    
    // Create a pending credit transaction (reserve credits without deducting)
    const { data, error } = await client
      .from('credits')
      .insert({
        user_id: userId,
        amount: -safeAmount, // Negative amount for reservation
        balance: safeCurrentBalance, // Balance stays the same (not deducted yet)
        reason: reason || 'Credit reservation for checkout',
        transaction_type: transactionType || 'reservation_pending_payment',
        order_id: null, // Will be updated when order is created
        session_id: sessionId, // Track the Stripe session
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      reservationId: data.id,
      reservedAmount: safeAmount,
      availableBalance: safeCurrentBalance,
      message: 'Credits reserved for checkout'
    };
  } catch (error) {
    console.error('Error reserving credits for checkout:', error);
    return {
      success: false,
      error: error.message,
      availableBalance: 0
    };
  }
};

// Confirm credit reservation (actually deduct the credits)
const confirmCreditReservation = async (reservationId, orderId) => {
  try {
    const client = supabase.getServiceClient();
    
    // Get the reservation
    const { data: reservation, error: fetchError } = await client
      .from('credits')
      .select('*')
      .eq('id', reservationId)
      .eq('transaction_type', 'reservation_pending_payment')
      .single();
    
    if (fetchError || !reservation) {
      throw new Error('Reservation not found or already processed');
    }
    
    const userId = reservation.user_id;
    const reservedAmount = Math.abs(reservation.amount);
    
    // Get current balance
    const currentBalance = await getUserCreditBalance(userId);
    const safeCurrentBalance = parseFloat(currentBalance.balance) || 0;
    
    // Actually deduct the credits now
    const newBalance = safeCurrentBalance - reservedAmount;
    
    // Update the reservation to become a confirmed deduction
    const { error: updateError } = await client
      .from('credits')
      .update({
        balance: newBalance,
        transaction_type: 'deduction_confirmed',
        order_id: orderId,
        reason: `Credit applied to order ${orderId}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);
    
    if (updateError) throw updateError;
    
    return {
      success: true,
      deductedAmount: reservedAmount,
      newBalance: newBalance,
      message: 'Credit reservation confirmed and deducted'
    };
  } catch (error) {
    console.error('Error confirming credit reservation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Cancel credit reservation (restore to available)
const cancelCreditReservation = async (reservationId, reason) => {
  try {
    const client = supabase.getServiceClient();
    
    // Delete the reservation record (since balance was never actually changed)
    const { error } = await client
      .from('credits')
      .delete()
      .eq('id', reservationId)
      .eq('transaction_type', 'reservation_pending_payment');
    
    if (error) throw error;
    
    return {
      success: true,
      message: reason || 'Credit reservation cancelled'
    };
  } catch (error) {
    console.error('Error cancelling credit reservation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Cleanup expired credit reservations
const cleanupExpiredReservations = async (maxAgeHours = 24) => {
  try {
    const client = supabase.getServiceClient();
    
    console.log(`🧹 Cleaning up expired credit reservations older than ${maxAgeHours} hours`);
    
    // Find expired reservations
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    const { data: expiredReservations, error } = await client
      .from('credits')
      .select('*')
      .eq('transaction_type', 'reservation_pending_payment')
      .lt('created_at', cutoffTime.toISOString());
    
    if (error) throw error;
    
    if (!expiredReservations || expiredReservations.length === 0) {
      console.log('✅ No expired credit reservations found');
      return { success: true, message: 'No expired reservations found' };
    }
    
    console.log(`🔍 Found ${expiredReservations.length} expired credit reservations`);
    
    // Delete expired reservations
    const { error: deleteError } = await client
      .from('credits')
      .delete()
      .eq('transaction_type', 'reservation_pending_payment')
      .lt('created_at', cutoffTime.toISOString());
    
    if (deleteError) throw deleteError;
    
    console.log(`✅ Cleaned up ${expiredReservations.length} expired credit reservations`);
    
    return {
      success: true,
      cleanedUp: expiredReservations.length,
      message: `Cleaned up ${expiredReservations.length} expired credit reservations`
    };
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  initializeWithSupabase,
  getUserCreditBalance,
  getUnreadCreditNotifications,
  markCreditNotificationsRead,
  addUserCredits,
  addCreditsToAllUsers,
  getAllCreditTransactions,
  getUserCreditHistory,
  applyCreditsToOrder,
  deductUserCredits,
  reverseTransaction,
  confirmTransaction,
  updateTransactionOrderId,
  earnPointsFromPurchase,
  restoreCreditsForAbandonedCheckout,
  cleanupAbandonedCheckouts,
  reserveCreditsForCheckout,
  confirmCreditReservation,
  cancelCreditReservation,
  cleanupExpiredReservations
}; 