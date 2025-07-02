// Email notification system using Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Sticker Shuttle <orbit@stickershuttle.com>';
const REPLY_TO_EMAIL = 'orbit@stickershuttle.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stickershuttle.com';

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
<body style="margin: 0; padding: 20px; background-color: #030140; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">
        ${statusInfo.emoji} ${statusInfo.title}
      </h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
        Order #${orderData.orderNumber}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
          ${statusInfo.message}
        </p>
      </div>

      <!-- Order Details -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Number:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Status:</td>
            <td style="padding: 8px 0; color: ${statusInfo.color}; font-weight: 600;">${newStatus}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Total:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">$${orderData.totalPrice?.toFixed(2) || 'N/A'}</td>
          </tr>
          ${(newStatus === 'Shipped' || newStatus === 'Delivered') && orderData.trackingNumber ? `
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Tracking:</td>
            <td style="padding: 8px 0;">
              <a href="${orderData.trackingUrl || '#'}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
                ${orderData.trackingNumber}
              </a>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 30px;">
        ${newStatus === 'Building Proof' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          View Order Details
        </a>
        ` : ''}
        
        ${newStatus === 'Proof Sent' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(255, 215, 19, 0.6) 0%, rgba(255, 215, 19, 0.4) 50%, rgba(255, 215, 19, 0.7) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(255, 215, 19, 0.4); box-shadow: rgba(255, 215, 19, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          Review Proof
        </a>
        ` : ''}
        
        ${newStatus === 'Printing' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          View Order Details
        </a>
        ` : ''}
        
        ${(newStatus === 'Shipped' && orderData.trackingNumber) ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          View Order Details
        </a>
        <a href="${orderData.trackingUrl || '#'}" style="display: inline-block; background: linear-gradient(135deg, rgba(255, 215, 19, 0.6) 0%, rgba(255, 215, 19, 0.4) 50%, rgba(255, 215, 19, 0.7) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(255, 215, 19, 0.4); box-shadow: rgba(255, 215, 19, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          Track Package
        </a>
        ` : (newStatus === 'Shipped' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          View Order Details
        </a>
        ` : '')}
        
        ${newStatus === 'Delivered' ? `
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          View Order Details
        </a>
        ` : ''}
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
          Questions about your order?
        </p>
        <a href="${FRONTEND_URL}/contact" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
        Thank you for choosing Sticker Shuttle!
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
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

// Send email function
const sendEmail = async (to, subject, html) => {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
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
<body style="margin: 0; padding: 20px; background-color: #030140; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">
        ${template.emoji} ${template.title}
      </h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
        Order #${orderData.orderNumber}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-left: 4px solid ${template.color}; padding: 20px; margin-bottom: 30px; border-radius: 12px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
          ${template.message}
        </p>
      </div>

      <!-- Order Details -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Number:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Customer:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${orderData.customerName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${orderData.customerEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Total:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">$${orderData.totalPrice?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Status:</td>
            <td style="padding: 8px 0; color: ${template.color}; font-weight: 600;">${orderData.orderStatus || 'Processing'}</td>
          </tr>
          ${type === 'proof_changes_requested' && extraData.customerNotes ? `
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Customer Notes:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${extraData.customerNotes}</td>
          </tr>
          ` : ''}
          ${orderData.calculatorSelections ? `
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Product Details:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${orderData.calculatorSelections}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${adminPanelUrl}" style="display: inline-block; background: linear-gradient(135deg, rgba(${template.buttonColor === '#10B981' ? '16, 185, 129' : '245, 158, 11'}, 0.6) 0%, rgba(${template.buttonColor === '#10B981' ? '16, 185, 129' : '245, 158, 11'}, 0.4) 50%, rgba(${template.buttonColor === '#10B981' ? '16, 185, 129' : '245, 158, 11'}, 0.7) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(${template.buttonColor === '#10B981' ? '16, 185, 129' : '245, 158, 11'}, 0.4); box-shadow: rgba(${template.buttonColor === '#10B981' ? '16, 185, 129' : '245, 158, 11'}, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 0 10px 10px 0;">
          ${template.buttonText}
        </a>
      </div>


    </div>

    <!-- Footer -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
        Admin Notification - Sticker Shuttle
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
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
<body style="margin: 0; padding: 20px; background-color: #030140; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh;">
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
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
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
    const { getSupabaseServiceClient } = require('./supabase-client');
    const client = getSupabaseServiceClient();
    
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
    
    return orderCount <= 1; // First-time if this is their first paid order
  } catch (error) {
    console.error('❌ Error in isFirstTimeCustomer:', error);
    return true; // Default to first-time if error
  }
};

// Welcome email template for first-time customers
const getWelcomeEmailTemplate = (orderData) => {
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
<body style="margin: 0; padding: 20px; background-color: #030140; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
        🎉 Welcome to Sticker Shuttle!
      </h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 18px;">
        Your first order is confirmed!
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 20px;">
      <!-- Welcome Message -->
      <div style="background: linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%); border: 1px solid rgba(147, 51, 234, 0.3); padding: 25px; margin-bottom: 30px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0 0 15px 0; color: #ffffff; font-size: 22px;">Thank you for choosing us! 🚀</h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
          We're thrilled to have you as part of the Sticker Shuttle family! Your order <strong>#${orderData.orderNumber}</strong> has been confirmed and we're already working on making your custom stickers perfect.
        </p>
      </div>

      <!-- What Happens Next -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 25px; margin-bottom: 30px; border-radius: 12px;">
        <h3 style="margin: 0 0 20px 0; color: #ffffff; font-size: 20px;">What happens next?</h3>
        <div style="space-y: 15px;">
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px; flex-shrink: 0;">1</div>
            <div>
              <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">We create your digital proof</h4>
              <p style="margin: 0; color: #d1d5db; font-size: 14px;">Our design team will create a digital proof of your stickers for your review (usually within 24 hours).</p>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px; flex-shrink: 0;">2</div>
            <div>
              <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">You approve the proof</h4>
              <p style="margin: 0; color: #d1d5db; font-size: 14px;">We'll email you when your proof is ready for review. You can approve it or request changes.</p>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start;">
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%); color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px; flex-shrink: 0;">3</div>
            <div>
              <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">We print and ship</h4>
              <p style="margin: 0; color: #d1d5db; font-size: 14px;">Once approved, we'll print your stickers and ship them to you with tracking information.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Details -->
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Number:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">#${orderData.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Order Total:</td>
            <td style="padding: 8px 0; color: #86efac; font-weight: 600;">$${orderData.totalPrice?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #d1d5db; font-weight: 500;">Status:</td>
            <td style="padding: 8px 0; color: #60a5fa; font-weight: 600;">Processing</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${FRONTEND_URL}/account/dashboard" style="display: inline-block; background: linear-gradient(135deg, rgba(147, 51, 234, 0.6) 0%, rgba(147, 51, 234, 0.4) 50%, rgba(147, 51, 234, 0.7) 100%); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(147, 51, 234, 0.4); box-shadow: rgba(147, 51, 234, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Track Your Order
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
          Questions about your order or need help?
        </p>
        <a href="${FRONTEND_URL}/contact" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
          Contact Our Support Team
        </a>
        <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
          We typically respond within a few hours!
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset; backdrop-filter: blur(12px); padding: 20px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 15px;">
        <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" alt="Sticker Shuttle" style="height: 40px; width: auto;" />
      </div>
      
      <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
        Welcome to the Sticker Shuttle family! 🎉
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This email was sent to ${orderData.customerEmail} regarding your first order #${orderData.orderNumber}
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

    // For 'Building Proof' status on new orders, check if customer is first-time
    if (newStatus === 'Building Proof') {
      const isFirstTime = await isFirstTimeCustomer(normalizedOrderData.customerEmail);
      
      if (isFirstTime) {
        console.log(`🎉 First-time customer detected for ${normalizedOrderData.customerEmail}, sending welcome email first`);
        
        // Send welcome email first
        const welcomeTemplate = getWelcomeEmailTemplate(normalizedOrderData);
        const welcomeResult = await sendEmail(normalizedOrderData.customerEmail, welcomeTemplate.subject, welcomeTemplate.html);
        
        if (welcomeResult.success) {
          console.log(`✅ Welcome email sent for order ${normalizedOrderData.orderNumber}`);
          
          // Wait 5 minutes, then send the proof notification
          setTimeout(async () => {
            try {
              console.log(`📧 Sending delayed proof notification for first-time customer order ${normalizedOrderData.orderNumber}`);
              const proofTemplate = getOrderStatusEmailTemplate(normalizedOrderData, 'Building Proof');
              const proofResult = await sendEmail(normalizedOrderData.customerEmail, proofTemplate.subject, proofTemplate.html);
              
              if (proofResult.success) {
                console.log(`✅ Delayed proof notification sent for order ${normalizedOrderData.orderNumber}`);
              } else {
                console.error(`❌ Delayed proof notification failed for order ${normalizedOrderData.orderNumber}:`, proofResult.error);
              }
            } catch (delayedError) {
              console.error('❌ Error in delayed proof notification:', delayedError);
            }
          }, 5 * 60 * 1000); // 5 minutes delay
          
          return welcomeResult;
        } else {
          console.error('❌ Welcome email failed, falling back to standard notification');
          // Fall back to standard notification if welcome email fails
        }
      } else {
        console.log(`🔄 Returning customer detected for ${normalizedOrderData.customerEmail}, sending standard proof notification`);
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
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderStatusNotification,
  sendOrderStatusNotificationEnhanced,
  sendWelcomeEmail,
  isFirstTimeCustomer,
  sendProofNotification,
  sendAdminNewOrderNotification,
  sendAdminProofActionNotification,
  sendEmail,
  sendUserFileUpload
}; 