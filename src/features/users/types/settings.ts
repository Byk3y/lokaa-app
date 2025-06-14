/**
 * Settings Types
 * 
 * Type definitions for user settings functionality
 */

// Social links interface
export interface SocialLinks {
  website?: string;
  instagram?: string;
  x?: string;
  youtube?: string;
  linkedin?: string;
  facebook?: string;
}

// User profile data interface
export interface UserProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  country: string;
  socialLinks: SocialLinks;
  hideFromSearch: boolean;
  myersBriggs: string;
  profileUrl: string;
}

// Settings tab type
export type SettingsTab = 
  | "spaces" 
  | "profile" 
  | "affiliates" 
  | "payouts" 
  | "account" 
  | "notifications" 
  | "chat" 
  | "payment-methods" 
  | "payment-history" 
  | "theme";

// Menu item interface
export interface SettingsMenuItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<any>; // Using any to accommodate Lucide React props
}

// Settings navigation props
export interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  brandColor: string;
}

// Settings tab content props
export interface SettingsTabProps {
  user: any; // Using any for now to match existing auth context
}

// Space member record interface (from original file)
export interface SpaceMemberRecord {
  space_id: string;
  spaces: any | null; // Space type from existing imports
} 