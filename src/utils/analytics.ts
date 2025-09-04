import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';
import { useCallback } from 'react';

// Type for analytics event insert
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert'];

// Batching config
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 2000; // ms

let eventQueue: AnalyticsEventInsert[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

// Helper to get user/session/page context
function getDefaultContext(): Partial<AnalyticsEventInsert> {
  let user_id: string | null = null;
  let session_id: string | null = null;
  try {
    // Try to get user/session from localStorage or global state
    user_id = localStorage.getItem('user_id') || null;
    session_id = localStorage.getItem('session_id') || null;
  } catch {}
  return {
    user_id,
    session_id,
    page_url: typeof window !== 'undefined' ? window.location.href : null,
    created_at: new Date().toISOString(),
  };
}

// Core log function
export async function logAnalyticsEvent(event: Omit<AnalyticsEventInsert, 'created_at' | 'user_id' | 'session_id' | 'page_url'> & Partial<Pick<AnalyticsEventInsert, 'ab_experiment' | 'ab_variant' | 'event_data'>>) {
  const context = getDefaultContext();
  const eventRecord: AnalyticsEventInsert = {
    ...context,
    ...event,
    created_at: context.created_at || new Date().toISOString(),
  };
  eventQueue.push(eventRecord);
  if (eventQueue.length >= BATCH_SIZE) {
    flushEventQueue();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(flushEventQueue, BATCH_INTERVAL);
  }
}

// Flush queue to Supabase
async function flushEventQueue() {
  if (eventQueue.length === 0) return;
  const supabase = getSupabaseClient();
  const batch = [...eventQueue];
  eventQueue = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
  try {
    const { error } = await supabase.from('analytics_events').insert(batch);
    if (error) {
      // Optionally: retry or log error
      log.error('Utils', '[Analytics] Failed to insert analytics events:', error);
    }
  } catch (err) {
    log.error('Utils', '[Analytics] Exception during analytics insert:', err);
  }
}

// React hook for logging events
export function useAnalyticsEvent() {
  return useCallback(logAnalyticsEvent, []);
}

// 🎯 [Phase 2] SEO Analytics Functions
export const SEOAnalytics = {
  // Track SEO page views
  trackPageView: (pageType: string, pageUrl: string, keywords?: string[]) => {
    logAnalyticsEvent({
      event_type: 'seo.page_view',
      event_data: {
        page_type: pageType,
        page_url: pageUrl,
        keywords: keywords || [],
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      },
    });
  },

  // Track keyword impressions
  trackKeywordImpression: (keyword: string, position: number, pageUrl: string) => {
    logAnalyticsEvent({
      event_type: 'seo.keyword_impression',
      event_data: {
        keyword,
        position,
        page_url: pageUrl,
        timestamp: new Date().toISOString(),
      },
    });
  },

  // Track click-through rates
  trackClickThrough: (source: string, destination: string, keyword?: string) => {
    logAnalyticsEvent({
      event_type: 'seo.click_through',
      event_data: {
        source,
        destination,
        keyword,
        timestamp: new Date().toISOString(),
      },
    });
  },

  // Track bounce rate
  trackBounce: (pageUrl: string, timeOnPage: number) => {
    logAnalyticsEvent({
      event_type: 'seo.bounce_rate',
      event_data: {
        page_url: pageUrl,
        time_on_page: timeOnPage,
        timestamp: new Date().toISOString(),
      },
    });
  },

  // Track conversions
  trackConversion: (conversionType: string, value?: number, keyword?: string) => {
    logAnalyticsEvent({
      event_type: 'seo.conversion',
      event_data: {
        conversion_type: conversionType,
        value,
        keyword,
        timestamp: new Date().toISOString(),
      },
    });
  },
};

// Expose global API for dev/testing
if (typeof window !== 'undefined') {
  (window as any).analytics = {
    logEvent: logAnalyticsEvent,
    flush: flushEventQueue,
    _queue: eventQueue,
  };
  (window as any).seoAnalytics = SEOAnalytics;
} 