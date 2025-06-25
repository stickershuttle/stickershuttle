import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token_hash, type, next } = req.query;

  if (!token_hash || !type) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the email confirmation token
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token_hash as string,
      type: type as any,
    });

    if (error) {
      console.error('Email verification error:', error);
      return res.redirect(`/login?error=Unable to confirm account. Please try signing up again.`);
    }

    // Success! Redirect to dashboard or specified next page
    const redirectUrl = next ? decodeURIComponent(next as string) : '/account/dashboard';
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('Verification process error:', error);
    return res.redirect(`/login?error=Something went wrong during verification.`);
  }
} 