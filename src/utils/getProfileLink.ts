/**
 * Profile Link Utility
 * 
 * Generates profile links for users based on their profile_url
 */

export interface UserForProfileLink {
  id?: string;
  profile_url?: string | null;
}

/**
 * Generate a profile link for a user
 */
export const getProfileLink = (user: UserForProfileLink | null): string | null => {
  if (!user) return null;
  if (user.profile_url) return `/profile/${user.profile_url}`;
  return null;
};

/**
 * Generate a profile link specifically for member list items
 */
export const getMemberProfileLink = (member: { profile_url?: string | null }): string | null => {
  if (!member || !member.profile_url) return null;
  return `/profile/${member.profile_url}`;
};

export default getProfileLink;
