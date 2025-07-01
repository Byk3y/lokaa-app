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

