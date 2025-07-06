import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, firstName, lastName, audienceId } = req.body;

  // Validate required fields
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Make request to the backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/api/add-to-resend-audience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        audienceId: audienceId || null
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend API error:', errorData);
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Failed to add contact to Resend audience'
      });
    }

    const result = await response.json();
    console.log('Contact added to Resend audience successfully:', result);

    return res.status(200).json({
      success: true,
      message: 'Contact added to Resend audience successfully',
      data: result
    });

  } catch (error) {
    console.error('Error adding contact to Resend audience:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
} 