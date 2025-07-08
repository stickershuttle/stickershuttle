import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, subject, message, relatedOrder } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please fill in all required fields' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email address'
    });
  }

  try {
    console.log('📧 Processing contact form submission:', {
      name,
      email,
      subject,
      relatedOrder: relatedOrder || 'none',
      messageLength: message.length
    });

    // Check if we have Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      return res.status(500).json({ 
        success: false, 
        message: 'Email service is temporarily unavailable. Please try again later or contact us directly.' 
      });
    }

    // Format the email content
    const subjectMap: Record<string, string> = {
      'concern': 'Customer Concern',
      'order-issue': 'Order Issue',
      'proof-concerns': 'Proof Concerns',
      'shipping-delay': 'Shipping Delay',
      'quality-issue': 'Quality Issue',
      'refund-request': 'Refund Request',
      'design-help': 'Design Help Request',
      'billing-question': 'Billing Question',
      'technical-issue': 'Technical Support',
      'product-inquiry': 'Product Inquiry',
      'other': 'General Inquiry'
    };

    const emailSubject = `[Contact Form] ${subjectMap[subject] || subject} - ${name}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #030140; margin-bottom: 20px;">New Contact Form Submission</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #030140;">Contact Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subjectMap[subject] || subject}</p>
          ${relatedOrder ? `<p><strong>Related Order:</strong> ${relatedOrder}</p>` : ''}
        </div>
        
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #030140;">Message</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; font-size: 14px; color: #1565c0;">
          <p style="margin: 0;"><strong>Reply to:</strong> ${email}</p>
          <p style="margin: 5px 0 0 0;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    // Send email using Resend
    const emailData = {
      from: 'Contact Form <noreply@stickershuttle.com>',
      to: ['orbit@stickershuttle.com'],
      reply_to: email,
      subject: emailSubject,
      html: emailContent,
    };

    console.log('🚀 Sending email to Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Resend API response:', responseText);
      throw new Error('Invalid response from email service');
    }

    if (!response.ok) {
      console.error('❌ Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Handle specific Resend API errors
      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please wait a moment and try again.'
        });
      } else if (response.status === 400) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request. Please check your information and try again.'
        });
      } else if (response.status === 401) {
        console.error('❌ Resend API authentication failed');
        return res.status(500).json({
          success: false,
          message: 'Email service authentication failed. Please try again later.'
        });
      }
      
      throw new Error(`Email service error: ${responseData.message || 'Unknown error'}`);
    }

    console.log('✅ Contact form email sent successfully:', responseData.id);

    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully!' 
    });

  } catch (error) {
    console.error('❌ Error sending contact form email:', error);
    
    // Return appropriate error message based on error type
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return res.status(500).json({
          success: false,
          message: 'Unable to connect to email service. Please try again later.'
        });
      } else if (error.message.includes('timeout')) {
        return res.status(500).json({
          success: false,
          message: 'Request timed out. Please try again.'
        });
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send message. Please try again later or contact us directly.' 
    });
  }
} 