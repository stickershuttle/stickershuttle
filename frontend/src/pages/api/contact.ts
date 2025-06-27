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

  try {
    // Check if we have Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return res.status(500).json({ 
        success: false, 
        message: 'Email service not configured' 
      });
    }

    // Format the email content
    const subjectMap: Record<string, string> = {
      'concern': 'Customer Concern',
      'order-issue': 'Order Issue',
      'design-help': 'Design Help Request',
      'shipping': 'Shipping Question',
      'billing': 'Billing Question',
      'technical': 'Technical Support',
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      throw new Error(`Email service error: ${errorData.message}`);
    }

    const result = await response.json();
    console.log('Contact form email sent successfully:', result.id);

    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully!' 
    });

  } catch (error) {
    console.error('Error sending contact form email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send message. Please try again later.' 
    });
  }
} 