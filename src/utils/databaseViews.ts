import { getSupabaseClient } from '@/services/supabase';
import { log } from '@/utils/logger';

/**
 * 🚀 Database Views - Optimized views for common query patterns
 * 
 * Features:
 * - Pre-computed views for complex joins
 * - Optimized queries for common patterns
 * - Cached view results with TTL
 * - Performance monitoring
 * - Automatic view refresh
 */

export interface DatabaseView {
  name: string;
  query: string;
  ttl: number;
  lastRefreshed: number;
  cache: Map<string, any>;
}

export interface ViewQueryOptions {
  forceRefresh?: boolean;
  cacheKey?: string;
  ttl?: number;
}

class DatabaseViews {
  private static instance: DatabaseViews;
  private views = new Map<string, DatabaseView>();
  private supabase = getSupabaseClient();

  constructor() {
    this.initializeViews();
  }

  static getInstance(): DatabaseViews {
    if (!DatabaseViews.instance) {
      DatabaseViews.instance = new DatabaseViews();
    }
    return DatabaseViews.instance;
  }

  /**
   * 🏗️ INITIALIZE OPTIMIZED VIEWS
   */
  private initializeViews(): void {
    // User spaces with membership info
    this.views.set('user_spaces_optimized', {
      name: 'user_spaces_optimized',
      query: `
        SELECT 
          s.id,
          s.name,
          s.description,
          s.cover_image,
          s.subdomain,
          s.primary_color,
          s.is_private,
          s.member_count,
          s.created_at,
          sm.role as user_role,
          sm.joined_at,
          sm.status as membership_status,
          u.full_name as owner_name,
          u.avatar_url as owner_avatar
        FROM spaces s
        JOIN space_members sm ON s.id = sm.space_id
        JOIN users u ON s.owner_id = u.id
        WHERE sm.user_id = $1
        AND sm.status = 'active'
        ORDER BY sm.joined_at DESC
      `,
      ttl: 5 * 60 * 1000, // 5 minutes
      lastRefreshed: 0,
      cache: new Map()
    });

    // Posts with author and engagement info
    this.views.set('posts_with_engagement', {
      name: 'posts_with_engagement',
      query: `
        SELECT 
          p.id,
          p.title,
          p.content,
          p.created_at,
          p.updated_at,
          p.like_count,
          p.comment_count,
          p.is_pinned,
          p.pinned_at,
          p.slug,
          p.space_id,
          u.full_name as author_name,
          u.avatar_url as author_avatar,
          u.id as author_id,
          sc.name as category_name,
          sc.id as category_id,
          s.name as space_name,
          s.subdomain as space_subdomain
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN space_categories sc ON p.category_id = sc.id
        JOIN spaces s ON p.space_id = s.id
        WHERE p.space_id = $1
        ORDER BY 
          p.is_pinned DESC,
          p.pinned_at DESC NULLS LAST,
          p.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      ttl: 2 * 60 * 1000, // 2 minutes
      lastRefreshed: 0,
      cache: new Map()
    });

    // Course modules with lesson counts
    this.views.set('course_modules_with_stats', {
      name: 'course_modules_with_stats',
      query: `
        SELECT 
          cm.id,
          cm.title,
          cm.description,
          cm.module_order,
          cm.module_type,
          cm.course_id,
          cm.space_id,
          cm.is_published,
          cm.created_at,
          cm.updated_at,
          COUNT(cl.id) as lesson_count,
          COUNT(CASE WHEN cl.is_published = true THEN 1 END) as published_lessons,
          AVG(cl.estimated_duration) as avg_lesson_duration
        FROM course_modules cm
        LEFT JOIN course_lessons cl ON cm.id = cl.module_id
        WHERE cm.course_id = $1
        GROUP BY cm.id, cm.title, cm.description, cm.module_order, 
                 cm.module_type, cm.course_id, cm.space_id, 
                 cm.is_published, cm.created_at, cm.updated_at
        ORDER BY cm.module_order
      `,
      ttl: 10 * 60 * 1000, // 10 minutes
      lastRefreshed: 0,
      cache: new Map()
    });

    // User conversations with last message
    this.views.set('user_conversations_optimized', {
      name: 'user_conversations_optimized',
      query: `
        SELECT 
          c.id as conversation_id,
          c.name as conversation_name,
          c.is_group,
          c.created_at,
          c.updated_at,
          c.last_message_at,
          cp.joined_at,
          cp.last_read_at,
          cp.is_admin,
          lm.content as last_message_content,
          lm.created_at as last_message_created_at,
          lm.sender_id as last_message_sender_id,
          sender.full_name as last_message_sender_name,
          sender.avatar_url as last_message_sender_avatar,
          COUNT(DISTINCT cp2.user_id) as participant_count
        FROM chat_conversations c
        JOIN chat_participants cp ON c.id = cp.conversation_id
        LEFT JOIN chat_messages lm ON c.id = lm.conversation_id 
          AND lm.created_at = (
            SELECT MAX(created_at) 
            FROM chat_messages 
            WHERE conversation_id = c.id 
            AND is_deleted = false
          )
        LEFT JOIN users sender ON lm.sender_id = sender.id
        LEFT JOIN chat_participants cp2 ON c.id = cp2.conversation_id
        WHERE cp.user_id = $1
        GROUP BY c.id, c.name, c.is_group, c.created_at, c.updated_at, 
                 c.last_message_at, cp.joined_at, cp.last_read_at, 
                 cp.is_admin, lm.content, lm.created_at, lm.sender_id,
                 sender.full_name, sender.avatar_url
        ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC
      `,
      ttl: 3 * 60 * 1000, // 3 minutes
      lastRefreshed: 0,
      cache: new Map()
    });

    // Space categories with post counts
    this.views.set('space_categories_with_counts', {
      name: 'space_categories_with_counts',
      query: `
        SELECT 
          sc.id,
          sc.name,
          sc.icon,
          sc.created_at,
          sc.updated_at,
          sc.space_id,
          COUNT(p.id) as post_count,
          COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_posts
        FROM space_categories sc
        LEFT JOIN posts p ON sc.id = p.category_id
        WHERE sc.space_id = $1
        AND sc.is_archived = false
        GROUP BY sc.id, sc.name, sc.icon, sc.created_at, sc.updated_at, sc.space_id
        ORDER BY sc.name
      `,
      ttl: 5 * 60 * 1000, // 5 minutes
      lastRefreshed: 0,
      cache: new Map()
    });
  }

  /**
   * 🎯 QUERY OPTIMIZED VIEW
   */
  async queryView<T = any>(
    viewName: string,
    params: any[] = [],
    options: ViewQueryOptions = {}
  ): Promise<T[]> {
    const view = this.views.get(viewName);
    if (!view) {
      throw new Error(`View '${viewName}' not found`);
    }

    const {
      forceRefresh = false,
      cacheKey = `${viewName}_${JSON.stringify(params)}`,
      ttl = view.ttl
    } = options;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.getFromCache(view, cacheKey);
      if (cached) {
        log.debug('Utils', `🎯 [DatabaseViews] Cache hit for view: ${viewName}`);
        return cached;
      }
    }

    // Check if view needs refresh
    const now = Date.now();
    if (now - view.lastRefreshed > ttl) {
      await this.refreshView(viewName);
    }

    try {
      log.debug('Utils', `🔍 [DatabaseViews] Executing view query: ${viewName}`);
      
      const { data, error } = await this.supabase.rpc('execute_view_query', {
        view_name: viewName,
        query_params: params
      });

      if (error) {
        throw error;
      }

      // Cache the result
      this.setCache(view, cacheKey, data, ttl);

      log.debug('Utils', `✅ [DatabaseViews] View query completed: ${viewName}, rows: ${data?.length || 0}`);
      
      return data || [];

    } catch (error) {
      log.error('Utils', `❌ [DatabaseViews] View query failed: ${viewName}`, error);
      throw error;
    }
  }

  /**
   * 🔄 REFRESH VIEW
   */
  private async refreshView(viewName: string): Promise<void> {
    const view = this.views.get(viewName);
    if (!view) return;

    view.lastRefreshed = Date.now();
    view.cache.clear();

    log.debug('Utils', `🔄 [DatabaseViews] Refreshed view: ${viewName}`);
  }

  /**
   * 💾 CACHE MANAGEMENT
   */
  private getFromCache(view: DatabaseView, key: string): any | null {
    const cached = view.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      view.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(view: DatabaseView, key: string, data: any, ttl: number): void {
    view.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries
    if (view.cache.size > 100) {
      this.cleanupViewCache(view);
    }
  }

  private cleanupViewCache(view: DatabaseView): void {
    const now = Date.now();
    for (const [key, cached] of view.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        view.cache.delete(key);
      }
    }
  }

  /**
   * 📊 GET VIEW STATS
   */
  getViewStats(): Record<string, {
    cacheSize: number;
    lastRefreshed: number;
    ttl: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [name, view] of this.views.entries()) {
      stats[name] = {
        cacheSize: view.cache.size,
        lastRefreshed: view.lastRefreshed,
        ttl: view.ttl
      };
    }

    return stats;
  }

  /**
   * 🧹 CLEAR ALL CACHES
   */
  clearAllCaches(): void {
    for (const view of this.views.values()) {
      view.cache.clear();
    }
    log.debug('Utils', '🧹 [DatabaseViews] Cleared all view caches');
  }

  /**
   * 🔍 GET AVAILABLE VIEWS
   */
  getAvailableViews(): string[] {
    return Array.from(this.views.keys());
  }
}

// Export singleton instance
export const databaseViews = DatabaseViews.getInstance();

// Export class for testing
export { DatabaseViews };

// Export types
export type { DatabaseView, ViewQueryOptions };
