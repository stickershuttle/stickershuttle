import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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


