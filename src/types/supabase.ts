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
      badges: {
        Row: {
          code: string
          description: string | null
          icon_url: string | null
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          icon_url?: string | null
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          icon_url?: string | null
          name?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          id?: string
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
        ]
      }
      course_lessons: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          id: string
          lesson_order: number
          module_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          id?: string
          lesson_order?: number
          module_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          id?: string
          lesson_order?: number
          module_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          module_order: number
          release_delay_days: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          module_order?: number
          release_delay_days?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module_order?: number
          release_delay_days?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: string
          created_at: string | null
          creator_id: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          price: number | null
          space_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          access_type?: string
          created_at?: string | null
          creator_id: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          price?: number | null
          space_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          price?: number | null
          space_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      global_user_points: {
        Row: {
          level: number
          points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          level?: number
          points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          level?: number
          points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          lesson_id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          lesson_id: string
          module_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          lesson_id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_role: string | null
          performed_by: string | null
          previous_role: string | null
          space_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_role?: string | null
          performed_by?: string | null
          previous_role?: string | null
          space_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_role?: string | null
          performed_by?: string | null
          previous_role?: string | null
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category_id: string | null
          comment_count: number | null
          content: string
          created_at: string | null
          id: string
          like_count: number | null
          media_urls: Json | null
          space_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          media_urls?: Json | null
          space_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          media_urls?: Json | null
          space_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "space_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
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
          created_at: string | null
          id: string
          is_active: boolean
          role: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
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
      space_categories: {
        Row: {
          created_at: string | null
          created_by: string
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          space_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          space_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          space_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_categories_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_events: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          is_all_day: boolean
          location: string | null
          space_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          space_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          space_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_events_space_id_fkey"
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
          is_online: boolean | null
          joined_at: string
          last_active_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          space_id: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          joined_at?: string
          last_active_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          space_id: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          joined_at?: string
          last_active_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          space_id?: string
          status?: Database["public"]["Enums"]["member_status"]
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
      space_user_points: {
        Row: {
          created_at: string
          points: number
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          points?: number
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          points?: number
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_user_points_space_id_fkey"
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
      user_activity_log: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          ref_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          ref_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          ref_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          badge_code: string
          id: string
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          badge_code: string
          id?: string
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          badge_code?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
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
          contributions: number | null
          country: string | null
          created_at: string
          first_name: string | null
          followers: number | null
          following: number | null
          full_name: string | null
          id: string
          last_joined_space_id: string | null
          last_name: string | null
          location: string | null
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
          contributions?: number | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          followers?: number | null
          following?: number | null
          full_name?: string | null
          id: string
          last_joined_space_id?: string | null
          last_name?: string | null
          location?: string | null
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
          contributions?: number | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          followers?: number | null
          following?: number | null
          full_name?: string | null
          id?: string
          last_joined_space_id?: string | null
          last_name?: string | null
          location?: string | null
          profile_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_last_joined_space_id"
            columns: ["last_joined_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      space_members_view: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          id: string | null
          is_online: boolean | null
          joined_at: string | null
          last_active_at: string | null
          location: string | null
          role: Database["public"]["Enums"]["member_role"] | null
          space_id: string | null
          space_name: string | null
          space_subdomain: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
          username: string | null
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
      debug_space_members: {
        Args: { space_id_param: string }
        Returns: Json
      }
      ensure_user_url: {
        Args: { user_id: string }
        Returns: string
      }
      fix_space_members: {
        Args: { space_id_param: string }
        Returns: Json
      }
      fix_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          full_name: string
          profile_url: string
          fixed: boolean
        }[]
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
      is_active_member_of_space: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      is_member_of_space: {
        Args: { space_id_to_check: string; user_id_to_check: string }
        Returns: boolean
      }
      join_space_directly: {
        Args: { user_id_param: string; space_id_param: string }
        Returns: Json
      }
      public_join_space: {
        Args: { p_space_id: string }
        Returns: Json
      }
      record_membership_event: {
        Args: {
          space_id_param: string
          user_id_param: string
          action_param: string
          previous_role_param?: string
          new_role_param?: string
          performed_by_param?: string
          metadata_param?: Json
        }
        Returns: string
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
      update_member_activity: {
        Args: { p_user_id: string; p_space_id: string }
        Returns: boolean
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
      user_activity_by_month: {
        Args: { user_id_input: string; start_date: string }
        Returns: {
          month: string
          contributions: number
        }[]
      }
    }
    Enums: {
      member_role: "admin" | "member"
      member_status: "active" | "cancelling" | "churned" | "banned"
      pricing_type: "free" | "paid"
      space_visibility: "public" | "private"
      user_role: "member" | "creator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: ["admin", "member"],
      member_status: ["active", "cancelling", "churned", "banned"],
      pricing_type: ["free", "paid"],
      space_visibility: ["public", "private"],
      user_role: ["member", "creator"],
    },
  },
} as const
