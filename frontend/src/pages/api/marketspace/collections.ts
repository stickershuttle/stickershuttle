import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Helper function to check if user is authorized (admin or creator)
async function isAuthorized(req: NextApiRequest, supabase: any): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

    // Check if user is admin
    const ADMIN_EMAILS = ['justin@stickershuttle.com'];
    if (ADMIN_EMAILS.includes(user.email || '')) {
      return true;
    }

    // Check if user is a creator
    const { data: creatorData } = await supabase
      .from('creators')
      .select('is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    return !!creatorData?.is_active;
  } catch (error) {
    console.error('Authorization check failed:', error);
    return false;
  }
}

// Server-only Supabase client using service role for RLS-protected writes
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('Supabase env not configured');
  }
  return createClient(url, serviceKey, { db: { schema: 'public' } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getServiceClient();

    if (req.method === 'GET') {
      // Return minimal public fields only
      const { data, error } = await supabase
        .from('creator_collections')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) return res.status(500).json({ error: { code: error.code, message: error.message } });
      return res.status(200).json({ collections: data || [] });
    }

    if (req.method === 'POST') {
      // Check authorization for creating collections
      if (!(await isAuthorized(req, supabase))) {
        return res.status(401).json({ error: { message: 'Unauthorized' } });
      }

      const { name } = req.body as { name?: string };
      if (!name || !name.trim()) return res.status(400).json({ error: { message: 'Name is required' } });

      const { data, error } = await supabase
        .from('creator_collections')
        .insert([{ name: name.trim() }])
        .select('id, name')
        .single();

      if (error) return res.status(500).json({ error: { code: error.code, message: error.message } });
      return res.status(200).json({ collection: data });
    }

    if (req.method === 'DELETE') {
      // Check authorization for deleting collections
      if (!(await isAuthorized(req, supabase))) {
        return res.status(401).json({ error: { message: 'Unauthorized' } });
      }

      const { id } = req.query as { id?: string };
      if (!id) return res.status(400).json({ error: { message: 'Collection ID is required' } });

      const { error } = await supabase
        .from('creator_collections')
        .delete()
        .eq('id', id);

      if (error) return res.status(500).json({ error: { code: error.code, message: error.message } });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end('Method Not Allowed');
  } catch (e: any) {
    return res.status(500).json({ error: { message: e?.message || 'Server error' } });
  }
}


