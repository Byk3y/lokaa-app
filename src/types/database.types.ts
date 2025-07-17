export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      spaces: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          description: string | null;
          icon_url: string | null;
          cover_url: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
          is_private: boolean;
          status: 'active' | 'inactive' | 'deleted';
        };
        Insert: {
          id?: string;
          name: string;
          subdomain: string;
          description?: string | null;
          icon_url?: string | null;
          cover_url?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          is_private?: boolean;
          status?: 'active' | 'inactive' | 'deleted';
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string;
          description?: string | null;
          icon_url?: string | null;
          cover_url?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          is_private?: boolean;
          status?: 'active' | 'inactive' | 'deleted';
        };
      };
      space_members: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          status: 'active' | 'inactive' | 'banned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          status?: 'active' | 'inactive' | 'banned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          status?: 'active' | 'inactive' | 'banned';
          created_at?: string;
          updated_at?: string;
        };
      };
      space_media: {
        Row: {
          id: string;
          space_id: string;
          type: 'image' | 'video';
          url: string;
          thumbnail: string;
          video_id: string;
          storage_path: string;
          order: number;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          type: 'image' | 'video';
          url: string;
          thumbnail?: string;
          video_id?: string;
          storage_path: string;
          order?: number;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          type?: 'image' | 'video';
          url?: string;
          thumbnail?: string;
          video_id?: string;
          storage_path?: string;
          order?: number;
          created_at?: string;
          created_by?: string;
        };
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          space_id: string;
          content: string;
          parent_comment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          space_id: string;
          content: string;
          parent_comment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          space_id?: string;
          content?: string;
          parent_comment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          role: string;
          profile_url: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          wallet_balance: number | null;
          social_links: Json | null;
          activity_score: number | null;
          created_at: string;
          updated_at: string;
          first_name: string | null;
          last_name: string | null;
          country: string | null;
          followers: number | null;
          following: number | null;
          contributions: number | null;
          location: string | null;
          last_joined_space_id: string | null;
          timezone: string;
        };
        Insert: {
          id: string;
          role?: string;
          profile_url?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          wallet_balance?: number | null;
          social_links?: Json | null;
          activity_score?: number | null;
          created_at?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          country?: string | null;
          followers?: number | null;
          following?: number | null;
          contributions?: number | null;
          location?: string | null;
          last_joined_space_id?: string | null;
          timezone?: string;
        };
        Update: {
          id?: string;
          role?: string;
          profile_url?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          wallet_balance?: number | null;
          social_links?: Json | null;
          activity_score?: number | null;
          created_at?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          country?: string | null;
          followers?: number | null;
          following?: number | null;
          contributions?: number | null;
          location?: string | null;
          last_joined_space_id?: string | null;
          timezone?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          content: string;
          user_id: string;
          space_id: string;
          media_urls: Json | null;
          like_count: number | null;
          comment_count: number | null;
          created_at: string | null;
          updated_at: string | null;
          category_id: string | null;
          title: string | null;
          is_pinned: boolean | null;
          pinned_at: string | null;
          pinned_by: string | null;
          pin_position: number | null;
        };
        Insert: {
          id?: string;
          content: string;
          user_id: string;
          space_id: string;
          media_urls?: Json | null;
          like_count?: number | null;
          comment_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          category_id?: string | null;
          title?: string | null;
          is_pinned?: boolean | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          pin_position?: number | null;
        };
        Update: {
          id?: string;
          content?: string;
          user_id?: string;
          space_id?: string;
          media_urls?: Json | null;
          like_count?: number | null;
          comment_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          category_id?: string | null;
          title?: string | null;
          is_pinned?: boolean | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          pin_position?: number | null;
        };
      };
      user_space_progress: {
        Row: {
          id: string;
          user_id: string;
          space_id: string;
          task_type: 'invite' | 'description' | 'cover' | 'post';
          completed_at: string | null;
          setup_dismissed: boolean | null;
          setup_dismissed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          space_id: string;
          task_type: 'invite' | 'description' | 'cover' | 'post';
          completed_at?: string | null;
          setup_dismissed?: boolean | null;
          setup_dismissed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          space_id?: string;
          task_type?: 'invite' | 'description' | 'cover' | 'post';
          completed_at?: string | null;
          setup_dismissed?: boolean | null;
          setup_dismissed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

