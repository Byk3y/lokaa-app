import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get event counts grouped by type
    const { data, error } = await getSupabaseClient()
      .from('security_events')
      .select('event_type, count')
      .throwOnError();

    if (error) {
      log.error('Page', 'Failed to aggregate security events:', error);
      return res.status(500).json({ error: 'Failed to aggregate security events' });
    }

    return res.status(200).json(data);
  } catch (error) {
    log.error('Page', 'Error aggregating security events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 