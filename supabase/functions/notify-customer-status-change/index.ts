import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  old_record?: any
}

interface NotificationPayload {
  customerEmail: string
  customerName: string
  orderNumber: string
  orderStatus: string
  fulfillmentStatus: string
  financialStatus: string
  trackingNumber?: string
  trackingUrl?: string
  orderTotal: number
  orderItems: any[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record, old_record, type } = await req.json() as DatabaseChange

    console.log('📧 Order status change detected:', {
      type,
      orderId: record.id,
      newStatus: record.order_status,
      oldStatus: old_record?.order_status
    })

    // Only process updates where status actually changed
    if (type === 'UPDATE' && 
        record.order_status === old_record?.order_status &&
        record.fulfillment_status === old_record?.fulfillment_status &&
        record.financial_status === old_record?.financial_status) {
      console.log('⏭️ No status change detected, skipping notification')
      return new Response(JSON.stringify({ message: 'No status change' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Skip notifications for certain statuses
    const skipStatuses = ['Awaiting Payment', 'Payment Failed']
    if (skipStatuses.includes(record.order_status)) {
      console.log('⏭️ Skipping notification for status:', record.order_status)
      return new Response(JSON.stringify({ message: 'Status notification skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get order details including items
    const { data: orderWithItems, error: orderError } = await supabaseClient
      .from('orders_main')
      .select(`
        *,
        order_items_new(*)
      `)
      .eq('id', record.id)
      .single()

    if (orderError || !orderWithItems) {
      throw new Error(`Failed to fetch order details: ${orderError?.message}`)
    }

    // Prepare notification payload
    const notificationPayload: NotificationPayload = {
      customerEmail: orderWithItems.customer_email,
      customerName: `${orderWithItems.customer_first_name || ''} ${orderWithItems.customer_last_name || ''}`.trim(),
      orderNumber: orderWithItems.order_number || orderWithItems.id,
      orderStatus: record.order_status,
      fulfillmentStatus: record.fulfillment_status,
      financialStatus: record.financial_status,
      trackingNumber: record.tracking_number,
      trackingUrl: record.tracking_url,
      orderTotal: parseFloat(orderWithItems.total_price || '0'),
      orderItems: orderWithItems.order_items_new || []
    }

    // Send email notification
    const emailResult = await sendStatusUpdateEmail(notificationPayload)
    
    // Discord notifications temporarily disabled
    const discordResult = { success: true, message: 'Discord notifications disabled' }
    
    console.log('✅ Notifications sent:', {
      orderId: record.id,
      customerEmail: notificationPayload.customerEmail,
      status: record.order_status,
      emailSent: emailResult.success,
      discordSent: discordResult.success
    })

    return new Response(
      JSON.stringify({ 
        message: 'Notification sent successfully',
        orderId: record.id,
        status: record.order_status,
        emailSent: emailResult.success
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error sending notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendStatusUpdateEmail(payload: NotificationPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const emailService = Deno.env.get('EMAIL_SERVICE') || 'resend' // Default to Resend
    
    if (emailService === 'resend') {
      return await sendResendEmail(payload)
    } else if (emailService === 'sendgrid') {
      return await sendSendGridEmail(payload)
    } else {
      throw new Error(`Unknown email service: ${emailService}`)
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return { success: false, message: error.message }
  }
}

async function sendResendEmail(payload: NotificationPayload): Promise<{ success: boolean; message?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is required')
  }

  const subject = getEmailSubject(payload.orderStatus, payload.orderNumber)
  const htmlContent = generateEmailHtml(payload)

  const emailData = {
    from: 'Sticker Shuttle <orbit@stickershuttle.com>',
    to: [payload.customerEmail],
    subject: subject,
    html: htmlContent,
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Resend API error: ${errorData.message}`)
  }

  return { success: true }
}

async function sendSendGridEmail(payload: NotificationPayload): Promise<{ success: boolean; message?: string }> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
  if (!sendGridApiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is required')
  }

  const subject = getEmailSubject(payload.orderStatus, payload.orderNumber)
  const htmlContent = generateEmailHtml(payload)

  const emailData = {
    personalizations: [{
      to: [{ email: payload.customerEmail, name: payload.customerName }],
      subject: subject,
    }],
    from: { 
      email: 'orbit@stickershuttle.com', 
      name: 'Sticker Shuttle' 
    },
    content: [{
      type: 'text/html',
      value: htmlContent,
    }],
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SendGrid API error: ${errorText}`)
  }

  return { success: true }
}

async function sendDiscordNotification(payload: NotificationPayload): Promise<{ success: boolean; message?: string }> {
  const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
  
  if (!discordWebhookUrl) {
    console.log('Discord webhook URL not configured')
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Discord webhook not configured' 
    }), { status: 200 })
  }

  // Security: Log webhook usage without exposing URL
  console.log('📱 Discord webhook notification triggered', {
    orderId: payload.orderNumber,
    hasWebhook: true,
    timestamp: new Date().toISOString()
  })

  try {
    // Create different messages based on order status
    const isNewOrder = payload.orderStatus === 'Awaiting Proof Approval' || payload.orderStatus === 'Creating Proofs'
    
    // Process order items to get detailed product information
    const orderItemsInfo = formatOrderItemsForDiscord(payload.orderItems)
    
    // Check if it's a rush order
    const isRushOrder = payload.orderItems.some(item => 
      item.calculatorSelections?.rush?.value === true || 
      item.calculator_selections?.rush?.value === true
    )
    
    // Create description in your exact format with bold titles
    let description = ''
    if (isNewOrder) {
      description = isRushOrder ? 
        '💸 **Rush Order!**\n\n' : 
        '💸 **New Order!**\n\n'
    } else {
      description = `💸 **Order Update!**\n\n**Status:** ${payload.orderStatus}\n\n`
    }
    
    // Add total
    description += `**Total:** $${payload.orderTotal.toFixed(2)}\n\n`
    
    // Add order items
    description += `**Order Items:**\n${orderItemsInfo.summary}\n\n`
    
    // Add product details with bold titles
    if (orderItemsInfo.detailFields.length > 0) {
      orderItemsInfo.detailFields.forEach(field => {
        description += `**${field.name}**\n${field.value}\n`
      })
      description += '\n'
    }
    
    // Add order info with bold titles
    description += `**Order Number**\n${payload.orderNumber}\n`
    description += `**Customer**\n${payload.customerName || "N/A"}\n`
    description += `**Email**\n${payload.customerEmail}\n`
    description += `**Time**\n${new Date().toLocaleString()}`
    
    const discordMessage = {
      embeds: [{
        description: description,
        color: isNewOrder ? (isRushOrder ? 0xff6600 : 0x00ff00) : getStatusColor(payload.orderStatus)
      }],
      components: [{
        type: 1, // Action Row
        components: [{
          type: 2, // Button
          style: 5, // Link style
          label: "View Order in Admin",
          url: `https://stickershuttle.vercel.app/admin/orders/${payload.orderNumber}`
        }]
      }]
    }

    // Add tracking info if available (append to description)
    if (payload.trackingNumber) {
      discordMessage.embeds[0].description += `\n**Tracking**\n${payload.trackingNumber}`
    }

    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage)
    })

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`)
    }

    console.log('✅ Discord notification sent successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Discord notification failed:', error)
    return { success: false, message: error.message }
  }
}

function formatOrderItemsForDiscord(orderItems: any[]) {
  if (!orderItems || orderItems.length === 0) {
    return {
      summary: "No items found",
      detailFields: []
    }
  }

  const summary = orderItems.map((item, index) => {
    const productName = item.productName || item.name || 'Custom Stickers'
    
    // Get sticker type from product category or name
    let stickerType = 'Vinyl Stickers' // default
    if (item.productCategory) {
      const category = item.productCategory.toLowerCase()
      if (category.includes('holographic')) stickerType = 'Holographic Stickers'
      else if (category.includes('chrome')) stickerType = 'Chrome Stickers'
      else if (category.includes('glitter')) stickerType = 'Glitter Stickers'
      else if (category.includes('clear')) stickerType = 'Clear Stickers'
      else if (category.includes('banner')) stickerType = 'Vinyl Banner'
      else if (category.includes('sheet')) stickerType = 'Sticker Sheets'
    }
    
    return `• ${stickerType}`
  }).join('\n')

  // Create detail fields for first item in the order you specified
  const firstItem = orderItems[0]
  const firstSelections = firstItem.calculatorSelections || firstItem.calculator_selections || {}
  
  const detailFields: any[] = []
  
  // 1. Quantity (under order items)
  const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
  detailFields.push({
    name: "Quantity", 
    value: `${totalQuantity} pieces`, 
    inline: true
  })
  
  // 2. Size (under quantity)
  if (firstSelections.size) {
    const sizeValue = firstSelections.size.displayValue || firstSelections.size.value ||
                     (firstSelections.size.width && firstSelections.size.height ? 
                      `${firstSelections.size.width}" × ${firstSelections.size.height}"` : null)
    if (sizeValue) {
      detailFields.push({
        name: "Size", 
        value: sizeValue, 
        inline: true
      })
    }
  }
  
  // 3. Cut (under size)
  if (firstSelections.cut) {
    detailFields.push({
      name: "Cut", 
      value: firstSelections.cut.displayValue || firstSelections.cut.value, 
      inline: true
    })
  }
  
  // 4. Material (then the rest)
  if (firstSelections.material) {
    detailFields.push({
      name: "Material", 
      value: firstSelections.material.displayValue || firstSelections.material.value, 
      inline: true
    })
  }

  return {
    summary: summary.length > 0 ? summary : "Custom order items",
    detailFields
  }
}

function getStatusEmoji(status: string): string {
  const emojiMap: { [key: string]: string } = {
    'Creating Proofs': '📐',
    'Awaiting Proof Approval': '👀',
    'Proofs Approved': '✅',
    'In Production': '🏭',
    'Ready to Ship': '📦',
    'Shipped': '🚚',
    'Out for Delivery': '📍',
    'Delivered': '🎉',
    'Cancelled': '❌',
    'Refunded': '💰'
  }
  return emojiMap[status] || '📋'
}

function getStatusColor(status: string): number {
  const colorMap: { [key: string]: number } = {
    'Creating Proofs': 0x3498db,        // Blue
    'Awaiting Proof Approval': 0xf39c12, // Orange
    'Proofs Approved': 0x2ecc71,       // Green
    'In Production': 0x9b59b6,         // Purple
    'Ready to Ship': 0x1abc9c,         // Teal
    'Shipped': 0x27ae60,               // Dark Green
    'Out for Delivery': 0xf1c40f,      // Yellow
    'Delivered': 0x2ecc71,             // Green
    'Cancelled': 0xe74c3c,             // Red
    'Refunded': 0x95a5a6               // Gray
  }
  return colorMap[status] || 0x34495e  // Default dark gray
}

function getEmailSubject(orderStatus: string, orderNumber: string): string {
  const statusMap: { [key: string]: string } = {
    'Creating Proofs': `📐 Your design proofs are being created - Order ${orderNumber}`,
    'Awaiting Proof Approval': `👀 Please review your design proofs - Order ${orderNumber}`,
    'Proofs Approved': `✅ Proofs approved! Your order is now in production - Order ${orderNumber}`,
    'In Production': `🏭 Your stickers are now in production - Order ${orderNumber}`,
    'Ready to Ship': `📦 Your order is packed and ready to ship - Order ${orderNumber}`,
    'Shipped': `🚚 Your order has shipped! - Order ${orderNumber}`,
    'Out for Delivery': `📍 Your order is out for delivery - Order ${orderNumber}`,
    'Delivered': `🎉 Your order has been delivered! - Order ${orderNumber}`,
    'Cancelled': `❌ Order cancelled - Order ${orderNumber}`,
    'Refunded': `💰 Order refunded - Order ${orderNumber}`,
  }

  return statusMap[orderStatus] || `📋 Order update - Order ${orderNumber}`
}

function generateEmailHtml(payload: NotificationPayload): string {
  const statusMessage = getStatusMessage(payload.orderStatus, payload.fulfillmentStatus)
  const trackingSection = payload.trackingNumber ? `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin: 0 0 10px 0;">📦 Tracking Information</h3>
      <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${payload.trackingNumber}</p>
      ${payload.trackingUrl ? `<p style="margin: 10px 0;"><a href="${payload.trackingUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Package</a></p>` : ''}
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - ${payload.orderNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #007bff;">
        <h1 style="color: #007bff; margin: 0;">Sticker Shuttle</h1>
        <p style="color: #666; margin: 5px 0;">Custom Stickers & Printing</p>
      </div>

      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Hi ${payload.customerName || 'there'}! 👋</h2>
        
        <p>We have an update on your order <strong>${payload.orderNumber}</strong>:</p>
        
        <div style="background-color: #e7f3ff; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">📋 Order Status Update</h3>
          <p style="font-size: 18px; margin: 0;"><strong>${payload.orderStatus}</strong></p>
          <p style="margin: 10px 0 0 0; color: #666;">${statusMessage}</p>
        </div>

        ${trackingSection}

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0;">📋 Order Summary</h3>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${payload.orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Order Total:</strong> $${payload.orderTotal.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Items:</strong> ${payload.orderItems.length} item${payload.orderItems.length !== 1 ? 's' : ''}</p>
        </div>

        ${payload.orderStatus === 'Delivered' ? `
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #155724; margin: 0 0 15px 0;">🌟 Love your stickers?</h3>
          <p style="margin: 0 0 15px 0;">We'd love to see how you use them! Tag us <strong>@stickershuttleco</strong> on social media.</p>
          <p style="margin: 0;"><a href="mailto:hello@stickershuttle.com" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave us a review!</a></p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://stickershuttle.com/account/dashboard" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Orders</a>
        </div>

        <p>Questions about your order? Just reply to this email or contact us at <a href="mailto:orbit@stickershuttle.com">orbit@stickershuttle.com</a></p>

        <p>Thanks for choosing Sticker Shuttle! 🚀</p>
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>Sticker Shuttle - Custom Stickers & Printing</p>
        <p>📧 orbit@stickershuttle.com | 🌐 <a href="https://stickershuttle.com">stickershuttle.com</a></p>
      </div>
    </body>
    </html>
  `
}

function getStatusMessage(orderStatus: string, fulfillmentStatus: string): string {
  const messages: { [key: string]: string } = {
    'Creating Proofs': 'Our design team is creating digital proofs of your custom stickers. You\'ll receive them for approval soon!',
    'Awaiting Proof Approval': 'Your design proofs are ready! Please check your email and approve them so we can start production.',
    'Proofs Approved': 'Thanks for approving your proofs! Your order is now moving into our production queue.',
    'In Production': 'Your stickers are currently being printed with love and care. This typically takes 1-3 business days.',
    'Ready to Ship': 'Your order is complete and packed! It will be shipped within the next business day.',
    'Shipped': 'Your package is on its way to you! Use the tracking information above to monitor its progress.',
    'Out for Delivery': 'Great news! Your package is out for delivery and should arrive today.',
    'Delivered': 'Your order has been successfully delivered! We hope you love your new stickers.',
    'Cancelled': 'Your order has been cancelled. If you have any questions, please contact our support team.',
    'Refunded': 'Your order has been refunded. The refund should appear in your account within 5-10 business days.',
  }

  return messages[orderStatus] || 'Your order status has been updated. Contact us if you have any questions!'
} 