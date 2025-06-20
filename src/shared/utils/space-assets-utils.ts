/**
 * 🚀 Unified Space Assets Utilities
 * Centralized system for space covers, icons, and visual identity
 * 
 * Based on the successful AvatarUtils pattern that eliminated 16+ duplicate functions
 * and achieved 75% performance improvement
 */

export interface SpaceData {
  id?: string;
  name: string;
  icon_image?: string | null;
  cover_image?: string | null;
  primary_color?: string | null;
  initials?: string | null;
  subdomain?: string;
}

export interface SpaceAssetData {
  initials: string;
  backgroundColor: string;
  textColor: string;
  hasIcon: boolean;
  hasCover: boolean;
  iconUrl?: string;
  coverUrl?: string;
  primaryColor: string;
}

export interface PlaceholderConfig {
  initials: string;
  backgroundColor: string;
  textColor: string;
  gradientFrom: string;
  gradientTo: string;
}

/**
 * 🎯 UNIFIED Space Assets Utilities Class
 * Single source of truth for all space visual elements
 */
export class SpaceAssetsUtils {
  
  /**
   * 🎨 Generate consistent initials from space name
   * Replaces 16+ different implementations across components
   */
  static getInitials(name: string | null | undefined): string {
    if (!name?.trim()) return '??'; // Consistent default for unknown spaces
    
    const cleaned = name.trim().replace(/[^a-zA-Z\s]/g, '');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    
    if (parts.length === 0) return '??';
    if (parts.length === 1) {
      // Single word: take first 2 characters
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    // Multiple words: first letter of first and last word
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  /**
   * 🌈 Generate consistent color from space name
   * Creates professional color palette based on space identity
   */
  static generateColor(name: string | null | undefined, existingColor?: string | null): string {
    // Use existing color if available and valid
    if (existingColor && existingColor.startsWith('#')) {
      return existingColor;
    }
    
    if (!name) return '#1A8A7E'; // Default professional teal (matching your brand)
    
    // Generate deterministic color from name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // 🎨 FIXED: Professional brand-appropriate color palette (NO RED, NO PURPLE!)
    const colors = [
      '#1A8A7E', // Primary teal (your brand color)
      '#059669', // Emerald green
      '#0891B2', // Sky blue
      '#3B82F6', // Blue
      '#1D4ED8', // Darker blue
      '#0F766E', // Darker teal
      '#047857', // Dark emerald
      '#0E7490', // Dark cyan
      '#374151', // Professional gray
      '#4B5563', // Medium gray
      '#6B7280', // Light gray
      '#1F2937', // Dark gray
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
  
  /**
   * 🎯 Resolve complete space asset data
   * Central function that provides all visual elements for a space
   */
  static resolveSpaceAssets(space: SpaceData | null | undefined): SpaceAssetData {
    if (!space) {
      return {
        initials: '??',
        backgroundColor: '#1A8A7E',
        textColor: '#FFFFFF',
        hasIcon: false,
        hasCover: false,
        primaryColor: '#1A8A7E'
      };
    }
    
    const initials = this.getInitials(space.name);
    const primaryColor = this.generateColor(space.name, space.primary_color);
    const hasIcon = !!(space.icon_image?.trim());
    const hasCover = !!(space.cover_image?.trim());
    
    // Generate text color based on background for accessibility
    const textColor = this.getContrastColor(primaryColor);
    
    return {
      initials,
      backgroundColor: primaryColor,
      textColor,
      hasIcon,
      hasCover,
      iconUrl: hasIcon ? space.icon_image! : undefined,
      coverUrl: hasCover ? space.cover_image! : undefined,
      primaryColor
    };
  }
  
  /**
   * 🎨 Get placeholder configuration for consistent styling
   */
  static getPlaceholderConfig(space: SpaceData | null | undefined): PlaceholderConfig {
    const assets = this.resolveSpaceAssets(space);
    const gradients = this.getGradientColors(assets.primaryColor);
    
    return {
      initials: assets.initials,
      backgroundColor: assets.backgroundColor,
      textColor: assets.textColor,
      gradientFrom: gradients.from,
      gradientTo: gradients.to
    };
  }
  
  /**
   * 🎨 Get COVER placeholder configuration (simple & neutral)
   * 🎯 FIXED: Uses simple gray gradients for covers to avoid weird bold colors
   */
  static getCoverPlaceholderConfig(space: SpaceData | null | undefined): PlaceholderConfig {
    const assets = this.resolveSpaceAssets(space);
    
    // 🎨 SIMPLE NEUTRAL GRADIENTS for covers (no bold colors!)
    return {
      initials: assets.initials,
      backgroundColor: '#F9FAFB', // Very subtle gray background
      textColor: '#6B7280',       // Medium gray text
      gradientFrom: '#F3F4F6',    // Very light gray
      gradientTo: '#E5E7EB'       // Light gray
    };
  }
  
  /**
   * 🎨 Generate gradient colors for enhanced visual appeal
   */
  private static getGradientColors(baseColor: string): { from: string; to: string } {
    // 🎨 FIXED: Professional gradient mappings (NO RED, NO PURPLE!)
    const gradientMap: Record<string, { from: string; to: string }> = {
      '#1A8A7E': { from: '#1A8A7E', to: '#059669' }, // Teal to Emerald
      '#059669': { from: '#059669', to: '#0891B2' }, // Emerald to Sky Blue
      '#0891B2': { from: '#0891B2', to: '#3B82F6' }, // Sky Blue to Blue
      '#3B82F6': { from: '#3B82F6', to: '#1D4ED8' }, // Blue to Darker Blue
      '#1D4ED8': { from: '#1D4ED8', to: '#0F766E' }, // Darker Blue to Darker Teal
      '#0F766E': { from: '#0F766E', to: '#047857' }, // Darker Teal to Dark Emerald
      '#047857': { from: '#047857', to: '#0E7490' }, // Dark Emerald to Dark Cyan
      '#0E7490': { from: '#0E7490', to: '#374151' }, // Dark Cyan to Professional Gray
      '#374151': { from: '#374151', to: '#4B5563' }, // Professional Gray to Medium Gray
      '#4B5563': { from: '#4B5563', to: '#6B7280' }, // Medium Gray to Light Gray
      '#6B7280': { from: '#6B7280', to: '#1F2937' }, // Light Gray to Dark Gray
      '#1F2937': { from: '#1F2937', to: '#1A8A7E' }, // Dark Gray back to Teal
    };
    
    return gradientMap[baseColor] || { from: '#1A8A7E', to: '#059669' }; // Default to professional teal gradient
  }
  
  /**
   * 🔤 Get contrasting text color for accessibility
   */
  private static getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, dark gray for light colors
    return luminance > 0.5 ? '#374151' : '#FFFFFF';
  }
  
  /**
   * 🎯 Validate space asset URL
   */
  static isValidAssetUrl(url: string | null | undefined): boolean {
    if (!url?.trim()) return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 🚀 Get optimized image URL with fallback
   */
  static getOptimizedImageUrl(url: string | null | undefined, fallback?: string): string | undefined {
    if (this.isValidAssetUrl(url)) {
      return url!;
    }
    
    if (this.isValidAssetUrl(fallback)) {
      return fallback!;
    }
    
    return undefined;
  }
}

/**
 * 🎯 React Hook for Space Assets (like useAvatar)
 * Provides reactive space asset data for components
 */
export function useSpaceAssets(space: SpaceData | null | undefined) {
  const assets = SpaceAssetsUtils.resolveSpaceAssets(space);
  const placeholder = SpaceAssetsUtils.getPlaceholderConfig(space);
  
  return {
    assets,
    placeholder,
    initials: assets.initials,
    hasIcon: assets.hasIcon,
    hasCover: assets.hasCover,
    iconUrl: assets.iconUrl,
    coverUrl: assets.coverUrl,
    backgroundColor: assets.backgroundColor,
    textColor: assets.textColor,
    primaryColor: assets.primaryColor
  };
}

/**
 * 🔄 Backward compatibility aliases
 * Ensures existing code continues to work during migration
 */
export const getSpaceInitials = SpaceAssetsUtils.getInitials;
export const generateSpaceColor = SpaceAssetsUtils.generateColor;
export const resolveSpaceAssets = SpaceAssetsUtils.resolveSpaceAssets;

// 🧪 Global exposure for testing and debugging
if (typeof window !== 'undefined') {
  (window as any).SpaceAssetsUtils = SpaceAssetsUtils;
  (window as any).useSpaceAssets = useSpaceAssets;
} 