-- Create email analytics table for tracking email performance
-- This will help measure the effectiveness of welcome emails and other campaigns

CREATE TABLE IF NOT EXISTS public.email_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type text NOT NULL, -- 'welcome', 'verification', 'followup', etc.
  variant text NULL, -- For A/B testing
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered boolean NOT NULL DEFAULT false,
  opened_at timestamptz NULL,
  clicked_at timestamptz NULL,
  unsubscribed_at timestamptz NULL,
  bounced_at timestamptz NULL,
  resend_id text NULL, -- Resend email ID for tracking
  entity_ref_id text NULL, -- For tracking specific email instances
  error text NULL, -- Error message if delivery failed
  metadata jsonb NULL, -- Additional tracking data
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_analytics_user_id ON public.email_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_email_type ON public.email_analytics(email_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_sent_at ON public.email_analytics(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_analytics_delivered ON public.email_analytics(delivered);
CREATE INDEX IF NOT EXISTS idx_email_analytics_resend_id ON public.email_analytics(resend_id);

-- RLS policies
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Users can read their own analytics
CREATE POLICY IF NOT EXISTS email_analytics_read_own
  ON public.email_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read/write all (for edge functions)
CREATE POLICY IF NOT EXISTS email_analytics_service_role
  ON public.email_analytics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add metadata column to email_sends table for A/B testing
ALTER TABLE public.email_sends 
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

-- Create view for email performance metrics
CREATE OR REPLACE VIEW public.email_performance_metrics AS
SELECT 
  email_type,
  variant,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE delivered = true) as delivered,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
  COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL) as unsubscribed,
  COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) as bounced,
  ROUND(
    (COUNT(*) FILTER (WHERE delivered = true)::float / COUNT(*)::float) * 100, 2
  ) as delivery_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::float / COUNT(*) FILTER (WHERE delivered = true)::float) * 100, 2
  ) as open_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::float / COUNT(*) FILTER (WHERE delivered = true)::float) * 100, 2
  ) as click_rate
FROM public.email_analytics
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY email_type, variant
ORDER BY email_type, variant;

-- Grant permissions
GRANT SELECT ON public.email_performance_metrics TO authenticated;
GRANT SELECT ON public.email_performance_metrics TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.email_analytics IS 'Tracks email delivery, opens, clicks, and other engagement metrics';
COMMENT ON VIEW public.email_performance_metrics IS 'Aggregated email performance metrics for the last 30 days';



