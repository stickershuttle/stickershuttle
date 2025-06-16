import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Basic auth verification endpoint
    // This can be expanded based on your authentication needs
    res.status(200).json({ 
      message: 'Auth verification endpoint',
      authenticated: false 
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: 'Method not allowed' });
  }
} 