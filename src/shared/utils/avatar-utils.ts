/**
 * Utility functions for handling avatars and user display
 */

/**
 * Extract initials from a name for avatar fallback
 * @param name Full name to extract initials from
 * @returns Initials (1-2 characters)
 */
export function getInitial(name: string | null | undefined): string {
  if (!name) return '?';
  
  // Split the name by spaces and get the first and last parts
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) return '?';
  
  if (parts.length === 1) {
    // Just use the first character of the single name
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Get initials from first and last name
  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate a deterministic color based on a string (typically a user ID)
 * @param str String to generate color from
 * @returns HEX color code
 */
export function getAvatarColor(str: string): string {
  // Define a set of pleasant, accessible colors
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F97316', // orange
    '#10B981', // emerald
    '#14B8A6', // teal
    '#0EA5E9', // sky blue
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#6366F1', // indigo
  ];
  
  // Create a simple hash of the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Gets initials from a full name (first letter of first and last name)
 * @param name Full name of the user
 * @returns Two-letter initials or single letter if only one name is provided
 */
export const getInitials = (name: string | null): string => {
  if (!name) return "U"; // Default for unknown/undefined
  
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}; 