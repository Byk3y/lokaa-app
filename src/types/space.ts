export interface Space {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  cover_image?: string | null;
  icon_image?: string | null;
  subdomain?: string;
  owner_id?: string;
  member_count?: number | null;
  primary_color?: string | null;
  pricing_type?: 'free' | 'paid';
  price_per_month?: number | null;
  created_at?: string;
  updated_at?: string;
  is_private?: boolean;
  // Additional properties for the UI
  post_count?: number;
  members?: number;
  posts?: number;
  instructor?: string;
  tags?: string[];
  ranking?: number;
  createdAt?: string;
  updatedAt?: string;
  // Owner information
  owner?: {
    name?: string;
    avatar_url?: string;
  };
} 