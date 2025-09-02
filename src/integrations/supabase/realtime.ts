import { log } from '@/utils/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

/**
 * Supabase Realtime Module - Lazy loaded for realtime features
 * This module is only loaded when realtime subscriptions are needed
 */

export interface RealtimeOptions {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
}

export interface ChannelOptions {
  params?: {
    eventsPerSecond?: number;
  };
}

/**
 * Create a realtime channel for postgres changes
 */
export function createChannel(name: string, options?: ChannelOptions): RealtimeChannel {
  return getSupabaseClient().channel(name, options);
}

/**
 * Subscribe to postgres changes
 */
export function subscribeToPostgresChanges(
  channel: RealtimeChannel,
  options: RealtimeOptions,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  return channel.on(
    'postgres_changes',
    {
      event: options.event || '*',
      schema: options.schema || 'public',
      table: options.table,
      filter: options.filter
    },
    callback
  );
}

/**
 * Subscribe to channel and handle status
 */
export function subscribeChannel(
  channel: RealtimeChannel,
  onStatus?: (status: string) => void
): RealtimeChannel {
  return channel.subscribe((status) => {
    log.debug('Realtime', `Channel status: ${status}`);
    onStatus?.(status);
  });
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}

/**
 * Remove a channel
 */
export async function removeChannel(channel: RealtimeChannel): Promise<void> {
  await getSupabaseClient().removeChannel(channel);
}

/**
 * Create a presence channel
 */
export function createPresenceChannel(name: string): RealtimeChannel {
  return getSupabaseClient().channel(name, {
    config: {
      presence: {
        key: 'user_id',
      },
    },
  });
}

/**
 * Track presence
 */
export async function trackPresence(
  channel: RealtimeChannel,
  state: any,
  onSync?: () => void
): Promise<void> {
  await channel.track(state);
  if (onSync) {
    channel.on('presence', { event: 'sync' }, onSync);
  }
}

/**
 * Untrack presence
 */
export async function untrackPresence(channel: RealtimeChannel): Promise<void> {
  await channel.untrack();
}

/**
 * Helper to create a subscription for a specific table
 */
export function subscribeToTable(
  table: string,
  spaceId: string,
  callback: (payload: any) => void,
  options?: {
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    onStatus?: (status: string) => void;
  }
): RealtimeChannel {
  const channelName = `${table}_${spaceId}_${Date.now()}`;
  const channel = createChannel(channelName);
  
  subscribeToPostgresChanges(
    channel,
    {
      table,
      event: options?.event,
      filter: `space_id=eq.${spaceId}`
    },
    callback
  );
  
  subscribeChannel(channel, options?.onStatus);
  
  return channel;
}

log.debug('Supabase', '📡 Realtime module loaded');
