import { log } from '@/utils/logger';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

interface MobileNetworkOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
  exponentialBackoff?: boolean;
}

/**
 * Mobile-optimized network handler for better reliability on mobile devices
 */
export class MobileNetworkHandler {
  private static readonly DEFAULT_OPTIONS: Required<MobileNetworkOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    timeout: 10000,
    exponentialBackoff: true,
  };

  /**
   * Enhanced fetch wrapper with mobile-specific error handling
   */
  static async safeFetch<T>(
    fetchFunction: () => Promise<T>,
    options: MobileNetworkOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const isMobile = shouldEnableMobileFeatures();
    
    // Increase timeouts and retries for mobile
    if (isMobile) {
      config.timeout *= 1.5;
      config.maxRetries = Math.max(config.maxRetries, 3);
      config.baseDelay = Math.max(config.baseDelay, 1500);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${config.timeout}ms`));
          }, config.timeout);
        });

        // Race between the fetch and timeout
        const result = await Promise.race([
          fetchFunction(),
          timeoutPromise
        ]);

        log.debug('MobileNetwork', `✅ Request succeeded on attempt ${attempt + 1}`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === config.maxRetries) {
          log.error('MobileNetwork', `❌ All attempts failed. Last error:`, lastError);
          break;
        }

        const delay = config.exponentialBackoff 
          ? config.baseDelay * Math.pow(2, attempt)
          : config.baseDelay;

        const jitteredDelay = delay + Math.random() * 500; // Add jitter

        log.warn('MobileNetwork', `🔄 Attempt ${attempt + 1} failed, retrying in ${jitteredDelay}ms...`, {
          error: lastError.message,
          isMobile,
          attempt: attempt + 1,
          maxRetries: config.maxRetries
        });

        await this.sleep(jitteredDelay);
      }
    }

    // Enhance error message for mobile users
    if (isMobile && lastError) {
      throw new Error(`Network request failed on mobile device. Please check your connection and try again. (${lastError.message})`);
    }

    throw lastError || new Error('Unknown network error');
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if the error is likely network-related
   */
  static isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const networkErrorIndicators = [
      'fetch',
      'network',
      'timeout',
      'connection',
      'internet',
      'cors',
      'net::'
    ];

    const errorMessage = error.message.toLowerCase();
    return networkErrorIndicators.some(indicator => 
      errorMessage.includes(indicator)
    );
  }

  /**
   * Create a mobile-optimized fetch function for Supabase operations
   */
  static createSupabaseFetch<T>(operation: () => Promise<T>) {
    return () => this.safeFetch(operation, {
      maxRetries: shouldEnableMobileFeatures() ? 4 : 2,
      baseDelay: shouldEnableMobileFeatures() ? 2000 : 1000,
      timeout: shouldEnableMobileFeatures() ? 15000 : 10000,
    });
  }
}

/**
 * Quick wrapper for common Supabase operations
 */
export const mobileOptimizedFetch = MobileNetworkHandler.safeFetch;

/**
 * Specific wrapper for Supabase database operations
 */
export const supabaseMobileFetch = MobileNetworkHandler.createSupabaseFetch;