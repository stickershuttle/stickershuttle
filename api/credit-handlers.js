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
    
    // Also get transaction count and last transaction date
    const { data: stats, error: statsError } = await client
      .from('user_credit_balance')
      .select('total_credits, transaction_count, last_transaction_date')
      .eq('user_id', userId)
      .single();
    
    return {
      balance: data || 0,
      transactionCount: stats?.transaction_count || 0,
      lastTransactionDate: stats?.last_transaction_date || null
    };
  } catch (error) {
    console.error('Error getting user credit balance:', error);
    throw error;
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
    const { data, error } = await client
      .rpc('use_credits_for_order', {
        p_user_id: userId,
        p_order_id: orderId,
        p_amount: amount
      });
    
    if (error) throw error;
    
    // Get remaining balance
    const balance = await getUserCreditBalance(userId);
    
    return {
      success: true,
      remainingBalance: balance.balance
    };
  } catch (error) {
    console.error('Error applying credits to order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Earn points/credits from purchase (5% cashback)
const earnPointsFromPurchase = async (userId, orderTotal, orderId) => {
  try {
    if (!userId || userId === 'guest') {
      console.log('💰 Skipping points earning for guest user');
      return { success: false, message: 'Guest user - no points earned' };
    }

    // Calculate 5% of the total amount spent
    const pointsEarned = Math.round((orderTotal * 0.05) * 100) / 100; // Round to 2 decimal places
    
    if (pointsEarned <= 0) {
      console.log('💰 No points to earn from $0 order');
      return { success: false, message: 'No points to earn' };
    }

    console.log(`💰 Earning ${pointsEarned} points from $${orderTotal} purchase for user ${userId}, order ${orderId}`);
    
    const client = supabase.getServiceClient();
    
    // Use the new function that supports order linkage
    const { data, error } = await client
      .rpc('add_user_credits_with_order', {
        p_user_id: userId,
        p_amount: pointsEarned,
        p_reason: `$${pointsEarned.toFixed(2)} earned from your recent order`,
        p_order_id: orderId,
        p_created_by: null,
        p_expires_at: null
      });
    
    if (error) throw error;
    
    console.log('✅ Points earned successfully and linked to order:', { pointsEarned, orderId });
    
    return {
      success: true,
      pointsEarned: pointsEarned,
      orderId: orderId,
      message: `$${pointsEarned.toFixed(2)} earned from your recent order`
    };
  } catch (error) {
    console.error('Error earning points from purchase:', error);
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
  earnPointsFromPurchase
}; 