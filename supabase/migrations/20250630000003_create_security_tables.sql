-- Create security events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  alert_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Create view for event counts
CREATE OR REPLACE VIEW security_event_counts AS
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM security_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Add RLS policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert events
CREATE POLICY "service_insert_events" ON security_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Only allow service role to read events
CREATE POLICY "service_read_events" ON security_events
  FOR SELECT TO service_role
  USING (true);

-- Only allow service role to manage alerts
CREATE POLICY "service_manage_alerts" ON security_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant access to service role
GRANT ALL ON security_events TO service_role;
GRANT ALL ON security_alerts TO service_role;
GRANT ALL ON security_event_counts TO service_role; 