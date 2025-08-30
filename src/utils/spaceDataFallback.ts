import { log } from '@/utils/logger';
import { getKnownSpaceConfig, createEnhancedSpaceData, type KnownSpaceConfig } from '@/config/knownSpaces';

/**
 * Space Data Fallback System
 * Provides fallback data when database queries timeout to ensure all tabs work
 * 
 * Now uses centralized configuration from @/config/knownSpaces
 */

export interface SpaceFallbackData {
  id: string;
  name: string;
  subdomain: string;
  description?: string;
  owner_id?: string;
  member_count?: number;
  admin_count?: number;
  online_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Convert KnownSpaceConfig to SpaceFallbackData format
 */
function convertToSpaceFallbackData(config: KnownSpaceConfig): SpaceFallbackData {
  return {
    id: config.id,
    name: config.name,
    subdomain: config.subdomain,
    description: config.description,
    owner_id: config.owner_id,
    member_count: config.member_count,
    admin_count: config.admin_count,
    online_count: config.online_count,
    created_at: config.created_at,
    updated_at: config.updated_at
  };
}

/**
 * Get fallback space data for a subdomain
 */
export function getSpaceFallbackData(subdomain: string): SpaceFallbackData | null {
  const config = getKnownSpaceConfig(subdomain);
  
  if (config) {
    return convertToSpaceFallbackData(config);
  }
  
  // CRITICAL FIX: Don't generate invalid fallback IDs that cause database errors
  // Instead, return null to indicate no fallback is available
  log.warn('Utils', `⚠️ [SpaceFallback] No fallback data available for ${subdomain} - returning null to prevent invalid database queries`);
  return null;
}

/**
 * Check if we should use fallback data based on error type
 */
export function shouldUseFallback(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  
  // Use fallback for timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('AbortError') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Failed to fetch')) {
    return true;
  }
  
  return false;
}

/**
 * Enhanced space data fetcher with fallback support
 */
export async function fetchSpaceWithFallback(
  subdomain: string,
  fetchFunction: () => Promise<any>
): Promise<SpaceFallbackData> {
  try {
    const result = await fetchFunction();
    
    if (result && result.data && result.data.length > 0) {
      log.debug('Utils', `✅ [SpaceFallback] Successfully fetched ${subdomain} from database`);
      return result.data[0];
    }
    
    // No data found, use fallback
    log.debug('Utils', `📦 [SpaceFallback] No data found for ${subdomain}, using fallback`);
    return getSpaceFallbackData(subdomain)!;
    
  } catch (error) {
    log.error('Utils', `❌ [SpaceFallback] Error fetching ${subdomain}:`, error);
    
    if (shouldUseFallback(error)) {
      log.debug('Utils', `🔄 [SpaceFallback] Using fallback due to error: ${error.message}`);
      return getSpaceFallbackData(subdomain)!;
    }
    
    // Re-throw non-timeout errors
    throw error;
  }
} 