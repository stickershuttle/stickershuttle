// Credit handlers will receive the supabase client from the API
let supabase;

// Initialize with the supabase client from the main API
const initializeWithSupabase = (supabaseClient) => {
  supabase = supabaseClient;
};

// Small utility to retry transient Supabase network failures (e.g., EAI_AGAIN)
const withTransientRetry = async (fn, retries = 2) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const cause = err?.cause || err;
      const isTransient =
        (cause && (cause.code === 'EAI_AGAIN' || cause.errno === -3001)) ||
        /fetch failed/i.test(err?.message || '') ||
        /getaddrinfo EAI_AGAIN/i.test(String(err));
      if (attempt < retries && isTransient) {
        const delay = 200 * (attempt + 1);
        console.warn(`Supabase transient error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
};

// Validate credit application
const validateCreditApplication = async (userId, orderSubtotal, requestedCredits) => {
  try {
    if (!userId || userId === 'guest') {
      return {
        valid: false,
        message: 'Credit validation is only available for logged-in users',
        maxApplicable: 0
      };
    }

    const safeOrderSubtotal = parseFloat(orderSubtotal) || 0;
    const safeRequestedCredits = parseFloat(requestedCredits) || 0;

    if (safeRequestedCredits <= 0) {
      return {
        valid: false,
        message: 'Credit amount must be greater than 0',
        maxApplicable: 0
      };
    }

    // Get user's current credit balance
    const balanceInfo = await getUserCreditBalance(userId);
    const availableBalance = parseFloat(balanceInfo.balance) || 0;

    if (availableBalance < safeRequestedCredits) {
      return {
        valid: false,
        message: `Insufficient credit balance. You have $${availableBalance.toFixed(2)} available`,
        maxApplicable: Math.min(availableBalance, safeOrderSubtotal)
      };
    }

    if (safeRequestedCredits > safeOrderSubtotal) {
      return {
        valid: false,
        message: `Cannot apply more credits than order subtotal ($${safeOrderSubtotal.toFixed(2)})`,
        maxApplicable: Math.min(availableBalance, safeOrderSubtotal)
      };
    }

    return {
      valid: true,
      message: 'Credit application is valid',
      maxApplicable: Math.min(availableBalance, safeOrderSubtotal)
    };
  } catch (error) {
    console.error('Error validating credit application:', error);
    return {
      valid: false,
      message: 'Error validating credit application',
      maxApplicable: 0
    };
  }
};

// Deduct credits from user balance
const deductCredits = async (userId, amount, description, type = 'used', orderId = null) => {
  try {
    if (!supabase) {
      throw new Error('Credit service not initialized');
    }

    const safeAmount = parseFloat(amount) || 0;
    if (safeAmount <= 0) {
      throw new Error('Deduction amount must be greater than 0');
    }

    if (!userId || userId === 'guest') {
      throw new Error('Credit deduction is only available for logged-in users');
    }

    const client = supabase.getServiceClient();

    // Check if credits have already been deducted for this order
    if (orderId) {
      console.log(`💳 Checking for existing credit deductions for order ${orderId}...`);
      
      const { data: existingDeductions, error: checkError } = await client
        .from('credits')
        .select('id, amount')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .eq('transaction_type', type)
        .lt('amount', 0); // Negative amounts indicate deductions
      
      if (checkError) {
        console.error('❌ Error checking existing credit deductions:', checkError);
      } else if (existingDeductions && existingDeductions.length > 0) {
        console.log(`⚠️ Credits already deducted for order ${orderId}:`, existingDeductions);
        
        // Return the existing deduction info
        const existingDeduction = existingDeductions[0];
        const balance = await getUserCreditBalance(userId);
        
        return {
          id: existingDeduction.id,
          userId: userId,
          amount: existingDeduction.amount,
          balance: balance.balance,
          description: description,
          transactionType: type,
          orderId: orderId,
          createdAt: new Date().toISOString(),
          alreadyDeducted: true
        };
      }
    }

    // Get current balance
    const balanceInfo = await getUserCreditBalance(userId);
    const currentBalance = parseFloat(balanceInfo.balance) || 0;

    if (currentBalance < safeAmount) {
      throw new Error(`Insufficient credits. Available: ${currentBalance}, Requested: ${safeAmount}`);
    }

    // Calculate new balance
    const newBalance = currentBalance - safeAmount;

    // Create credit transaction record
    const { data: transaction, error: transactionError } = await client
      .from('credits')
      .insert({
        user_id: userId,
        amount: -safeAmount, // Negative amount for deduction
        balance: newBalance,
        reason: description || `Credits deducted`,
        transaction_type: type,
        order_id: orderId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      // Check if it's a duplicate key error
      if (transactionError.code === '23505' || transactionError.message?.includes('duplicate')) {
        console.log(`⚠️ Duplicate credit deduction prevented for order ${orderId}`);
        
        // Try to get the existing deduction
        const { data: existingDeduction } = await client
          .from('credits')
          .select('*')
          .eq('user_id', userId)
          .eq('order_id', orderId)
          .eq('transaction_type', type)
          .lt('amount', 0)
          .single();
        
        if (existingDeduction) {
          return {
            id: existingDeduction.id,
            userId: existingDeduction.user_id,
            amount: existingDeduction.amount,
            balance: existingDeduction.balance,
            description: existingDeduction.reason,
            transactionType: existingDeduction.transaction_type,
            orderId: existingDeduction.order_id,
            createdAt: existingDeduction.created_at,
            alreadyDeducted: true
          };
        }
      }
      
      console.error('❌ Error creating credit transaction:', transactionError);
      throw new Error(`Failed to deduct credits: ${transactionError.message}`);
    }

    console.log('✅ Credits deducted successfully:', {
      userId,
      amount: safeAmount,
      newBalance,
      transactionId: transaction.id
    });

    return {
      id: transaction.id,
      userId: transaction.user_id,
      amount: transaction.amount,
      balance: transaction.balance,
      description: transaction.reason,
      transactionType: transaction.transaction_type,
      orderId: transaction.order_id,
      createdAt: transaction.created_at
    };
  } catch (error) {
    console.error('❌ Error in deductCredits:', error);
    throw error;
  }
};

// Get user's current credit balance
const getUserCreditBalance = async (userId) => {
  try {
    const client = supabase.getServiceClient();
    
    console.log(`💳 Calculating credit balance for user ${userId} directly from transactions`);
    
    // Always calculate balance directly from transactions (don't use the view)
    const { data: transactions, error: txError } = await client
      .from('credits')
      .select('amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (txError) {
      console.error('❌ Error fetching credit transactions:', txError);
      throw txError;
    }
    
    // Calculate balance from transactions
    const balance = transactions?.reduce((sum, tx) => {
      const amount = parseFloat(tx.amount) || 0;
      return sum + amount;
    }, 0) || 0;
    
    const lastTransaction = transactions && transactions.length > 0 ? transactions[0] : null;
    
    console.log(`💳 Credit balance calculated: $${balance.toFixed(2)} from ${transactions?.length || 0} transactions`);
    
    return {
      balance: balance,
      transactionCount: transactions?.length || 0,
      lastTransactionDate: lastTransaction?.created_at || null
    };
  } catch (error) {
    console.error('❌ Error calculating user credit balance:', error);
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
    const data = await withTransientRetry(async () => {
      const { data, error } = await client
        .rpc('get_unread_credit_notifications', { p_user_id: userId });
      if (error) throw error;
      return data;
    }, 2);
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
    await withTransientRetry(async () => {
      const { error } = await client
        .rpc('mark_credit_notifications_read', { p_user_id: userId });
      if (error) throw error;
      return true;
    }, 2);
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
    
    // Get current user balance
    const { data: existingCredits, error: balanceError } = await client
      .from('credits')
      .select('amount')
      .eq('user_id', userId);
    
    if (balanceError) throw balanceError;
    
    // Calculate current balance and new balance
    const currentBalance = existingCredits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);
    const newBalance = currentBalance + parseFloat(amount);
    
    // Insert new credit transaction
    const { data: creditData, error: insertError } = await client
      .from('credits')
      .insert({
        user_id: userId,
        amount: parseFloat(amount),
        balance: newBalance,
        reason: reason || 'Store credit added by admin',
        transaction_type: 'earned',
        created_at: new Date().toISOString(),
        created_by: adminUserId,
        expires_at: expiresAt || null
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Format the credit data to match GraphQL schema
    const formattedCredit = {
      id: creditData.id,
      userId: userId,
      amount: amount,
      reason: reason || 'Store credit added by admin',
      createdAt: creditData.created_at
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
    
    // Get all users from auth.users
    const { data: { users }, error: usersError } = await client.auth.admin.listUsers();
    
    if (usersError) throw usersError;
    
    let usersUpdated = 0;
    
    // Process each user
    for (const user of users) {
      try {
        // Get current user balance
        const { data: existingCredits, error: balanceError } = await client
          .from('credits')
          .select('amount')
          .eq('user_id', user.id);
        
        if (balanceError) {
          console.error(`Error getting balance for user ${user.id}:`, balanceError);
          continue;
        }
        
        // Calculate current balance and new balance
        const currentBalance = existingCredits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);
        const newBalance = currentBalance + parseFloat(amount);
        
        // Insert new credit transaction
        const { error: insertError } = await client
          .from('credits')
          .insert({
            user_id: user.id,
            amount: parseFloat(amount),
            balance: newBalance,
            reason: reason || 'Promotional credit',
            transaction_type: 'earned',
            created_at: new Date().toISOString(),
            created_by: adminUserId
          });
        
        if (insertError) {
          console.error(`Error adding credits for user ${user.id}:`, insertError);
          continue;
        }
        
        usersUpdated++;
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        continue;
      }
    }
    
    return {
      success: true,
      usersUpdated: usersUpdated
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
      userId: t.user_id,
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

// Apply credits to order (using corrected deductCredits function)
const applyCreditsToOrder = async (orderId, amount, userId) => {
  try {
    console.log(`💳 Applying credits to order ${orderId}: $${amount} for user ${userId}`);
    
    // Use the corrected deductCredits function instead of the buggy RPC
    const deductResult = await deductCredits(
      userId,
      amount,
      `Credits applied to order ${orderId}`,
      'used',
      orderId
    );
    
    if (deductResult.alreadyDeducted) {
      console.log('✅ Credits were already deducted for this order:', deductResult);
      
      // Get remaining balance
      const balance = await getUserCreditBalance(userId);
      const safeBalance = parseFloat(balance.balance) || 0;
      
      return {
        success: true,
        remainingBalance: safeBalance,
        message: 'Credits already applied to this order'
      };
    }
    
    // Get remaining balance
    const balance = await getUserCreditBalance(userId);
    const safeBalance = parseFloat(balance.balance) || 0;
    
    return {
      success: true,
      remainingBalance: safeBalance
    };
  } catch (error) {
    console.error('❌ Error applying credits to order:', error);
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

// Deduct credits from user (using corrected deductCredits function)
const deductUserCredits = async ({ userId, amount, reason, orderId, transactionType }) => {
  try {
    console.log(`💳 Deducting user credits: $${amount} for user ${userId}, order ${orderId}`);
    
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
    
    // Use the corrected deductCredits function instead of the buggy RPC
    const deductResult = await deductCredits(
      userId,
      safeAmount,
      reason || `Credits deducted for order ${orderId}`,
      transactionType || 'used',
      orderId
    );
    
    if (deductResult.alreadyDeducted) {
      console.log('✅ Credits were already deducted for this order:', deductResult);
      
      // Get updated balance
      const updatedBalance = await getUserCreditBalance(userId);
      const safeUpdatedBalance = parseFloat(updatedBalance.balance) || 0;
      
      return {
        success: true,
        transactionId: deductResult.id,
        remainingBalance: safeUpdatedBalance,
        deductedAmount: Math.abs(deductResult.amount),
        message: 'Credits already deducted for this order'
      };
    }
    
    // Get updated balance
    const updatedBalance = await getUserCreditBalance(userId);
    const safeUpdatedBalance = parseFloat(updatedBalance.balance) || 0;
    
    return {
      success: true,
      transactionId: deductResult.id,
      remainingBalance: safeUpdatedBalance,
      deductedAmount: safeAmount
    };
  } catch (error) {
    console.error('❌ Error deducting user credits:', error);
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
    
    // Check if credits have already been awarded for this order
    const { data: existingCredits, error: checkError } = await client
      .from('credits')
      .select('id, amount')
      .eq('user_id', userId)
      .eq('order_id', orderId)
      .eq('transaction_type', 'earned');
    
    if (checkError) {
      console.error('❌ Error checking existing credits:', checkError);
    } else if (existingCredits && existingCredits.length > 0) {
      console.log(`⚠️ Credits already awarded for order ${orderId}:`, existingCredits);
      return {
        success: false,
        message: 'Credits already awarded for this order',
        alreadyAwarded: true,
        existingAmount: existingCredits[0].amount
      };
    }
    
    // Get current balance to check against $100 limit
    const balanceInfo = await getUserCreditBalance(userId);
    const currentBalance = parseFloat(balanceInfo.balance) || 0;
    
    console.log(`💰 Current credit balance: $${currentBalance.toFixed(2)}`);
    
    // Check if user has already reached the $100 limit
    if (currentBalance >= 100) {
      console.log(`⚠️ User ${userId} has reached the $100 credit limit. Current balance: $${currentBalance.toFixed(2)}`);
      return {
        success: false,
        limitReached: true,
        message: 'You have reached the $100 store credit limit. Please use your existing credits on future orders.',
        pointsEarned: 0,
        totalBalance: currentBalance,
        creditRate: 0.05,
        isWholesale: false,
        orderId: orderId
      };
    }
    
    // Use a fixed 5% credit rate for all users
    const creditRate = 0.05; // 5% cashback rate
    const potentialCreditAmount = orderTotal * creditRate;
    
    // Check if awarding full credits would exceed $100 limit
    const newPotentialBalance = currentBalance + potentialCreditAmount;
    let creditAmount = potentialCreditAmount;
    let limitExceeded = false;
    let cappedMessage = '';
    
    if (newPotentialBalance > 100) {
      // Cap the credit amount to not exceed $100 total
      creditAmount = 100 - currentBalance;
      limitExceeded = true;
      cappedMessage = `You were about to earn $${potentialCreditAmount.toFixed(2)} in store credits, but this would exceed your $100 limit. Your credits have been capped at $${creditAmount.toFixed(2)} to reach the maximum balance of $100.00.`;
      console.log(`⚠️ Credit amount capped: ${potentialCreditAmount.toFixed(2)} → ${creditAmount.toFixed(2)} due to $100 limit`);
    }
    
    // If credit amount is 0 or negative after capping, don't insert any credits
    if (creditAmount <= 0) {
      console.log(`⚠️ No credits to award after capping. Credit amount: ${creditAmount}`);
      return {
        success: false,
        limitReached: true,
        message: 'You have reached the $100 store credit limit. Please use your existing credits on future orders.',
        pointsEarned: 0,
        totalBalance: currentBalance,
        creditRate: 0.05,
        isWholesale: false,
        orderId: orderId
      };
    }
    
    // Try to insert earned credits with additional safeguards
    try {
      // Double-check right before insert (to catch race conditions)
      const { data: finalCheck, error: finalCheckError } = await client
        .from('credits')
        .select('id')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .eq('transaction_type', 'earned')
        .single();
      
      if (finalCheck) {
        console.log(`⚠️ Race condition detected - credits already exist for order ${orderId}`);
        return {
          success: false,
          message: 'Credits already awarded for this order (race condition prevented)',
          alreadyAwarded: true
        };
      }
      
      // Insert earned credits WITHOUT balance field (balance calculated dynamically)
      const { data, error } = await client
        .from('credits')
        .insert({
          user_id: userId,
          amount: creditAmount,
          reason: `Earned from order (${Math.round(creditRate * 100)}% rate)`,
          transaction_type: 'earned',
          order_id: orderId,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();
      
      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log(`⚠️ Duplicate credit prevented by database constraint for order ${orderId}`);
          return {
            success: false,
            message: 'Credits already awarded for this order',
            alreadyAwarded: true
          };
        }
        throw error;
      }
      
      // Get updated balance to confirm (calculated dynamically)
      const updatedBalance = await getUserCreditBalance(userId);
      const isWholesale = false; // Fixed rate for all users
      
      console.log(`✅ Credits earned successfully: ${creditAmount.toFixed(2)} (${Math.round(creditRate * 100)}% rate)`);
      
      // Determine the appropriate message based on whether credits were capped
      let successMessage;
      if (limitExceeded) {
        successMessage = cappedMessage;
      } else {
        successMessage = `$${creditAmount.toFixed(2)} earned from your recent order (${Math.round(creditRate * 100)}% rate)`;
      }
      
      return {
        success: true,
        limitReached: limitExceeded,
        limitExceededMessage: limitExceeded ? cappedMessage : null,
        pointsEarned: creditAmount,
        totalBalance: updatedBalance.balance,
        creditRate: creditRate,
        isWholesale: isWholesale,
        orderId: orderId,
        transactionId: data.id,
        message: successMessage
      };
    } catch (insertError) {
      // Handle any database errors including constraint violations
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        console.log(`⚠️ Duplicate credit prevented for order ${orderId}`);
        return {
          success: false,
          message: 'Credits already awarded for this order',
          alreadyAwarded: true
        };
      }
      throw insertError;
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
        transaction_type: 'used',
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

// Fix existing credit transactions to have correct transaction_type for earned credits
const fixExistingEarnedCredits = async () => {
  try {
    const client = supabase.getServiceClient();
    
    console.log('🔧 Starting to fix existing earned credit transactions...');
    
    // Find credit transactions that look like they were earned from orders
    // but don't have transaction_type = 'earned'
    const { data: transactionsToFix, error: fetchError } = await client
      .from('credits')
      .select('*')
      .gt('amount', 0) // Positive amounts (earnings)
      .not('order_id', 'is', null) // Has an associated order
      .ilike('reason', '%earned from order%') // Reason suggests it was earned
      .not('transaction_type', 'eq', 'earned'); // But doesn't have 'earned' type
    
    if (fetchError) {
      console.error('❌ Error fetching transactions to fix:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!transactionsToFix || transactionsToFix.length === 0) {
      console.log('✅ No credit transactions need fixing');
      return { success: true, fixed: 0, message: 'No transactions needed fixing' };
    }
    
    console.log(`🔍 Found ${transactionsToFix.length} credit transactions that need fixing`);
    
    // Update all found transactions to have transaction_type = 'earned'
    const { data: updatedTransactions, error: updateError } = await client
      .from('credits')
      .update({ 
        transaction_type: 'earned',
        updated_at: new Date().toISOString()
      })
      .in('id', transactionsToFix.map(t => t.id))
      .select('*');
    
    if (updateError) {
      console.error('❌ Error updating transaction types:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log(`✅ Successfully fixed ${updatedTransactions?.length || 0} credit transactions`);
    
    // Log some examples of what was fixed
    if (updatedTransactions && updatedTransactions.length > 0) {
      console.log('📋 Examples of fixed transactions:');
      updatedTransactions.slice(0, 3).forEach(t => {
        console.log(`  - ID: ${t.id}, Amount: $${t.amount}, Order: ${t.order_id}, Reason: ${t.reason}`);
      });
    }
    
    return {
      success: true,
      fixed: updatedTransactions?.length || 0,
      message: `Fixed ${updatedTransactions?.length || 0} credit transactions`
    };
    
  } catch (error) {
    console.error('❌ Error fixing existing earned credits:', error);
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
  validateCreditApplication,
  deductCredits,
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
  cleanupExpiredReservations,
  fixExistingEarnedCredits
}; 