export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          order_number: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          order_number: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_free: boolean | null
          price: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_free?: boolean | null
          price?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_free?: boolean | null
          price?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          end_time: string | null
          id: string
          is_online: boolean | null
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          payment_date: string
          payment_method: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          payment_date?: string
          payment_method: string
          status: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          payment_date?: string
          payment_method?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comment_count: number | null
          content: string
          created_at: string
          id: string
          like_count: number | null
          media_urls: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          content: string
          created_at?: string
          id?: string
          like_count?: number | null
          media_urls?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_count?: number | null
          content?: string
          created_at?: string
          id?: string
          like_count?: number | null
          media_urls?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean | null
          referred_id: string
          referrer_id: string
          reward_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean | null
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean | null
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      space_access: {
        Row: {
          amount_paid: number
          expiry_date: string | null
          id: string
          is_active: boolean
          paid_at: string
          space_id: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          paid_at?: string
          space_id: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          paid_at?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_access_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          space_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          space_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_rankings: {
        Row: {
          id: string
          ranking: number
          space_id: string
        }
        Insert: {
          id?: string
          ranking: number
          space_id: string
        }
        Update: {
          id?: string
          ranking?: number
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_rankings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_setup: {
        Row: {
          added_description: boolean | null
          first_post: boolean | null
          id: string
          invited_members: boolean | null
          set_cover_image: boolean | null
          space_id: string
          updated_at: string | null
        }
        Insert: {
          added_description?: boolean | null
          first_post?: boolean | null
          id?: string
          invited_members?: boolean | null
          set_cover_image?: boolean | null
          space_id: string
          updated_at?: string | null
        }
        Update: {
          added_description?: boolean | null
          first_post?: boolean | null
          id?: string
          invited_members?: boolean | null
          set_cover_image?: boolean | null
          space_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_setup_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_tags: {
        Row: {
          id: string
          space_id: string
          tag_name: string
        }
        Insert: {
          id?: string
          space_id: string
          tag_name: string
        }
        Update: {
          id?: string
          space_id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_tags_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          icon_image: string | null
          id: string
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          subdomain: string
          updated_at: string
        }
        Insert: {
          about_description?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          icon_image?: string | null
          id?: string
          is_private?: boolean
          member_count?: number | null
          name: string
          owner_id: string
          price_per_month?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          primary_color?: string | null
          subdomain: string
          updated_at?: string
        }
        Update: {
          about_description?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          icon_image?: string | null
          id?: string
          is_private?: boolean
          member_count?: number | null
          name?: string
          owner_id?: string
          price_per_month?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          primary_color?: string | null
          subdomain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          activity_score: number | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          profile_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          updated_at: string
          wallet_balance: number | null
        }
        Insert: {
          activity_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          profile_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Update: {
          activity_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          profile_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      about_page_get_space: {
        Args: { target_subdomain: string }
        Returns: Json
      }
      admin_create_space: {
        Args: { space_name: string; space_subdomain: string; owner_id: string }
        Returns: string
      }
      admin_get_space_by_subdomain: {
        Args: { target_subdomain: string }
        Returns: Json
      }
      bypass_get_space_by_subdomain: {
        Args: { subdomain: string }
        Returns: Json
      }
      check_space_access_safely: {
        Args: { space_id: string; user_id: string }
        Returns: boolean
      }
      create_space_safely: {
        Args: { space_name: string; space_subdomain: string; owner_id: string }
        Returns: Json
      }
      get_public_spaces: {
        Args: Record<PropertyKey, never>
        Returns: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          icon_image: string | null
          id: string
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          subdomain: string
          updated_at: string
        }[]
      }
      get_space_by_subdomain: {
        Args: { target_subdomain: string }
        Returns: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          icon_image: string | null
          id: string
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          subdomain: string
          updated_at: string
        }[]
      }
      space_by_subdomain: {
        Args: { target_subdomain: string }
        Returns: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          icon_image: string | null
          id: string
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          subdomain: string
          updated_at: string
        }[]
      }
      update_space_setup: {
        Args: { p_space_id: string; p_task: string; p_completed: boolean }
        Returns: {
          added_description: boolean | null
          first_post: boolean | null
          id: string
          invited_members: boolean | null
          set_cover_image: boolean | null
          space_id: string
          updated_at: string | null
        }[]
      }
    }
    Enums: {
      member_role: ["admin", "member"],
      pricing_type: ["free", "paid"],
      space_visibility: ["public", "private"],
      user_role: ["member", "creator"],
    },
  },
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pricing_type: ["free", "paid"],
      user_role: ["member", "creator"],
    },
  },
}
