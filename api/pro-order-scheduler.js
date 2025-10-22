// Pro Member Order Automation Scheduler
// Handles automated order generation, design locking, and reminder emails

class ProOrderScheduler {
  constructor(supabaseClient, emailNotifications) {
    this.supabase = supabaseClient;
    this.emailNotifications = emailNotifications;
    this.lastCheckTime = null;
    this.checkInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  // Main scheduler method - checks and processes all due tasks
  async runScheduledTasks() {
    try {
      // Debounce: only run if it's been more than 1 hour since last check
      const now = Date.now();
      if (this.lastCheckTime && (now - this.lastCheckTime) < this.checkInterval) {
        console.log('⏭️ Skipping Pro scheduler - last check was recent');
        return { skipped: true, reason: 'Debounced - checked recently' };
      }

      console.log('🔄 Running Pro order scheduler tasks...');
      this.lastCheckTime = now;

      if (!this.supabase.isReady()) {
        console.error('❌ Supabase not ready for scheduler');
        return { success: false, error: 'Database unavailable' };
      }

      const client = this.supabase.getServiceClient();
      const results = {
        ordersGenerated: 0,
        designsLocked: 0,
        warningsSent: 0,
        errors: []
      };

      // Task 1: Check for orders due for generation (next_order_date <= today)
      await this.generateDueOrders(client, results);

      // Task 2: Check for designs that need to be locked (5 days before next order)
      await this.lockDueDesigns(client, results);

      // Task 3: Send 3-day warning emails for upcoming lock dates
      await this.sendDesignLockWarnings(client, results);

      console.log('✅ Pro scheduler tasks completed:', results);
      return { success: true, ...results };

    } catch (error) {
      console.error('❌ Error in Pro order scheduler:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate orders for members whose next_order_date has arrived
  async generateDueOrders(client, results) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find Pro members with orders due
      const { data: dueMembers, error } = await client
        .from('pro_order_generation_log')
        .select(`
          *,
          user_profiles(*)
        `)
        .lte('next_order_date', today.toISOString())
        .eq('status', 'active')
        .eq('user_profiles.is_pro_member', true)
        .eq('user_profiles.pro_status', 'active');

      if (error) {
        console.error('❌ Error fetching due orders:', error);
        results.errors.push(`Failed to fetch due orders: ${error.message}`);
        return;
      }

      if (!dueMembers || dueMembers.length === 0) {
        console.log('📊 No Pro orders due for generation');
        return;
      }

      console.log(`📦 Found ${dueMembers.length} Pro members with orders due`);

      // Import generateOrderNumber function
      const { generateOrderNumber } = require('./stripe-webhook-handlers');

      for (const record of dueMembers) {
        try {
          const member = record.user_profiles;
          
          // ===== VALIDATION CHECKS =====
          const validationErrors = [];
          const validationWarnings = [];
          
          // Critical validations (must pass to create order)
          if (!member.user_id) {
            validationErrors.push('Missing user_id');
          }
          if (!member.email) {
            validationErrors.push('Missing email address');
          }
          if (!member.is_pro_member) {
            validationErrors.push('User is not a Pro member');
          }
          if (member.pro_status !== 'active') {
            validationErrors.push(`Pro status is ${member.pro_status}, not active`);
          }
          
          // Non-critical validations (log warnings but still create order)
          if (!member.pro_current_design_file) {
            validationWarnings.push('No design file uploaded - order will be created with pending design status');
          }
          if (!member.pro_default_shipping_address || !member.pro_default_shipping_address.address1) {
            validationWarnings.push('No shipping address on file - order will be created with pending address status');
          }
          if (member.pro_current_design_file && !member.pro_design_approved) {
            validationWarnings.push('Design not approved - admin review required');
          }
          
          // If critical errors exist, skip this member
          if (validationErrors.length > 0) {
            console.error(`❌ Validation failed for ${member.email}: ${validationErrors.join(', ')}`);
            results.errors.push(`${member.email}: ${validationErrors.join(', ')}`);
            continue; // Skip to next member
          }
          
          // Log warnings but continue
          if (validationWarnings.length > 0) {
            console.warn(`⚠️ Validation warnings for ${member.email}: ${validationWarnings.join(', ')}`);
          }
          
          // ===== END VALIDATION =====
          
          // Generate SS-XXXX format order number
          const orderNumber = await generateOrderNumber(client);

          // Get user's design and shipping address
          const designFiles = member.pro_current_design_file ? [member.pro_current_design_file] : [];
          const shippingAddress = member.pro_default_shipping_address || {};

          // Create the order
          const orderData = {
            user_id: member.user_id,
            order_number: orderNumber,
            order_status: 'Pro Monthly Order',
            fulfillment_status: 'unfulfilled',
            financial_status: 'paid',
            subtotal_price: 0.00,
            total_tax: 0.00,
            total_price: 0.00,
            currency: 'USD',
            customer_first_name: member.first_name || '',
            customer_last_name: member.last_name || '',
            customer_email: member.email || '',
            customer_phone: member.phone_number || '',
            shipping_address: shippingAddress,
            billing_address: {},
            order_tags: ['pro-monthly-stickers', 'pro-member', 'monthly-benefit', 'auto-generated'],
            order_note: `Monthly Pro member sticker benefit - 100 custom matte vinyl stickers (3"). Auto-generated.${designFiles.length === 0 ? ' Design pending upload.' : ''}${!shippingAddress.address1 ? ' Shipping address pending.' : ''}`,
            order_created_at: new Date().toISOString(),
            order_updated_at: new Date().toISOString()
          };

          const order = await this.supabase.createCustomerOrder(orderData);

          if (order) {
            // Create order item
            const orderItem = {
              customer_order_id: order.id,
              product_id: 'pro-monthly-stickers',
              product_name: 'Pro Monthly Stickers',
              product_category: 'vinyl-stickers',
              sku: 'PRO-MONTHLY-100',
              quantity: 100,
              unit_price: 0.00,
              total_price: 0.00,
              calculator_selections: {
                selectedShape: 'Custom',
                selectedSize: '3"',
                selectedQuantity: '100',
                selectedMaterial: 'Matte',
                selectedWhiteOption: 'White ink',
                isProMember: true,
                proMonthlyBenefit: true,
                autoGenerated: true
              },
              custom_files: designFiles,
              customer_notes: `Pro member monthly benefit - 100 custom matte vinyl stickers (3")${designFiles.length > 0 ? ' (Design attached)' : ' (Design pending upload)'}`,
              fulfillment_status: 'unfulfilled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error: itemError } = await client
              .from('order_items')
              .insert([orderItem]);

            if (itemError) {
              console.error(`❌ Error creating order item:`, itemError);
              results.errors.push(`Failed to create item for ${member.email}: ${itemError.message}`);
            } else {
              // Update tracking record
              const nextOrderDate = new Date();
              nextOrderDate.setDate(nextOrderDate.getDate() + 30);

              await client
                .from('pro_order_generation_log')
                .update({
                  last_order_generated_at: new Date().toISOString(),
                  last_order_id: order.id,
                  next_order_date: nextOrderDate.toISOString(),
                  last_check_date: new Date().toISOString()
                })
                .eq('id', record.id);

              results.ordersGenerated++;
              console.log(`✅ Generated Pro order ${orderNumber} for ${member.email}`);

              // Send email notification
              if (this.emailNotifications && this.emailNotifications.sendProMonthlyOrderCreatedEmail) {
                await this.emailNotifications.sendProMonthlyOrderCreatedEmail(order, member);
              }
            }
          }
        } catch (memberError) {
          console.error(`❌ Error processing member ${record.user_profiles?.email}:`, memberError);
          results.errors.push(`Error for ${record.user_profiles?.email}: ${memberError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in generateDueOrders:', error);
      results.errors.push(`Generate orders error: ${error.message}`);
    }
  }

  // Lock designs for members whose next order is in 5 days or less
  async lockDueDesigns(client, results) {
    try {
      const lockDate = new Date();
      lockDate.setDate(lockDate.getDate() + 5); // 5 days from now
      lockDate.setHours(23, 59, 59, 999);

      // Find Pro members whose next order is within 5 days and design isn't locked yet
      const { data: membersToLock, error } = await client
        .from('pro_order_generation_log')
        .select(`
          *,
          user_profiles(*)
        `)
        .lte('next_order_date', lockDate.toISOString())
        .eq('status', 'active')
        .eq('user_profiles.is_pro_member', true)
        .eq('user_profiles.pro_status', 'active')
        .eq('user_profiles.pro_design_locked', false);

      if (error) {
        console.error('❌ Error fetching members for design lock:', error);
        results.errors.push(`Failed to fetch lock candidates: ${error.message}`);
        return;
      }

      if (!membersToLock || membersToLock.length === 0) {
        console.log('📊 No designs need locking');
        return;
      }

      console.log(`🔒 Found ${membersToLock.length} designs to lock`);

      for (const record of membersToLock) {
        try {
          const member = record.user_profiles;

          // Lock the design
          await client
            .from('user_profiles')
            .update({
              pro_design_locked: true,
              pro_design_locked_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', member.user_id);

          // Update tracking log
          await client
            .from('pro_order_generation_log')
            .update({
              last_design_locked_at: new Date().toISOString()
            })
            .eq('id', record.id);

          results.designsLocked++;
          console.log(`🔒 Locked design for ${member.email}`);

          // Send design locked email
          if (this.emailNotifications && this.emailNotifications.sendProDesignLockedEmail) {
            await this.emailNotifications.sendProDesignLockedEmail(member);
          }

        } catch (lockError) {
          console.error(`❌ Error locking design for ${record.user_profiles?.email}:`, lockError);
          results.errors.push(`Lock error for ${record.user_profiles?.email}: ${lockError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in lockDueDesigns:', error);
      results.errors.push(`Lock designs error: ${error.message}`);
    }
  }

  // Send warning emails 3 days before design lock
  async sendDesignLockWarnings(client, results) {
    try {
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 8); // 3 days before 5-day lock = 8 days from now
      warningDate.setHours(23, 59, 59, 999);

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find Pro members whose next order is 8 days away (3 days before lock)
      // and haven't received a warning in the last 3 days
      const { data: membersToWarn, error } = await client
        .from('pro_order_generation_log')
        .select(`
          *,
          user_profiles(*)
        `)
        .lte('next_order_date', warningDate.toISOString())
        .eq('status', 'active')
        .eq('user_profiles.is_pro_member', true)
        .eq('user_profiles.pro_status', 'active')
        .eq('user_profiles.pro_design_locked', false)
        .or(`last_design_lock_warning_sent_at.is.null,last_design_lock_warning_sent_at.lt.${threeDaysAgo.toISOString()}`);

      if (error) {
        console.error('❌ Error fetching members for warning:', error);
        results.errors.push(`Failed to fetch warning candidates: ${error.message}`);
        return;
      }

      if (!membersToWarn || membersToWarn.length === 0) {
        console.log('📊 No design lock warnings needed');
        return;
      }

      console.log(`⚠️ Sending design lock warnings to ${membersToWarn.length} members`);

      for (const record of membersToWarn) {
        try {
          const member = record.user_profiles;
          const nextOrderDate = new Date(record.next_order_date);
          const daysUntilLock = Math.ceil((nextOrderDate - new Date()) / (1000 * 60 * 60 * 24)) - 5; // Subtract 5 for the lock period

          // Send warning email
          if (this.emailNotifications && this.emailNotifications.sendProDesignLockWarningEmail) {
            await this.emailNotifications.sendProDesignLockWarningEmail(member, Math.max(3, daysUntilLock));
          }

          // Update tracking log
          await client
            .from('pro_order_generation_log')
            .update({
              last_design_lock_warning_sent_at: new Date().toISOString()
            })
            .eq('id', record.id);

          results.warningsSent++;
          console.log(`⚠️ Sent lock warning to ${member.email}`);

        } catch (warnError) {
          console.error(`❌ Error sending warning to ${record.user_profiles?.email}:`, warnError);
          results.errors.push(`Warning error for ${record.user_profiles?.email}: ${warnError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in sendDesignLockWarnings:', error);
      results.errors.push(`Warning emails error: ${error.message}`);
    }
  }

  // Check if scheduler should run (passive checking on API requests)
  shouldRun() {
    const now = Date.now();
    if (!this.lastCheckTime) return true;
    return (now - this.lastCheckTime) >= this.checkInterval;
  }

  // Initialize tracking for a new Pro member
  async initializeTracking(userId, subscriptionStartDate) {
    try {
      if (!this.supabase.isReady()) {
        console.error('❌ Supabase not ready for tracking initialization');
        return { success: false, error: 'Database unavailable' };
      }

      const client = this.supabase.getServiceClient();
      
      // Calculate next order date: 25 days from subscription start (5 days before 30-day renewal)
      const nextOrderDate = new Date(subscriptionStartDate);
      nextOrderDate.setDate(nextOrderDate.getDate() + 25);

      const { data, error } = await client
        .from('pro_order_generation_log')
        .upsert({
          user_id: userId,
          next_order_date: nextOrderDate.toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error initializing Pro tracking:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Initialized Pro order tracking for user ${userId}, next order: ${nextOrderDate.toLocaleDateString()}`);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error in initializeTracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Update tracking after order generation
  async updateTrackingAfterGeneration(userId, orderId) {
    try {
      if (!this.supabase.isReady()) {
        return { success: false, error: 'Database unavailable' };
      }

      const client = this.supabase.getServiceClient();
      
      // Set next order date to 30 days from now
      const nextOrderDate = new Date();
      nextOrderDate.setDate(nextOrderDate.getDate() + 30);

      const { data, error } = await client
        .from('pro_order_generation_log')
        .update({
          last_order_generated_at: new Date().toISOString(),
          last_order_id: orderId,
          next_order_date: nextOrderDate.toISOString(),
          last_check_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating Pro tracking:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Updated Pro order tracking for user ${userId}, next order: ${nextOrderDate.toLocaleDateString()}`);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error in updateTrackingAfterGeneration:', error);
      return { success: false, error: error.message };
    }
  }

  // Pause tracking for a canceled/paused subscription
  async pauseTracking(userId) {
    try {
      if (!this.supabase.isReady()) {
        return { success: false, error: 'Database unavailable' };
      }

      const client = this.supabase.getServiceClient();

      const { error } = await client
        .from('pro_order_generation_log')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error pausing Pro tracking:', error);
        return { success: false, error: error.message };
      }

      console.log(`⏸️ Paused Pro order tracking for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error in pauseTracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Resume tracking for a reactivated subscription
  async resumeTracking(userId) {
    try {
      if (!this.supabase.isReady()) {
        return { success: false, error: 'Database unavailable' };
      }

      const client = this.supabase.getServiceClient();

      // Set next order date to 25 days from now
      const nextOrderDate = new Date();
      nextOrderDate.setDate(nextOrderDate.getDate() + 25);

      const { error } = await client
        .from('pro_order_generation_log')
        .update({
          status: 'active',
          next_order_date: nextOrderDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error resuming Pro tracking:', error);
        return { success: false, error: error.message };
      }

      console.log(`▶️ Resumed Pro order tracking for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error in resumeTracking:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ProOrderScheduler;

