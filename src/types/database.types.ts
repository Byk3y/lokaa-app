export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      space_media: {
        Row: {
          id: string;
          space_id: string;
          type: 'image' | 'video';
          url: string;
          thumbnail: string | null;
          video_id: string | null;
          storage_path: string | null;
          order: number;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          space_id: string;
          type: 'image' | 'video';
          url: string;
          thumbnail?: string | null;
          video_id?: string | null;
          storage_path?: string | null;
          order?: number;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          space_id?: string;
          type?: 'image' | 'video';
          url?: string;
          thumbnail?: string | null;
          video_id?: string | null;
          storage_path?: string | null;
          order?: number;
          created_at?: string;
          created_by?: string | null;
        };
      };
      // ... other tables if needed
    };
  };
}
