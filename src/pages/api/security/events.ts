import { getSupabaseClient } from '@/integrations/supabase/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event_type, event_data } = req.body;

    // Validate required fields
    if (!event_type || !event_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Add timestamp and user_id if not provided
    const enrichedData = {
      ...event_data,
      timestamp: event_data.timestamp || Date.now(),
      user_id: event_data.user_id || req.headers['x-user-id'] || 'anonymous'
    };

    // Insert security event
    const { error } = await getSupabaseClient()
      .from('security_events')
      .insert({
        event_type,
        event_data: enrichedData
      });

    if (error) {
      console.error('Failed to log security event:', error);
      return res.status(500).json({ error: 'Failed to log security event' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling security event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 