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
      analytics_events: {
        Row: {
          ab_experiment: string | null
          ab_variant: string | null
          created_at: string | null
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          page_url: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          ab_experiment?: string | null
          ab_variant?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          ab_experiment?: string | null
          ab_variant?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          read_by_ids: string[] | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          read_by_ids?: string[] | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          read_by_ids?: string[] | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_active_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_active_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_active_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
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
          page_type: string | null
          post_id: string | null
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
          page_type?: string | null
          post_id?: string | null
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
          page_type?: string | null
          post_id?: string | null
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
          short_id: string | null
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
          short_id?: string | null
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
          short_id?: string | null
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_system_message: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_system_message?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_system_message?: boolean | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
          course_id: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean | null
          like_count: number | null
          media_urls: Json | null
          pin_category: string | null
          pin_position: number | null
          pinned_at: string | null
          pinned_by: string | null
          poll_data: Json | null
          post_type: string | null
          slug: string | null
          space_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          comment_count?: number | null
          content: string
          course_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          media_urls?: Json | null
          pin_category?: string | null
          pin_position?: number | null
          pinned_at?: string | null
          pinned_by?: string | null
          poll_data?: Json | null
          post_type?: string | null
          slug?: string | null
          space_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          comment_count?: number | null
          content?: string
          course_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          media_urls?: Json | null
          pin_category?: string | null
          pin_position?: number | null
          pinned_at?: string | null
          pinned_by?: string | null
          poll_data?: Json | null
          post_type?: string | null
          slug?: string | null
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
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      space_media: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          order: number
          space_id: string
          storage_path: string | null
          thumbnail: string | null
          type: string
          url: string
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order?: number
          space_id: string
          storage_path?: string | null
          thumbnail?: string | null
          type: string
          url: string
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order?: number
          space_id?: string
          storage_path?: string | null
          thumbnail?: string | null
          type?: string
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_media_space_id_fkey"
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
          id: string
          created_at: string
          name: string
          owner_id: string
          updated_at: string
          description: string
          subdomain: string
          cover_image: string
          primary_color: string
          pricing_type: string
          price_per_month: number
          member_count: number
          is_private: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          owner_id: string
          updated_at?: string
          description?: string
          subdomain: string
          cover_image?: string
          primary_color?: string
          pricing_type?: string
          price_per_month?: number
          member_count?: number
          is_private?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          owner_id?: string
          updated_at?: string
          description?: string
          subdomain?: string
          cover_image?: string
          primary_color?: string
          pricing_type?: string
          price_per_month?: number
          member_count?: number
          is_private?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "spaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
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
          timezone: string
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
          timezone?: string
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
          timezone?: string
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
      app_performance_metrics: {
        Row: {
          metric_type: string | null
          metrics: Json | null
        }
        Relationships: []
      }
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
      user_conversations: {
        Row: {
          conversation_id: string | null
          conversation_name: string | null
          created_at: string | null
          is_admin: boolean | null
          is_group: boolean | null
          last_message_at: string | null
          last_read_at: string | null
          latest_message_content: string | null
          latest_message_id: string | null
          latest_message_sender: string | null
          latest_message_time: string | null
          other_participants: Json | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["latest_message_sender"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unread_counts: {
        Row: {
          conversation_id: string | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      check_space_is_public: {
        Args: { p_space_id: string }
        Returns: boolean
      }
      check_user_is_space_owner: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      check_user_poll_vote: {
        Args: { post_id_param: string; user_id_param: string }
        Returns: Json
      }
      check_user_space_membership: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_inactive_members: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_online_status: {
        Args: { timeout_minutes?: number }
        Returns: {
          cleaned_count: number
          space_id: string
        }[]
      }
      convert_to_user_timezone: {
        Args: { p_timestamp: string; p_user_id: string; p_format?: string }
        Returns: string
      }
      create_direct_message: {
        Args: { user1: string; user2: string }
        Returns: string
      }
      create_space_safely: {
        Args: { space_name: string; space_subdomain: string; owner_id: string }
        Returns: Json
      }
      debug_chat_access: {
        Args: { conversation_id_param: string }
        Returns: Json
      }
      debug_space_members: {
        Args: { space_id_param: string }
        Returns: Json
      }
      ensure_user_online_safe: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
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
      generate_post_slug: {
        Args:
          | { title: string; space_id: string }
          | { title: string; space_id: string; content?: string }
        Returns: string
      }
      get_batch_space_member_counts: {
        Args: { space_ids: string[] }
        Returns: {
          space_id: string
          total_members: number
          online_members: number
          admin_members: number
        }[]
      }
      get_conversation_meta: {
        Args: { conversation_id: string; current_user_id: string }
        Returns: Json
      }
      get_database_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          metric_value: string
          status: string
        }[]
      }
      get_mutual_spaces: {
        Args: { user1_id: string; user2_id: string }
        Returns: {
          id: string
          name: string
          subdomain: string
        }[]
      }
      get_or_create_conversation: {
        Args: { user1: string; user2: string }
        Returns: string
      }
      get_or_create_direct_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_pinned_posts_by_category: {
        Args: { space_id_param: string; category_param?: string }
        Returns: {
          id: string
          content: string
          title: string
          user_id: string
          space_id: string
          created_at: string
          updated_at: string
          is_pinned: boolean
          pinned_at: string
          pinned_by: string
          pin_position: number
          pin_category: string
          like_count: number
          comment_count: number
          author_name: string
          author_avatar: string
        }[]
      }
      get_poll_results: {
        Args: { post_id_param: string }
        Returns: {
          option_index: number
          option_text: string
          vote_count: number
        }[]
      }
      get_post_with_user_data: {
        Args: { post_id_param: string; current_user_id_param?: string }
        Returns: Json[]
      }
      get_public_spaces: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          cover_image: string
          subdomain: string
          owner_id: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          price_per_month: number
          member_count: number
          created_at: string
          updated_at: string
          primary_color: string
          is_private: boolean
          about_description: string
          icon_image: string
          feature_classroom_enabled: boolean
          feature_calendar_enabled: boolean
          feature_map_enabled: boolean
          feature_7_day_trial_enabled: boolean
          rules_list: Json
          support_email: string
          intro_media_type: string
          intro_media_url: string
          intro_media_thumbnail_url: string
        }[]
      }
      get_slow_queries: {
        Args: Record<PropertyKey, never>
        Returns: {
          query_text: string
          calls: number
          total_time: number
          mean_time: number
          hit_ratio: number
        }[]
      }
      get_space_by_subdomain: {
        Args: { target_subdomain: string }
        Returns: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          feature_7_day_trial_enabled: boolean | null
          feature_calendar_enabled: boolean | null
          feature_classroom_enabled: boolean | null
          feature_map_enabled: boolean | null
          icon_image: string | null
          id: string
          intro_media_thumbnail_url: string | null
          intro_media_type: string | null
          intro_media_url: string | null
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          rules_list: Json | null
          subdomain: string
          support_email: string | null
          updated_at: string
        }[]
      }
      get_space_member_counts: {
        Args: { space_id_param: string }
        Returns: {
          total_members: number
          online_members: number
          admin_members: number
        }[]
      }
      get_space_members_safe: {
        Args: { p_space_id: string }
        Returns: {
          id: string
          user_id: string
          role: string
          joined_at: string
          last_active_at: string
          status: string
          is_online: boolean
          full_name: string
          avatar_url: string
          profile_url: string
          activity_score: number
          bio: string
        }[]
      }
      get_user_chat_status: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_user_connection_context: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: Json
      }
      get_user_conversations: {
        Args: { user_id: string }
        Returns: Json[]
      }
      get_user_spaces_simple: {
        Args: { user_id_param: string }
        Returns: {
          id: string
          name: string
          subdomain: string
          is_owner: boolean
        }[]
      }
      get_user_time_in_timezone: {
        Args: { p_user_id: string; p_format?: string }
        Returns: string
      }
      hello_lokaa: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_space_admin: {
        Args: { user_id_to_check: string; space_id_to_check: string }
        Returns: boolean
      }
      is_user_in_conversation_for_rls: {
        Args: { user_id_check: string; conversation_id_check: string }
        Returns: boolean
      }
      join_space_directly: {
        Args: { user_id_param: string; space_id_param: string }
        Returns: Json
      }
      mark_conversation_as_read: {
        Args:
          | { conversation_id_param: string }
          | {
              p_conversation_id: string
              p_user_id?: string
              p_before_timestamp?: string
            }
        Returns: boolean
      }
      mark_inactive_members: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      pin_post: {
        Args: { post_id: string; category?: string }
        Returns: Json
      }
      pin_post_frontend: {
        Args: { post_id: string; category_name: string }
        Returns: undefined
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
      reorder_pinned_posts: {
        Args: { post_ids: string[]; positions: number[] }
        Returns: undefined
      }
      set_user_offline_safe: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      space_by_subdomain: {
        Args: { target_subdomain: string }
        Returns: {
          about_description: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          feature_7_day_trial_enabled: boolean | null
          feature_calendar_enabled: boolean | null
          feature_classroom_enabled: boolean | null
          feature_map_enabled: boolean | null
          icon_image: string | null
          id: string
          intro_media_thumbnail_url: string | null
          intro_media_type: string | null
          intro_media_url: string | null
          is_private: boolean
          member_count: number | null
          name: string
          owner_id: string
          price_per_month: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          primary_color: string | null
          rules_list: Json | null
          subdomain: string
          support_email: string | null
          updated_at: string
        }[]
      }
      start_conversation: {
        Args: { other_user_id: string; initial_message?: string }
        Returns: Json
      }
      test_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      toggle_post_pin: {
        Args: { post_id: string; pin_action?: string; category?: string }
        Returns: Json
      }
      unpin_post: {
        Args: { post_id: string }
        Returns: Json
      }
      unpin_post_frontend: {
        Args: { post_id: string }
        Returns: undefined
      }
      update_all_spaces_member_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_chat_user_activity: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      update_follow_counts_for_users: {
        Args: { user_ids: string[] }
        Returns: undefined
      }
      update_member_activity: {
        Args: { p_user_id: string; p_space_id: string }
        Returns: boolean
      }
      update_member_presence: {
        Args: { p_user_id: string; p_space_id: string; p_is_online: boolean }
        Returns: undefined
      }
      update_space_intro_media: {
        Args: {
          p_space_id: string
          p_intro_media_type: string
          p_intro_media_url: string
        }
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
      update_user_activity_scores: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_activity_by_month: {
        Args: { user_id_input: string; start_date: string }
        Returns: {
          month: string
          contributions: number
        }[]
      }
      verify_and_correct_member_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          space_id: string
          old_count: number
          new_count: number
          updated: boolean
        }[]
      }
      vote_on_poll: {
        Args: { post_id_param: string; option_index_param: number }
        Returns: Json
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
