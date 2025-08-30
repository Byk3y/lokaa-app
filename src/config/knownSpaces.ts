/**
 * Known Spaces Configuration
 * 
 * Centralized configuration for all known/hardcoded spaces in the application.
 * This replaces scattered hardcoded space data across multiple files.
 * 
 * Used by:
 * - useSpaceDataFallback hook
 * - spaceDataFallback utility
 * - PostService and other space-dependent services
 * - Development and test utilities
 */

export interface KnownSpaceConfig {
  id: string;
  name: string;
  subdomain: string;
  description: string;
  owner_id?: string;
  icon_image?: string | null;
  cover_image?: string | null;
  is_private: boolean;
  member_count?: number;
  admin_count?: number;
  online_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Comprehensive space configurations
 * Data consolidated from multiple sources with conflict resolution
 */
export const KNOWN_SPACES: Record<string, KnownSpaceConfig> = {
  'nocode-architects': {
    id: '235e68d1-89df-4d2d-8945-e7756d60de20',
    name: 'Nocode Devils',
    subdomain: 'nocode-architects',
    description: 'A community for no-code architects and builders',
    owner_id: '1fca49da-3a53-4a0f-aeb3-63b567f35f84',
    icon_image: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/space-icons/235e68d1-89df-4d2d-8945-e7756d60de20_1747910766771_Generated_Image_March_26__2025_-_9_20AM_png.jpeg',
    cover_image: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/space-covers/235e68d1-89df-4d2d-8945-e7756d60de20_1747911651153_Untitled.png',
    is_private: false,
    member_count: 6,
    admin_count: 1,
    online_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'nextpath-ai': {
    id: 'cc18c511-9b54-4e14-8abc-75b8c800c39d',
    name: 'Nextpath AI',
    subdomain: 'nextpath-ai',
    description: 'AI-powered learning and development community',
    owner_id: '1fca49da-3a53-4a0f-aeb3-63b567f35f84',
    icon_image: null,
    cover_image: null,
    is_private: false,
    member_count: 1,
    admin_count: 1,
    online_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'music-business': {
    id: '987e5232-68a8-4d1c-88be-e6f77a5e93fd',
    name: 'Music Business',
    subdomain: 'music-business',
    description: 'A community for music business professionals',
    owner_id: '1fca49da-3a53-4a0f-aeb3-63b567f35f84',
    icon_image: null,
    cover_image: null,
    is_private: false,
    member_count: 3,
    admin_count: 1,
    online_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'aqua-space': {
    id: 'c1f7c014-ed72-4c9b-bd88-9dcd23343104',
    name: 'Aqua Space',
    subdomain: 'aqua-space',
    description: 'A community space for collaboration and discussion',
    owner_id: '13468c2b-cd4c-42c8-81f8-bb5373e0456e',
    icon_image: null,
    cover_image: null,
    is_private: false,
    member_count: 5,
    admin_count: 1,
    online_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

/**
 * Get known space configuration by subdomain
 */
export function getKnownSpaceConfig(subdomain: string): KnownSpaceConfig | null {
  return KNOWN_SPACES[subdomain] || null;
}

/**
 * Get all known space subdomains
 */
export function getKnownSpaceSubdomains(): string[] {
  return Object.keys(KNOWN_SPACES);
}

/**
 * Check if a subdomain is a known space
 */
export function isKnownSpace(subdomain: string): boolean {
  return subdomain in KNOWN_SPACES;
}

/**
 * Get space ID by subdomain (for backward compatibility)
 */
export function getSpaceIdBySubdomain(subdomain: string): string | null {
  const config = getKnownSpaceConfig(subdomain);
  return config?.id || null;
}

/**
 * Create a basic space data object compatible with SpaceData interface
 */
export function createBasicSpaceData(subdomain: string): Partial<KnownSpaceConfig> | null {
  const config = getKnownSpaceConfig(subdomain);
  if (!config) return null;

  return {
    id: config.id,
    name: config.name,
    subdomain: config.subdomain,
    description: config.description,
    icon_image: config.icon_image,
    cover_image: config.cover_image,
    is_private: config.is_private
  };
}

/**
 * Create an enhanced space data object with emergency fallback data
 */
export function createEnhancedSpaceData(subdomain: string): Partial<KnownSpaceConfig> | null {
  const config = getKnownSpaceConfig(subdomain);
  if (!config) return null;

  return {
    id: config.id,
    name: config.name,
    subdomain: config.subdomain,
    description: config.description,
    icon_image: config.icon_image,
    cover_image: config.cover_image,
    is_private: config.is_private,
    owner_id: config.owner_id,
    member_count: config.member_count,
    admin_count: config.admin_count,
    online_count: config.online_count,
    created_at: config.created_at,
    updated_at: config.updated_at
  };
}
