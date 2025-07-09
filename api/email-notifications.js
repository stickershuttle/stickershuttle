// Email notification system using Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Sticker Shuttle <orbit@stickershuttle.com>';
const REPLY_TO_EMAIL = 'orbit@stickershuttle.com';
const FRONTEND_URL = 'https://stickershuttle.com';

// Rate limiting for email sends (Resend allows 2 requests per second)
let lastEmailSent = 0;
const EMAIL_RATE_LIMIT_MS = 600; // 600ms between emails (slightly more than 500ms for safety)

// Helper function to ensure we don't exceed rate limits
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailSent;
  
  if (timeSinceLastEmail < EMAIL_RATE_LIMIT_MS) {
    const waitTime = EMAIL_RATE_LIMIT_MS - timeSinceLastEmail;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending next email`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastEmailSent = Date.now();
};

// Email templates
const getOrderStatusEmailTemplate = (orderData, newStatus) => {
  const statusMessages = {
    'Building Proof': {
      subject: `✏️ We're creating your proof for order #${orderData.orderNumber}`,
      title: 'You should see your proof soon!',
      message: 'We\'re working on creating digital proofs for your custom stickers. We\'ll send you the proofs for approval soon!',
      emoji: '👀',
      color: '#3B82F6'
    },
    'Proof Sent': {
      subject: `🚨 ATTN: Your proof is ready for order #${orderData.orderNumber}`,
      title: 'It\'s time! Click below to review your proof!',
      message: 'Your custom sticker proof is ready! Please review and approve it so we can start production.',
      emoji: '⏱️',
      color: '#F59E0B'
    },
    'Printing': {
      subject: `🖨️ Your order is now printing - Order #${orderData.orderNumber}`,
      title: 'The printing process has begun!',
      message: 'Great news! Your stickers are now being printed, watch out for tracking information!',
      emoji: '🖨️',
      color: '#10B981'
    },
    'Shipped': {
      subject: `📦 Your order is on the way! - Order #${orderData.orderNumber}`,
      title: 'Look how far we\'ve come in such a short time...',
      message: 'Your stickers are on their way to you! Use the tracking information below to monitor delivery.',
      emoji: '📦',
      color: '#8B5CF6'
    },
    'Out for Delivery': {
      subject: `🚚 Your order is out for delivery! - Order #${orderData.orderNumber}`,
      title: 'Your stickers are almost there!',
      message: 'Great news! Your order is out for delivery today. Keep an eye out for your package!',
      emoji: '🚚',
      color: '#F59E0B'
    },
    'Delivered': {
      subject: `✅ Knock Knock, your order has been delivered! - Order #${orderData.orderNumber}`,
      title: 'Order Delivered!',
      message: 'Your stickers have been delivered! We hope you love them. Don\'t forget to share them with the world!',
      emoji: '✅',
      color: '#059669'
    }
  };

  const statusInfo = statusMessages[newStatus] || {
    subject: `Order Update - Order #${orderData.orderNumber}`,
    title: 'Order Status Updated',
    message: `Your order status has been updated to: ${newStatus}`,
    emoji: '📢',
    color: '#6B7280'
  };

  return {
    subject: statusInfo.subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #1a1a1a;">
        ${statusInfo.emoji} ${statusInfo.title}
      </h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: 400; color: #4b5563;">
        Order #${orderData.orderNumber}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #1a1a1a;">
          ${statusInfo.message}
        </p>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 30px;">
        ${newStatus === 'Building Proof' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          View Order Details
        </a>
        ` : ''}
        
        ${newStatus === 'Proof Sent' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Review Proof
        </a>
        ` : ''}
        
        ${newStatus === 'Shipped' || newStatus === 'Out for Delivery' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          View Order Details
        </a>
        <a href="${orderData.trackingUrl || '#'}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Track Package
        </a>
        ` : ''}
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
          Questions about your order?
        </p>
        <a href="${FRONTEND_URL}/contact-us" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
        Thank you for choosing Sticker Shuttle!
      </p>
      <p style="margin: 0; font-size: 12px; font-weight: 400; color: #6b7280;">
        This email was sent to ${orderData.customerEmail} regarding order #${orderData.orderNumber}
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

const getProofNotificationTemplate = (orderData, proofUrl) => {
  // Use the same template as "Proof Sent" status to avoid duplicates
  return getOrderStatusEmailTemplate(orderData, 'Proof Sent');
};

// Send email function with rate limiting
const sendEmail = async (to, subject, html) => {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Apply rate limiting before sending
    await waitForRateLimit();
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        reply_to: [REPLY_TO_EMAIL],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Special handling for rate limit errors
      if (response.status === 429) {
        console.error('❌ Rate limit exceeded, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return await sendEmail(to, subject, html); // Retry once
      }
      throw new Error(`Resend API error: ${errorData.message}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.id);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Main notification functions
const sendOrderStatusNotification = async (orderData, newStatus) => {
  try {
    console.log('📧 sendOrderStatusNotification called with:', {
      orderDataKeys: Object.keys(orderData),
      newStatus,
      hasCustomerEmail: !!orderData.customer_email,
      hasCustomerEmailCamelCase: !!orderData.customerEmail,
      hasGuestEmail: !!orderData.guest_email,
      rawCustomerEmail: orderData.customer_email,
      rawCustomerEmailCamelCase: orderData.customerEmail
    });
    
    // Map different possible field names to standardized format
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      totalPrice: orderData.total_price || orderData.totalPrice || 0,
      trackingNumber: orderData.tracking_number || orderData.trackingNumber,
      trackingUrl: orderData.tracking_url || orderData.trackingUrl
    };
    
    console.log(`📧 Sending order status notification for order ${normalizedOrderData.orderNumber}: ${newStatus}`);
    console.log(`📧 Order data fields:`, Object.keys(orderData));
    console.log(`📧 Customer email:`, normalizedOrderData.customerEmail);
    console.log(`📧 Normalized data:`, normalizedOrderData);
    
    if (!normalizedOrderData.customerEmail) {
      console.error('❌ Email notification failed: No customer email');
      console.error('📧 Customer email:', normalizedOrderData.customerEmail);
      console.error('❌ No customer email found for order:', normalizedOrderData.orderNumber);
      console.error('❌ Available order fields:', Object.keys(orderData).map(key => `'${key}'`).join(', '));
      return { success: false, error: 'No customer email' };
    }

    const template = getOrderStatusEmailTemplate(normalizedOrderData, newStatus);
    const result = await sendEmail(normalizedOrderData.customerEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Order status notification sent for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending order status notification:', error);
    return { success: false, error: error.message };
  }
};

const sendProofNotification = async (orderData, proofUrl) => {
  try {
    // Map different possible field names to standardized format
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      totalPrice: orderData.total_price || orderData.totalPrice || 0,
      trackingNumber: orderData.tracking_number || orderData.trackingNumber,
      trackingUrl: orderData.tracking_url || orderData.trackingUrl
    };
    
    console.log(`📧 Sending proof notification for order ${normalizedOrderData.orderNumber}`);
    
    if (!normalizedOrderData.customerEmail) {
      console.log('❌ No customer email found for order:', normalizedOrderData.orderNumber);
      return { success: false, error: 'No customer email' };
    }

    const template = getProofNotificationTemplate(normalizedOrderData, proofUrl);
    const result = await sendEmail(normalizedOrderData.customerEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Proof notification sent for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending proof notification:', error);
    return { success: false, error: error.message };
  }
};

// Admin notification email template
const getAdminNotificationTemplate = (type, orderData, extraData = {}) => {
  const adminEmail = 'orbit@stickershuttle.com';
  const adminPanelUrl = `${FRONTEND_URL}/admin/orders/${orderData.orderNumber}`;
  
  // Check if this is express shipping or rush order
  const isExpressShipping = orderData.is_express_shipping || orderData.shipping_method?.includes('Next Day Air') || orderData.shipping_method?.includes('2nd Day Air');
  const isRushOrder = orderData.is_rush_order;
  
  // Create alert text for urgent orders
  let urgentAlert = '';
  if (isExpressShipping && isRushOrder) {
    urgentAlert = `🚀⚡ RUSH + EXPRESS: ${orderData.shipping_method || 'Express'} - `;
  } else if (isExpressShipping) {
    urgentAlert = `⚡ EXPRESS SHIPPING: ${orderData.shipping_method || 'Express'} - `;
  } else if (isRushOrder) {
    urgentAlert = `🚀 RUSH ORDER - `;
  }
  
  const templates = {
    'new_order': {
      subject: `🚨 ${urgentAlert}NEW ORDER: #${orderData.orderNumber} - $${orderData.totalPrice}`,
      title: (isExpressShipping && isRushOrder) ? '🚀⚡ RUSH + EXPRESS ORDER!' 
           : isExpressShipping ? '⚡ EXPRESS ORDER RECEIVED!'
           : isRushOrder ? '🚀 RUSH ORDER RECEIVED!'
           : 'New Order Received!',
      message: (isExpressShipping && isRushOrder) 
        ? `🚨 CRITICAL URGENT: This order has BOTH RUSH PRODUCTION + EXPRESS SHIPPING (${orderData.shipping_method || 'Express'}) - highest priority processing required!`
        : isExpressShipping 
        ? `🚨 URGENT: This order has EXPRESS SHIPPING (${orderData.shipping_method || 'Express'}) - please prioritize for faster processing! A new order has been placed and payment confirmed.`
        : isRushOrder
        ? `🚨 URGENT: This order has RUSH PRODUCTION (24hr processing) - please prioritize for faster production! A new order has been placed and payment confirmed.`
        : `A new order has been placed and payment confirmed. Click below to view details and begin processing.`,
      emoji: (isExpressShipping && isRushOrder) ? '🚀⚡' 
           : isExpressShipping ? '⚡' 
           : isRushOrder ? '🚀'
           : '🎉',
      color: (isExpressShipping || isRushOrder) ? '#EF4444' : '#10B981',
      buttonText: 'View Order in Admin Panel',
      buttonColor: (isExpressShipping || isRushOrder) ? '#EF4444' : '#10B981'
    },
    'proof_approved': {
      subject: `✅ PROOF APPROVED: Order #${orderData.orderNumber}`,
      title: 'Customer Approved Proof!',
      message: `The customer has approved their proof for order #${orderData.orderNumber}. You can now proceed with production.`,
      emoji: '✅',
      color: '#10B981',
      buttonText: 'View Order & Start Production',
      buttonColor: '#10B981'
    },
    'proof_changes_requested': {
      subject: `🔄 CHANGES REQUESTED: Order #${orderData.orderNumber}`,
      title: 'Customer Requested Changes',
      message: `The customer has requested changes to their proof for order #${orderData.orderNumber}. Please review their feedback and create a new proof.`,
      emoji: '🔄',
      color: '#F59E0B',
      buttonText: 'View Order & Customer Notes',
      buttonColor: '#F59E0B'
    }
  };

  const template = templates[type] || templates['new_order'];

  return {
    subject: template.subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="color: #1a1a1a; margin: 0; font-size: 22px; font-weight: 600;">
        ${template.emoji} ${template.title}
      </h1>
      <p style="color: #4b5563; margin: 10px 0 0 0; font-size: 16px; font-weight: 400;">
        Order #${orderData.orderNumber}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid ${template.color}; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #1a1a1a; font-weight: 400;">
          ${template.message}
        </p>
      </div>

      <!-- Order Details -->
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Order Number:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Customer:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${orderData.customerName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Email:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${orderData.customerEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Order Total:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">$${orderData.totalPrice?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Status:</td>
            <td style="padding: 8px 0; color: ${template.color}; font-weight: 600;">${orderData.orderStatus || 'Processing'}</td>
          </tr>
          ${type === 'proof_changes_requested' && extraData.customerNotes ? `
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Customer Notes:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${extraData.customerNotes}</td>
          </tr>
          ` : ''}
          ${orderData.calculatorSelections ? `
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Product Details:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${orderData.calculatorSelections}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${adminPanelUrl}" style="display: inline-block; background-color: ${template.buttonColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          ${template.buttonText}
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 400;">
          Need to contact the customer?
        </p>
        <a href="mailto:${orderData.customerEmail}" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Send Email
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 400;">
        Internal Notification - Sticker Shuttle Admin
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 400;">
        This email was sent to ${adminEmail} regarding order #${orderData.orderNumber}
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Helper function to format calculator selections for display
const formatCalculatorSelections = (orderData) => {
  try {
    // Check if order has items with calculator selections
    if (orderData.items && orderData.items.length > 0) {
      const selections = [];
      
      orderData.items.forEach((item, index) => {
        const calc = item.calculator_selections || item.calculatorSelections;
        if (calc && typeof calc === 'object') {
          const itemSelections = [];
          
          // Format each selection type
          if (calc.size && calc.size.displayValue) {
            itemSelections.push(`Size: ${calc.size.displayValue}`);
          }
          if (calc.material && calc.material.displayValue) {
            itemSelections.push(`Material: ${calc.material.displayValue}`);
          }
          if (calc.cut && calc.cut.displayValue) {
            itemSelections.push(`Cut: ${calc.cut.displayValue}`);
          }
          if (calc.quantity && calc.quantity.value) {
            itemSelections.push(`Qty: ${calc.quantity.value}`);
          }
          if (calc.rush && calc.rush.value) {
            itemSelections.push(`Rush Order`);
          }
          if (calc.whiteOption && calc.whiteOption.displayValue) {
            itemSelections.push(`White Option: ${calc.whiteOption.displayValue}`);
          }
          
          if (itemSelections.length > 0) {
            const itemName = item.product_name || item.productName || `Item ${index + 1}`;
            selections.push(`${itemName}: ${itemSelections.join(', ')}`);
          }
        }
      });
      
      return selections.length > 0 ? selections.join(' | ') : null;
    }
    
    // Fallback: check for order-level calculator selections or order note
    if (orderData.order_note || orderData.orderNote) {
      const note = orderData.order_note || orderData.orderNote;
      // Extract key details from order note
      const details = [];
      
      const sizeMatch = note.match(/📏 Size: (.+?)(?:\n|$)/);
      if (sizeMatch) details.push(`Size: ${sizeMatch[1].trim()}`);
      
      const materialMatch = note.match(/✨ Material: (.+?)(?:\n|$)/);
      if (materialMatch) details.push(`Material: ${materialMatch[1].trim()}`);
      
      const cutMatch = note.match(/✂️ Cut: (.+?)(?:\n|$)/);
      if (cutMatch) details.push(`Cut: ${cutMatch[1].trim()}`);
      
      const qtyMatch = note.match(/🔢 Quantity: (.+?)(?:\n|$)/);
      if (qtyMatch) details.push(`Qty: ${qtyMatch[1].trim()}`);
      
      return details.length > 0 ? details.join(', ') : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error formatting calculator selections:', error);
    return null;
  }
};

// Admin notification functions
const sendAdminNewOrderNotification = async (orderData) => {
  try {
    const adminEmail = 'orbit@stickershuttle.com';
    
    // Normalize order data
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      customerName: `${orderData.customer_first_name || orderData.customerFirstName || ''} ${orderData.customer_last_name || orderData.customerLastName || ''}`.trim() || 'N/A',
      totalPrice: orderData.total_price || orderData.totalPrice || 0,
      orderStatus: orderData.order_status || orderData.orderStatus || 'Processing',
      calculatorSelections: formatCalculatorSelections(orderData)
    };
    
    console.log(`📧 Sending admin new order notification for order ${normalizedOrderData.orderNumber}`);
    
    const template = getAdminNotificationTemplate('new_order', normalizedOrderData);
    const result = await sendEmail(adminEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Admin new order notification sent for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending admin new order notification:', error);
    return { success: false, error: error.message };
  }
};

const sendAdminProofActionNotification = async (orderData, action, extraData = {}) => {
  try {
    const adminEmail = 'orbit@stickershuttle.com';
    
    // Normalize order data
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      customerName: `${orderData.customer_first_name || orderData.customerFirstName || ''} ${orderData.customer_last_name || orderData.customerLastName || ''}`.trim() || 'N/A',
      totalPrice: orderData.total_price || orderData.totalPrice || 0,
      orderStatus: orderData.order_status || orderData.orderStatus || 'Processing',
      calculatorSelections: formatCalculatorSelections(orderData)
    };
    
    const notificationType = action === 'approved' ? 'proof_approved' : 'proof_changes_requested';
    
    console.log(`📧 Sending admin proof action notification: ${notificationType} for order ${normalizedOrderData.orderNumber}`);
    
    const template = getAdminNotificationTemplate(notificationType, normalizedOrderData, extraData);
    const result = await sendEmail(adminEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Admin proof action notification sent: ${notificationType} for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending admin proof action notification:', error);
    return { success: false, error: error.message };
  }
};

// User file upload to support email template
const getUserFileUploadTemplate = (userData, fileName, fileSize, message) => {
  return {
    subject: `📎 File Upload from ${userData.name || userData.email} - ${fileName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Upload from Customer</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #030140; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">
        📎 Customer File Upload
      </h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
        ${fileName}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
          A customer has uploaded a file through their settings dashboard.
        </p>
      </div>

      <!-- Customer Details -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Customer Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Customer Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${userData.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${userData.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">File Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${fileName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">File Size:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${(fileSize / (1024 * 1024)).toFixed(2)} MB</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Upload Time:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      ${message ? `
      <!-- Customer Message -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Customer Message</h3>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${message}</p>
      </div>
      ` : ''}

      <!-- Instructions -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
          The uploaded file is attached to this email.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Please download and review the file, then respond to the customer if needed.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
        Customer File Upload - Sticker Shuttle
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This email was sent to orbit@stickershuttle.com from ${userData.email}
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Send email with file attachment function
const sendEmailWithAttachment = async (to, subject, html, attachmentBuffer, attachmentFilename, attachmentMimeType) => {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

        // Validate API key format for security
  console.log('🔑 RESEND_API_KEY configured:', {
    hasKey: !!RESEND_API_KEY,
    keyPrefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 8) + '...' : 'None',
    keyLength: RESEND_API_KEY ? RESEND_API_KEY.length : 0
  });

  try {
    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields (to, subject, html)');
    }
    
    if (!attachmentBuffer || !attachmentFilename) {
      throw new Error('Missing attachment data');
    }

    // Prepare request payload
    const emailPayload = {
      from: FROM_EMAIL,
      to: [to],
      reply_to: [REPLY_TO_EMAIL],
      subject: subject,
      html: html,
      attachments: [{
        filename: attachmentFilename,
        content: attachmentBuffer.toString('base64'),
        content_type: attachmentMimeType
      }]
    };

    console.log('📧 Sending email with attachment:', {
      to: to,
      subject: subject,
      filename: attachmentFilename,
      fileSize: attachmentBuffer.length,
      mimeType: attachmentMimeType
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        // Try to parse as JSON first
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          // If not JSON, get the text response
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError);
        // Use the default error message
      }
      throw new Error(`Resend API error: ${errorMessage}`);
    }

    const result = await response.json();
    console.log('✅ Email with attachment sent successfully:', result.id);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('❌ Email with attachment sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Function to send user file upload to support
const sendUserFileUpload = async (userData, fileBuffer, fileName, fileSize, mimeType, message = '') => {
  try {
    console.log('📧 Sending user file upload to support:', {
      userEmail: userData.email,
      fileName,
      fileSize,
      hasMessage: !!message
    });
    
    const template = getUserFileUploadTemplate(userData, fileName, fileSize, message);
    const result = await sendEmailWithAttachment(
      'orbit@stickershuttle.com',
      template.subject,
      template.html,
      fileBuffer,
      fileName,
      mimeType
    );
    
    if (result.success) {
      console.log(`✅ User file upload email sent for ${userData.email}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending user file upload email:', error);
    return { success: false, error: error.message };
  }
};

// Function to check if customer is first-time by counting their previous paid orders
const isFirstTimeCustomer = async (customerEmail) => {
  try {
    const supabaseClient = require('./supabase-client');
    const client = supabaseClient.getServiceClient();
    
    console.log(`🔍 Checking if ${customerEmail} is a first-time customer...`);
    
    const { data: orders, error } = await client
      .from('orders_main')
      .select('id, financial_status, customer_email')
      .eq('customer_email', customerEmail)
      .eq('financial_status', 'paid');
    
    if (error) {
      console.error('❌ Error checking customer history:', error);
      return true; // Default to first-time if we can't check
    }
    
    const orderCount = orders?.length || 0;
    console.log(`📊 Customer ${customerEmail} has ${orderCount} previous paid orders`);
    
    return orderCount === 0; // First-time only if they have no previous paid orders
  } catch (error) {
    console.error('❌ Error in isFirstTimeCustomer:', error);
    return true; // Default to first-time if error
  }
};

// Welcome email template for first-time customers
const getWelcomeEmailTemplate = (orderData) => {
  // Extract first name from order data
  const firstName = orderData.customerFirstName || 
                   orderData.customer_first_name || 
                   orderData.firstName || 
                   (orderData.customerEmail ? orderData.customerEmail.split('@')[0] : 'friend');

  return {
    subject: `🎉 Welcome to Sticker Shuttle! Order #${orderData.orderNumber} confirmed`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sticker Shuttle!</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a;">
        🎉 You did it, ${firstName}!
      </h1>
      <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 400; color: #4b5563;">
        Your first order is confirmed!
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <!-- Welcome Message -->
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 25px; margin-bottom: 30px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0 0 15px 0; font-size: 22px; font-weight: 600; color: #1a1a1a;">Thank you for choosing us!</h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #4b5563;">
          We're thrilled to have you here! Your order has been received and we'll start working on it right away.
        </p>
      </div>

      <!-- Order Details -->
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #4b5563;">Order Number:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #4b5563;">Order Total:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #10b981;">$${orderData.totalPrice?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #4b5563;">Status:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #3b82f6;">Processing</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Track Your Order
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 400;">
          Questions about your order or need help?
        </p>
        <a href="${FRONTEND_URL}/contact-us" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 400;">
        Thank you for choosing Sticker Shuttle!
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 400;">
        This email was sent to ${orderData.customerEmail} regarding order #${orderData.orderNumber}
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Enhanced order status notification that handles first-time customers
const sendOrderStatusNotificationEnhanced = async (orderData, newStatus) => {
  try {
    console.log('📧 sendOrderStatusNotificationEnhanced called with:', {
      orderDataKeys: Object.keys(orderData),
      newStatus,
      hasCustomerEmail: !!orderData.customer_email,
      hasCustomerEmailCamelCase: !!orderData.customerEmail,
      hasGuestEmail: !!orderData.guest_email,
      rawCustomerEmail: orderData.customer_email,
      rawCustomerEmailCamelCase: orderData.customerEmail
    });
    
    // Map different possible field names to standardized format
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      totalPrice: orderData.total_price || orderData.totalPrice || 0,
      trackingNumber: orderData.tracking_number || orderData.trackingNumber,
      trackingUrl: orderData.tracking_url || orderData.trackingUrl
    };
    
    console.log(`📧 Sending enhanced order status notification for order ${normalizedOrderData.orderNumber}: ${newStatus}`);
    console.log(`📧 Customer email:`, normalizedOrderData.customerEmail);
    
    if (!normalizedOrderData.customerEmail) {
      console.error('❌ Email notification failed: No customer email');
      return { success: false, error: 'No customer email' };
    }

    // Check if this is a first-time customer when the order is paid
    if (newStatus === 'paid' || newStatus === 'Building Proof') {
      const isFirstTime = await isFirstTimeCustomer(normalizedOrderData.customerEmail);
      
      if (isFirstTime) {
        console.log(`🎉 First-time customer detected for ${normalizedOrderData.customerEmail}, sending welcome email and scheduling thank you email`);
        
        // Send welcome email
        const welcomeTemplate = getWelcomeEmailTemplate(normalizedOrderData);
        const welcomeResult = await sendEmail(normalizedOrderData.customerEmail, welcomeTemplate.subject, welcomeTemplate.html);
        
        if (welcomeResult.success) {
          console.log(`✅ Welcome email sent for order ${normalizedOrderData.orderNumber}`);
        } else {
          console.error(`❌ Welcome email failed for order ${normalizedOrderData.orderNumber}:`, welcomeResult.error);
        }
        
        // Schedule thank you email for 12 hours later (regardless of welcome email success)
        try {
          const scheduleResult = await scheduleFirstOrderThankYou(normalizedOrderData);
          if (scheduleResult.success) {
            console.log(`✅ Thank you email scheduled for order ${normalizedOrderData.orderNumber}`);
          } else {
            console.error(`❌ Failed to schedule thank you email for order ${normalizedOrderData.orderNumber}:`, scheduleResult.error);
          }
        } catch (scheduleError) {
          console.error(`❌ Error scheduling thank you email for order ${normalizedOrderData.orderNumber}:`, scheduleError);
        }
        
        // If this is the 'paid' status notification, don't send another email
        if (newStatus === 'paid') {
          return welcomeResult;
        }
      } else {
        console.log(`🔄 Returning customer detected for ${normalizedOrderData.customerEmail}, skipping welcome email`);
      }
    }

    // Send standard order status notification
    const template = getOrderStatusEmailTemplate(normalizedOrderData, newStatus);
    const result = await sendEmail(normalizedOrderData.customerEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Order status notification sent for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending enhanced order status notification:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email to first-time customers
const sendWelcomeEmail = async (orderData) => {
  try {
    // Map different possible field names to standardized format
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      customerFirstName: orderData.customer_first_name || orderData.customerFirstName || orderData.firstName,
      totalPrice: orderData.total_price || orderData.totalPrice || 0
    };
    
    console.log(`📧 Sending welcome email for order ${normalizedOrderData.orderNumber}`);
    
    if (!normalizedOrderData.customerEmail) {
      console.log('❌ No customer email found for welcome email');
      return { success: false, error: 'No customer email' };
    }

    const template = getWelcomeEmailTemplate(normalizedOrderData);
    const result = await sendEmail(normalizedOrderData.customerEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Welcome email sent for order ${normalizedOrderData.orderNumber}`);
      
      // Also schedule thank you email for 12 hours later
      try {
        const scheduleResult = await scheduleFirstOrderThankYou(normalizedOrderData);
        if (scheduleResult.success) {
          console.log(`✅ Thank you email scheduled for order ${normalizedOrderData.orderNumber}`);
        } else {
          console.error(`❌ Failed to schedule thank you email for order ${normalizedOrderData.orderNumber}:`, scheduleResult.error);
        }
      } catch (scheduleError) {
        console.error(`❌ Error scheduling thank you email for order ${normalizedOrderData.orderNumber}:`, scheduleError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Wholesale approval email template
const getWholesaleApprovalEmailTemplate = (userData) => {
  return {
    subject: `🎉 Welcome to Wholesale! Your 10% store credit is now active`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Wholesale!</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        🎉 Welcome to the Team!
      </h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: 400; color: #4b5563;">
        Your wholesale application has been approved
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid #10B981; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0 0 15px 0; font-size: 18px; line-height: 1.6; font-weight: 600; color: #1a1a1a;">
          Hi ${userData.firstName || 'there'}!
        </p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #1a1a1a;">
          Great news! Your wholesale application for <strong>${userData.companyName || 'your company'}</strong> has been approved.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #1a1a1a;">
          You now get access to <strong>15% off and 2.5% store credit</strong> on every order. This discount and store credit has been added to your account! We've also added $25 to your account as a welcoming bonus. Enjoy!
        </p>
      </div>

      <!-- Benefits Section -->
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Your Wholesale Benefits:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #1a1a1a;">
          <li><strong>15% off</strong> on every order.</li>  
          <li><strong>2.5% store credit</strong> on every order.</li>
          <li>Credits automatically applied after order completion</li>
          <li>Use credits on future orders to save money</li>
          <li>$100 maximum credit balance</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${FRONTEND_URL}/cart" style="display: inline-block; background-color: #10B981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Start Shopping
        </a>
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          View Account
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
          Questions about your wholesale benefits?
        </p>
        <a href="${FRONTEND_URL}/contact-us" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
        Thank you for choosing Sticker Shuttle!
      </p>
      <p style="margin: 0; font-size: 12px; font-weight: 400; color: #6b7280;">
        This email was sent to ${userData.email} regarding your wholesale application
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Send wholesale approval email
const sendWholesaleApprovalEmail = async (userData) => {
  try {
    console.log('📧 Sending wholesale approval email to:', userData.email);
    
    if (!userData.email) {
      console.log('❌ No email provided for wholesale approval notification');
      return { success: false, error: 'No email provided' };
    }

    const template = getWholesaleApprovalEmailTemplate(userData);
    const result = await sendEmail(userData.email, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Wholesale approval email sent to ${userData.email}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending wholesale approval email:', error);
    return { success: false, error: error.message };
  }
};

// Wholesale revocation email template
const getWholesaleRevocationEmailTemplate = (userData) => {
  return {
    subject: `Important Notice: Wholesale Access Update`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wholesale Access Update</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        📋 Account Update
      </h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: 400; color: #4b5563;">
        Important changes to your wholesale access
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid #F59E0B; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0 0 15px 0; font-size: 18px; line-height: 1.6; font-weight: 600; color: #1a1a1a;">
          Hi ${userData.firstName || 'there'}!
        </p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #1a1a1a;">
          We're writing to inform you that your wholesale access for <strong>${userData.companyName || 'your account'}</strong> has been updated.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; font-weight: 400; color: #1a1a1a;">
          Your account has been returned to regular customer status. <strong>Your account remains active</strong> and you can continue placing orders as usual.
        </p>
      </div>

      <!-- Changes Section -->}
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">What's Changed:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #1a1a1a;">
          <li>Wholesale discount (15% off) has been removed</li>  
          <li>Store credit rate changed from 2.5% to 5% (you now earn more!)</li>
          <li>All existing store credits remain in your account</li>
          <li>Your client relationships and order history are preserved</li>
        </ul>
      </div>

      <!-- What Stays the Same -->}
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid #10B981; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">What Stays the Same:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #1a1a1a;">
          <li><strong>Your account remains active</strong> - no interruption to service</li>
          <li><strong>Order history preserved</strong> - all past orders remain accessible</li>
          <li><strong>Store credits maintained</strong> - use your existing credits anytime</li>
          <li><strong>Higher credit rate</strong> - earn 5% back instead of 2.5%!</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${FRONTEND_URL}/cart" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Continue Shopping
        </a>
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background-color: #10B981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          View Account
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
          Questions about these changes?
        </p>
        <a href="${FRONTEND_URL}/contact-us" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 400; color: #4b5563;">
        Thank you for your continued business!
      </p>
      <p style="margin: 0; font-size: 12px; font-weight: 400; color: #6b7280;">
        This email was sent to ${userData.email} regarding your account status
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Send wholesale revocation email
const sendWholesaleRevocationEmail = async (userData) => {
  try {
    console.log('📧 Sending wholesale revocation email to:', userData.email);
    
    if (!userData.email) {
      console.log('❌ No email provided for wholesale revocation notification');
      return { success: false, error: 'No email provided' };
    }

    const template = getWholesaleRevocationEmailTemplate(userData);
    const result = await sendEmail(userData.email, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Wholesale revocation email sent to ${userData.email}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending wholesale revocation email:', error);
    return { success: false, error: error.message };
  }
};

// Template for customer artwork upload notification
const getCustomerArtworkUploadTemplate = (orderData, itemData) => {
  const adminEmail = 'orbit@stickershuttle.com';
  const adminPanelUrl = `${FRONTEND_URL}/admin/orders/${orderData.orderNumber}`;
  
  return {
    subject: `🎨 Customer Uploaded Artwork - Order #${orderData.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Uploaded Artwork</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #f1f3f5; border-bottom: 1px solid #e9ecef; padding: 30px 20px; text-align: center;">
      <h1 style="color: #1a1a1a; margin: 0; font-size: 22px; font-weight: 600;">
        🎨 Customer Uploaded Artwork
      </h1>
      <p style="color: #4b5563; margin: 10px 0 0 0; font-size: 16px; font-weight: 400;">
        Order #${orderData.orderNumber}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #1a1a1a; font-weight: 400;">
          A customer has uploaded artwork for their order. This was an order where they initially skipped the artwork upload.
        </p>
      </div>

      <!-- Order Details -->
      <div style="background: #ffffff; border: 1px solid #e9ecef; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Order Number:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Customer:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${orderData.customerName || orderData.customerEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Email:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${orderData.customerEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Product:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${itemData.productName || 'Custom Sticker'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">Upload Time:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${adminPanelUrl}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          View Order & Artwork
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f1f3f5; border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 400;">
        Internal Notification - Sticker Shuttle Admin
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 400;">
        This email was sent to ${adminEmail} regarding order #${orderData.orderNumber}
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

// Send notification when customer uploads artwork
const sendCustomerArtworkUploadNotification = async (orderData, itemData) => {
  try {
    const adminEmail = 'orbit@stickershuttle.com';
    
    // Normalize order data
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      customerName: `${orderData.customer_first_name || orderData.customerFirstName || ''} ${orderData.customer_last_name || orderData.customerLastName || ''}`.trim() || orderData.customer_email || orderData.customerEmail,
      totalPrice: orderData.total_price || orderData.totalPrice || 0
    };
    
    console.log(`📧 Sending artwork upload notification for order ${normalizedOrderData.orderNumber}`);
    
    const template = getCustomerArtworkUploadTemplate(normalizedOrderData, itemData);
    const result = await sendEmail(adminEmail, template.subject, template.html);
    
    if (result.success) {
      console.log(`✅ Artwork upload notification sent to admin for order ${normalizedOrderData.orderNumber}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending artwork upload notification:', error);
    return { success: false, error: error.message };
  }
};

// Thank you email template for first-time customers (12 hours after order)
const getFirstOrderThankYouTemplate = (orderData) => {
  // Extract first name from order data
  const firstName = orderData.customerFirstName || 
                   orderData.customer_first_name || 
                   orderData.firstName || 
                   (orderData.customerEmail ? orderData.customerEmail.split('@')[0] : 'friend');

  return {
    subject: `Thank you for your support, ${firstName}!`,
    html: `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; font-size: 16px; color: #000; line-height: 1.6; background: #fff; margin: 0; padding: 0;">
    <div style="padding: 0 20px;">
      <p>Hi ${firstName},</p>

      <p>
        We seriously value every one of our customers, so I wanted to send a quick note to say thank you for supporting our business.
      </p>

      <p>
        Sometimes it can feel like a lot running a small business, but every time an order comes through like yours it makes it that much easier! :)
      </p>

      <p>
        If you have any questions before your order arrives, please reach out. We're always happy to help in any way we can.
      </p>

      <p>
        We hope to make more for you soon!
      </p>

      <p>
        Thanks,<br />
        Justin Fowler<br />
        Owner @ Sticker Shuttle<br />
        <a href="https://www.stickershuttle.com" style="color: #000;">www.stickershuttle.com</a>
      </p>
    </div>
  </body>
</html>
    `
  };
};

// Schedule a thank you email for first-time customers (12 hours after order)
const scheduleFirstOrderThankYou = async (orderData) => {
  try {
    // Normalize order data
    const normalizedOrderData = {
      orderNumber: orderData.order_number || orderData.orderNumber || orderData.id || 'N/A',
      customerEmail: orderData.customer_email || orderData.customerEmail || orderData.guest_email || orderData.guestEmail,
      customerFirstName: orderData.customer_first_name || orderData.customerFirstName || orderData.firstName,
      totalPrice: orderData.total_price || orderData.totalPrice || 0
    };

    if (!normalizedOrderData.customerEmail) {
      console.log('❌ No customer email found for scheduled thank you email');
      return { success: false, error: 'No customer email' };
    }

    // Get database client
    const supabaseClient = require('./supabase-client');
    const client = supabaseClient.getServiceClient();

    // Check if we've already scheduled this email in the database
    const { data: existingEmail, error: checkError } = await client
      .from('thank_you_email_tracking')
      .select('id, email_status')
      .eq('customer_email', normalizedOrderData.customerEmail)
      .eq('order_number', normalizedOrderData.orderNumber)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('❌ Error checking existing thank you email:', checkError);
      return { success: false, error: 'Database error checking existing email' };
    }

    if (existingEmail) {
      console.log(`⏰ Thank you email already scheduled for ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber} (status: ${existingEmail.email_status})`);
      return { success: true, message: 'Already scheduled' };
    }

    // Insert tracking record
    const { error: insertError } = await client
      .from('thank_you_email_tracking')
      .insert({
        customer_email: normalizedOrderData.customerEmail,
        order_number: normalizedOrderData.orderNumber,
        order_id: orderData.id || null,
        email_status: 'scheduled'
      });

    if (insertError) {
      console.error('❌ Error inserting thank you email tracking record:', insertError);
      return { success: false, error: 'Database error inserting tracking record' };
    }

    console.log(`⏰ Scheduling thank you email for ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber} (12 hours from now)`);

    // Schedule the email for 12 hours from now
    const delayMs = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    
    setTimeout(async () => {
      try {
        console.log(`📧 Sending scheduled thank you email to ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber}`);
        
        const template = getFirstOrderThankYouTemplate(normalizedOrderData);
        const result = await sendEmail(normalizedOrderData.customerEmail, template.subject, template.html);
        
        // Update tracking record in database
        try {
          const { error: updateError } = await client
            .from('thank_you_email_tracking')
            .update({
              sent_at: new Date().toISOString(),
              email_status: result.success ? 'sent' : 'failed'
            })
            .eq('customer_email', normalizedOrderData.customerEmail)
            .eq('order_number', normalizedOrderData.orderNumber);

          if (updateError) {
            console.error('❌ Error updating thank you email tracking record:', updateError);
          }
        } catch (dbError) {
          console.error('❌ Database error updating thank you email tracking:', dbError);
        }
        
        if (result.success) {
          console.log(`✅ Scheduled thank you email sent successfully to ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber}`);
        } else {
          console.error(`❌ Scheduled thank you email failed for ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending scheduled thank you email to ${normalizedOrderData.customerEmail}, order ${normalizedOrderData.orderNumber}:`, error);
        
        // Update tracking record to failed
        try {
          await client
            .from('thank_you_email_tracking')
            .update({
              sent_at: new Date().toISOString(),
              email_status: 'failed'
            })
            .eq('customer_email', normalizedOrderData.customerEmail)
            .eq('order_number', normalizedOrderData.orderNumber);
        } catch (dbError) {
          console.error('❌ Database error updating failed thank you email tracking:', dbError);
        }
      }
    }, delayMs);

    return { success: true, message: 'Thank you email scheduled for 12 hours' };
  } catch (error) {
    console.error('❌ Error scheduling thank you email:', error);
    return { success: false, error: error.message };
  }
};

// Add contact to Resend audience
const addContactToResendAudience = async (email, firstName = '', lastName = '', audienceId = null) => {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    // Use default "General" audience if no specific audience ID provided
    // You can get your audience ID from the Resend dashboard
    const targetAudienceId = audienceId || process.env.RESEND_GENERAL_AUDIENCE_ID;
    
    if (!targetAudienceId) {
      console.error('❌ No Resend audience ID configured');
      return { success: false, error: 'Resend audience ID not configured' };
    }

    console.log('📧 Adding contact to Resend audience:', {
      email,
      firstName,
      lastName,
      audienceId: targetAudienceId
    });

    // Create/add contact to Resend audience
    const response = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        first_name: firstName || '',
        last_name: lastName || '',
        audience_id: targetAudienceId,
        unsubscribed: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Resend API error:', errorData);
      
      // If contact already exists, try to update instead
      if (response.status === 409 || (errorData.message && errorData.message.includes('already exists'))) {
        console.log('📧 Contact already exists, attempting to update...');
        return await updateContactInResendAudience(email, firstName, lastName, targetAudienceId);
      }
      
      throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Contact added to Resend audience successfully:', result.id);
    return { success: true, contactId: result.id };
    
  } catch (error) {
    console.error('❌ Error adding contact to Resend audience:', error);
    return { success: false, error: error.message };
  }
};

// Update existing contact in Resend audience
const updateContactInResendAudience = async (email, firstName = '', lastName = '', audienceId) => {
  try {
    console.log('📧 Updating existing contact in Resend audience...');
    
    // First, get the contact by email to get their ID
    const searchResponse = await fetch(`https://api.resend.com/contacts?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to find contact: ${searchResponse.statusText}`);
    }

    const searchResult = await searchResponse.json();
    if (!searchResult.data || searchResult.data.length === 0) {
      throw new Error('Contact not found for update');
    }

    const contactId = searchResult.data[0].id;

    // Update the contact
    const updateResponse = await fetch(`https://api.resend.com/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName || '',
        last_name: lastName || '',
        audience_id: audienceId,
        unsubscribed: false
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Resend update error: ${errorData.message || updateResponse.statusText}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Contact updated in Resend audience successfully:', contactId);
    return { success: true, contactId: contactId };
    
  } catch (error) {
    console.error('❌ Error updating contact in Resend audience:', error);
    return { success: false, error: error.message };
  }
};

// Bulk sync all existing users to Resend audience
const bulkSyncUsersToResendAudience = async (audienceId = null) => {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    // Use default "General" audience if no specific audience ID provided
    const targetAudienceId = audienceId || process.env.RESEND_GENERAL_AUDIENCE_ID;
    
    if (!targetAudienceId) {
      console.error('❌ No Resend audience ID configured');
      return { success: false, error: 'Resend audience ID not configured' };
    }

    console.log('🔄 Starting bulk sync of all users to Resend audience...');

    // Get database client
    const supabaseClient = require('./supabase-client');
    const client = supabaseClient.getServiceClient();

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await client.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return { success: false, error: 'Failed to fetch users from auth' };
    }

    // Get all user profiles to get names
    const { data: userProfiles, error: profileError } = await client
      .from('user_profiles')
      .select('user_id, first_name, last_name');

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError);
      // Continue without names if profiles fail
    }

    // Create a map of user profiles for quick lookup
    const profileMap = {};
    if (userProfiles) {
      userProfiles.forEach(profile => {
        profileMap[profile.user_id] = {
          firstName: profile.first_name || '',
          lastName: profile.last_name || ''
        };
      });
    }

    console.log(`📊 Found ${authUsers.users.length} users to sync`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process users in batches to avoid rate limiting
    const batchSize = 10;
    const delay = 1000; // 1 second delay between batches

    for (let i = 0; i < authUsers.users.length; i += batchSize) {
      const batch = authUsers.users.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(authUsers.users.length / batchSize)} (${batch.length} users)`);

      // Process batch in parallel
      const batchPromises = batch.map(async (user) => {
        try {
          const profile = profileMap[user.id] || { firstName: '', lastName: '' };
          
          // Extract first name from email if not in profile
          const firstName = profile.firstName || 
                          user.user_metadata?.first_name || 
                          user.email.split('@')[0];
          
          const lastName = profile.lastName || 
                          user.user_metadata?.last_name || 
                          '';

          const result = await addContactToResendAudience(
            user.email, 
            firstName, 
            lastName, 
            targetAudienceId
          );

          if (result.success) {
            successCount++;
            console.log(`✅ Synced: ${user.email}`);
          } else {
            errorCount++;
            console.warn(`⚠️ Failed to sync ${user.email}: ${result.error}`);
            errors.push({ email: user.email, error: result.error });
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error syncing ${user.email}:`, error.message);
          errors.push({ email: user.email, error: error.message });
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < authUsers.users.length) {
        console.log(`⏳ Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`🎉 Bulk sync complete! Success: ${successCount}, Errors: ${errorCount}`);

    return {
      success: true,
      totalUsers: authUsers.users.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // Return first 10 errors to avoid huge responses
    };

  } catch (error) {
    console.error('❌ Error in bulk sync to Resend audience:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions for use in other modules
module.exports = {
  sendEmail,
  sendOrderStatusNotification,
  sendOrderStatusNotificationEnhanced,
  sendProofNotification,
  sendAdminNewOrderNotification,
  sendAdminProofActionNotification,
  sendWelcomeEmail,
  sendWholesaleApprovalEmail,
  sendWholesaleRevocationEmail,
  sendCustomerArtworkUploadNotification,
  sendUserFileUpload,
  addContactToResendAudience,
  updateContactInResendAudience,
  bulkSyncUsersToResendAudience,
  scheduleFirstOrderThankYou,
  isFirstTimeCustomer
}; 