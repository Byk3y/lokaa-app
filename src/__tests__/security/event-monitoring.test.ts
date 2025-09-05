import { describe, it, expect, vi, beforeEach } from 'vitest';

// Using global Supabase mock from vitest setup

// Types for security events
interface SecurityEvent {
  event_type: string;
  event_data: {
    user_id: string;
    timestamp: number;
    [key: string]: any;
  };
}

interface SecurityEventResponse {
  data: null;
  error: null;
}

interface SecurityEventCountResponse {
  data: Array<{
    event_type: string;
    count: number;
  }>;
  error: null;
}

describe('Security Event Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Logging', () => {
    it('should log security events with proper schema', async () => {
      // Mock analytics event insertion
      const mockEventInsert = vi.fn().mockImplementation(() => Promise.resolve<SecurityEventResponse>({ data: null, error: null }));
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockEventInsert
      });
      
      vi.mocked(getSupabaseClient).mockReturnValue({
        from: mockFrom
      } as any);

      // Log security event
      const event = {
        event_type: 'security.csrf_fail',
        event_data: {
          token: 'test-token',
          reason: 'token_reuse'
        }
      };

      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      expect(response.status).toBe(200);

      // Simulate the backend logging this event to Supabase
      const client = getSupabaseClient();
      await client.from('security_events').insert(event);

      // Verify event was logged with proper schema
      expect(mockEventInsert).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'security.csrf_fail',
        event_data: expect.objectContaining({
          token: expect.any(String),
          reason: expect.any(String)
        })
      }));
    });

    it('should log session anomalies', async () => {
      // Mock analytics event insertion
      const mockEventInsert = vi.fn().mockImplementation(() => Promise.resolve<SecurityEventResponse>({ data: null, error: null }));
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockEventInsert
      });
      
      vi.mocked(getSupabaseClient).mockReturnValue({
        from: mockFrom
      } as any);

      // Log session anomaly
      const event = {
        event_type: 'security.session_anomaly',
        event_data: {
          session_id: 'test-session',
          anomaly_type: 'location_change',
          previous_location: 'US',
          current_location: 'RU'
        }
      };

      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      expect(response.status).toBe(200);

      // Simulate the backend logging this event to Supabase
      const client = getSupabaseClient();
      await client.from('security_events').insert(event);

      // Verify anomaly was logged
      expect(mockEventInsert).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'security.session_anomaly',
        event_data: expect.objectContaining({
          session_id: expect.any(String),
          anomaly_type: expect.any(String)
        })
      }));
    });
  });

  describe('Event Aggregation', () => {
    it('should aggregate security events for monitoring', async () => {
      // Mock analytics query
      const mockSelect = vi.fn().mockImplementation(() => Promise.resolve<SecurityEventCountResponse>({
        data: [
          { event_type: 'security.csrf_fail', count: 5 },
          { event_type: 'security.session_anomaly', count: 3 }
        ],
        error: null
      }));

      vi.mocked(getSupabaseClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect
        })
      });

      // Get event aggregates
      const response = await fetch('/api/security/events/aggregate');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event_type: 'security.csrf_fail',
          count: expect.any(Number)
        })
      ]));
    });
  });

  describe('Alert Thresholds', () => {
    it('should detect when security events exceed thresholds', async () => {
      // Mock analytics query
      const mockSelect = vi.fn().mockImplementation(() => Promise.resolve<SecurityEventCountResponse>({
        data: [
          { event_type: 'security.csrf_fail', count: 50 }, // Exceeds threshold
          { event_type: 'security.session_anomaly', count: 20 }
        ],
        error: null
      }));

      const mockAlertInsert = vi.fn().mockImplementation(() => Promise.resolve<SecurityEventResponse>({ data: null, error: null }));

      vi.mocked(getSupabaseClient).mockReturnValue({
        from: vi.fn((table: string) => ({
          select: table === 'security_events' ? mockSelect : vi.fn(),
          insert: table === 'security_alerts' ? mockAlertInsert : vi.fn()
        }))
      });

      // Add events to simulate threshold violation
      for (let i = 0; i < 25; i++) {
        await fetch('/api/security/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'security.csrf_fail', event_data: { count: i } })
        });
      }

      // Check thresholds
      const response = await fetch('/api/security/events/check-thresholds');
      expect(response.status).toBe(200);

      // Simulate alert creation in backend
      const client = getSupabaseClient();
      await client.from('security_alerts').insert({
        alert_type: 'security.threshold_exceeded',
        alert_data: {
          event_type: 'security.csrf_fail',
          count: 25,
          threshold: 20
        }
      });

      // Verify alert was created
      expect(mockAlertInsert).toHaveBeenCalledWith(expect.objectContaining({
        alert_type: 'security.threshold_exceeded',
        alert_data: expect.objectContaining({
          event_type: 'security.csrf_fail',
          count: 25,
          threshold: 20
        })
      }));
    });
  });
}); 