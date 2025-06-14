import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';

// Type for spaces
export type Space = Database['public']['Tables']['spaces']['Row'];
export type SpaceInsert = Database['public']['Tables']['spaces']['Insert'];
export type SpaceUpdate = Database['public']['Tables']['spaces']['Update'];

// Type for space members
export type SpaceMember = Database['public']['Tables']['space_members']['Row'];

// Space service functions
export const SpaceService = {
  // Fetch all spaces
  async getSpaces(limit: number = 10) {
    return supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Fetch a space by ID
  async getSpaceById(id: string) {
    return supabase
      .from('spaces')
      .select('*')
      .eq('id', id)
      .single();
  },

  // Fetch a space by subdomain
  async getSpaceBySubdomain(subdomain: string) {
    return supabase
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
  },

  // Fetch spaces by owner ID
  async getSpacesByOwnerId(ownerId: string) {
    return supabase
      .from('spaces')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
  }
};

// Auth service functions
export const AuthService = {
  // Get current session
  async getSession() {
    return getSupabaseClient().auth.getSession();
  },

  // Sign in with email and password
  async signInWithEmail(email: string, password: string) {
    return getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });
  },

  // Sign out
  async signOut() {
    return getSupabaseClient().auth.signOut();
  }
};

// Member service functions
export const MemberService = {
  // Fetch members of a space
  async getSpaceMembers(spaceId: string) {
    return supabase
      .from('space_members')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('space_id', spaceId);
  },

  // Check if user is a member of a space
  async isUserMemberOfSpace(userId: string, spaceId: string) {
    const { data, error } = await getSupabaseClient()
      .from('space_members')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .single();
      
    return { isMember: !!data, error };
  }
}; 