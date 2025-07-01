import { getSupabaseClient } from '@/integrations/supabase/client';
import { NextApiRequest, NextApiResponse } from 'next';

// Security event thresholds
const EVENT_THRESHOLDS = {
  'security.csrf_fail': 20,
  'security.session_anomaly': 10,
  'security.token_reuse': 5
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get event counts
    const { data: events, error: countError } = await getSupabaseClient()
      .from('security_events')
      .select('event_type, count')
      .throwOnError();

    if (countError) {
      console.error('Failed to get event counts:', countError);
      return res.status(500).json({ error: 'Failed to get event counts' });
    }

    // Check thresholds and create alerts
    const alerts = [];
    for (const event of events) {
      const threshold = EVENT_THRESHOLDS[event.event_type];
      if (threshold && event.count > threshold) {
        // Create alert
        const { error: alertError } = await getSupabaseClient()
          .from('security_alerts')
          .insert({
            alert_type: 'security.threshold_exceeded',
            alert_data: {
              event_type: event.event_type,
              count: event.count,
              threshold
            }
          });

        if (alertError) {
          console.error('Failed to create alert:', alertError);
          continue;
        }

        alerts.push({
          event_type: event.event_type,
          count: event.count,
          threshold
        });
      }
    }

    return res.status(200).json({ alerts });
  } catch (error) {
    console.error('Error checking thresholds:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 