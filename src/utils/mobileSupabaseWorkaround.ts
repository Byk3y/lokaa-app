import { log } from '@/utils/logger';
/**
 * Mobile Safari + Supabase HTTP/3 Connection Workaround
 * 
 * This addresses a known issue where Safari/WebKit fails to maintain
 * HTTP/3 connections to Supabase after periods of inactivity.
 * 
 * Root cause: Safari + HTTP/3 keep-alive bug with Cloudflare/Supabase
 * Solution: Lightweight keep-alive requests to maintain connection
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

class MobileSupabaseWorkaround {
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  
  constructor() {
    this.init();
  }
  
  private init() {
    // Only activate on Safari/WebKit (mobile and desktop)
    const isSafari = /Safari|WebKit/i.test(navigator.userAgent) && 
                     !/Chrome|Chromium/i.test(navigator.userAgent);
    
    if (isSafari) {
      log.debug('Utils', '🔧 [MobileSupabaseWorkaround] Safari detected - activating HTTP/3 keep-alive');
      this.start();
      
      // Stop keep-alive when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.start();
        }
      });
    }
  }
  
  private start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Keep connection alive with lightweight requests every 90 seconds
    // This prevents the ~2 minute timeout that causes Safari/HTTP3 failures
    this.keepAliveInterval = setInterval(() => {
      this.performKeepAlive();
    }, 90000); // 90 seconds - safely under the 2-minute timeout
    
    log.debug('Utils', '🔧 [MobileSupabaseWorkaround] Keep-alive started');
  }
  
  private stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    log.debug('Utils', '🔧 [MobileSupabaseWorkaround] Keep-alive stopped');
  }
  
  private async performKeepAlive() {
    try {
      // Lightweight request to keep HTTP/3 connection alive
      // Uses a simple count query that's fast and cached
      const { error } = await getSupabaseClient()
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .limit(1);
        
      if (error) {
        log.warn('Utils', '🔧 [MobileSupabaseWorkaround] Keep-alive failed:', error.message);
      } else {
        log.debug('Utils', '🔧 [MobileSupabaseWorkaround] Keep-alive successful');
      }
    } catch (error) {
      log.warn('Utils', '🔧 [MobileSupabaseWorkaround] Keep-alive error:', error);
    }
  }
  
  // Manual trigger for testing
  public triggerKeepAlive() {
    return this.performKeepAlive();
  }
}

// Initialize the workaround
export const mobileSupabaseWorkaround = new MobileSupabaseWorkaround();

// Export for debugging
declare global {
  interface Window {
    mobileSupabaseWorkaround: MobileSupabaseWorkaround;
  }
}

if (typeof window !== 'undefined') {
  window.mobileSupabaseWorkaround = mobileSupabaseWorkaround;
} 