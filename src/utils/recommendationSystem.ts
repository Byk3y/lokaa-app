/**
 * Phase 8A: AI-powered Recommendation System
 * 
 * Provides personalized content recommendations using collaborative filtering,
 * content-based filtering, and hybrid algorithms built on the Content Intelligence Engine.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { contentIntelligenceEngine } from './contentIntelligenceEngine';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import type { ContentAnalysisResult, TopicTrend } from './contentIntelligenceEngine';
import type { Database } from '@/types/supabase';

// Types for recommendations
interface UserProfile {
  user_id: string;
  preferences: UserPreferences;
  behavior: UserBehavior;
  interests: string[];
  engagement_patterns: EngagementPattern[];
}

interface UserPreferences {
  preferred_topics: string[];
  content_types: string[];
  complexity_level: 'beginner' | 'intermediate' | 'advanced';
  reading_time_preference: number; // minutes
  interaction_style: 'lurker' | 'commenter' | 'creator' | 'curator';
}

interface UserBehavior {
  posts_liked: number;
  posts_commented: number;
  posts_shared: number;
  time_spent_reading: number; // minutes
  peak_activity_hours: number[];
  preferred_content_length: 'short' | 'medium' | 'long';
}

interface EngagementPattern {
  topic: string;
  engagement_score: number;
  frequency: number;
  last_interaction: string;
}

interface RecommendationItem {
  post_id: string;
  title?: string;
  content: string;
  author_id: string;
  space_id: string;
  created_at: string;
  score: number;
  reason: string;
  analysis: ContentAnalysisResult;
  similarity_score?: number;
}

interface RecommendationSet {
  user_id: string;
  recommendations: RecommendationItem[];
  generated_at: string;
  algorithm_used: 'collaborative' | 'content_based' | 'hybrid' | 'trending';
  confidence_score: number;
  diversity_score: number;
}

interface RecommendationConfig {
  max_recommendations: number;
  diversity_factor: number; // 0-1, higher means more diverse
  freshness_factor: number; // 0-1, higher prefers newer content
  personalization_factor: number; // 0-1, higher means more personalized
  trending_factor: number; // 0-1, influence of trending topics
}

class RecommendationSystem {
  private readonly supabase = getSupabaseClient();
  private userProfiles = new Map<string, UserProfile>();
  private recommendationCache = new Map<string, RecommendationSet>();
  private readonly CACHE_TTL = 1800000; // 30 minutes

  private readonly defaultConfig: RecommendationConfig = {
    max_recommendations: 20,
    diversity_factor: 0.3,
    freshness_factor: 0.2,
    personalization_factor: 0.7,
    trending_factor: 0.2
  };

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    spaceId: string,
    config: Partial<RecommendationConfig> = {}
  ): Promise<RecommendationSet> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const cacheKey = `${userId}-${spaceId}`;

      // Check cache
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey)!;
        const age = Date.now() - new Date(cached.generated_at).getTime();
        if (age < this.CACHE_TTL) {
          return cached;
        }
      }

      // Get or build user profile
      const userProfile = await this.getUserProfile(userId, spaceId);

      // Generate recommendations using hybrid approach
      const recommendations = await this.generateHybridRecommendations(
        userProfile,
        spaceId,
        finalConfig
      );

      // Create recommendation set
      const recommendationSet: RecommendationSet = {
        user_id: userId,
        recommendations,
        generated_at: new Date().toISOString(),
        algorithm_used: 'hybrid',
        confidence_score: this.calculateConfidenceScore(userProfile, recommendations),
        diversity_score: this.calculateDiversityScore(recommendations)
      };

      // Cache results
      this.recommendationCache.set(cacheKey, recommendationSet);

      // Log analytics
      await logAnalyticsEvent({
        event_type: 'ai',
        event_name: 'RecommendationsGenerated',
        event_data: {
          user_id: userId,
          space_id: spaceId,
          recommendations_count: recommendations.length,
          confidence_score: recommendationSet.confidence_score,
          diversity_score: recommendationSet.diversity_score,
          algorithm: 'hybrid'
        }
      });

      return recommendationSet;
    } catch (error) {
      logError(classifyError(error, { 
        component: 'RecommendationSystem', 
        operation: 'getRecommendations',
        silent: true 
      }));
      throw error;
    }
  }

  /**
   * Generate hybrid recommendations combining multiple algorithms
   */
  private async generateHybridRecommendations(
    userProfile: UserProfile,
    spaceId: string,
    config: RecommendationConfig
  ): Promise<RecommendationItem[]> {
    const [
      contentBasedRecs,
      collaborativeRecs,
      trendingRecs
    ] = await Promise.all([
      this.getContentBasedRecommendations(userProfile, spaceId, config),
      this.getCollaborativeRecommendations(userProfile, spaceId, config),
      this.getTrendingRecommendations(spaceId, config)
    ]);

    // Combine and weight different recommendation sources
    const allRecommendations = new Map<string, RecommendationItem>();

    // Add content-based recommendations with weight
    contentBasedRecs.forEach(rec => {
      rec.score *= config.personalization_factor;
      allRecommendations.set(rec.post_id, rec);
    });

    // Add collaborative recommendations with weight
    collaborativeRecs.forEach(rec => {
      const existing = allRecommendations.get(rec.post_id);
      if (existing) {
        existing.score = Math.max(existing.score, rec.score * config.personalization_factor);
      } else {
        rec.score *= config.personalization_factor;
        allRecommendations.set(rec.post_id, rec);
      }
    });

    // Add trending recommendations with weight
    trendingRecs.forEach(rec => {
      const existing = allRecommendations.get(rec.post_id);
      if (existing) {
        existing.score += rec.score * config.trending_factor;
      } else {
        rec.score *= config.trending_factor;
        allRecommendations.set(rec.post_id, rec);
      }
    });

    // Convert to array and apply diversity filtering
    let recommendations = Array.from(allRecommendations.values());

    // Apply freshness factor
    recommendations = this.applyFreshnessFactor(recommendations, config.freshness_factor);

    // Apply diversity filtering
    recommendations = this.applyDiversityFiltering(recommendations, config.diversity_factor);

    // Sort by score and limit
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, config.max_recommendations);
  }

  /**
   * Get content-based recommendations
   */
  private async getContentBasedRecommendations(
    userProfile: UserProfile,
    spaceId: string,
    config: RecommendationConfig
  ): Promise<RecommendationItem[]> {
    try {
      // Get recent posts from the space
      const { data: posts, error } = await this.supabase
        .from('posts')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const recommendations: RecommendationItem[] = [];

      for (const post of posts || []) {
        // Skip if user already interacted with this post
        if (await this.hasUserInteracted(userProfile.user_id, post.id)) {
          continue;
        }

        // Analyze content
        const analysis = await contentIntelligenceEngine.analyzeContent(
          post.content,
          post.title,
          post.user_id,
          post.space_id
        );

        // Calculate content similarity score
        const similarityScore = this.calculateContentSimilarity(userProfile, analysis);

        if (similarityScore > 0.3) { // Threshold for relevance
          recommendations.push({
            post_id: post.id,
            title: post.title,
            content: post.content,
            author_id: post.user_id,
            space_id: post.space_id,
            created_at: post.created_at,
            score: similarityScore,
            reason: `Matches your interests in ${analysis.topics.slice(0, 2).join(', ')}`,
            analysis,
            similarity_score: similarityScore
          });
        }
      }

      return recommendations;
    } catch (error) {
      logError(classifyError(error, { component: 'RecommendationSystem', operation: 'contentBased', silent: true }));
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    userProfile: UserProfile,
    spaceId: string,
    config: RecommendationConfig
  ): Promise<RecommendationItem[]> {
    try {
      // Find similar users based on engagement patterns
      const similarUsers = await this.findSimilarUsers(userProfile, spaceId);

      // Get posts liked by similar users
      const { data: likedPosts, error } = await this.supabase
        .from('post_likes')
        .select(`
          post_id,
          posts (
            id, title, content, user_id, space_id, created_at
          )
        `)
        .in('user_id', similarUsers.map(u => u.user_id))
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const recommendations: RecommendationItem[] = [];
      const postScores = new Map<string, number>();

      // Calculate scores based on similar user interactions
      for (const like of likedPosts || []) {
        if (!like.posts || await this.hasUserInteracted(userProfile.user_id, like.post_id)) {
          continue;
        }

        const currentScore = postScores.get(like.post_id) || 0;
        const userSimilarity = similarUsers.find(u => u.user_id === like.user_id)?.similarity || 0;
        postScores.set(like.post_id, currentScore + userSimilarity);
      }

      // Convert to recommendation items
      for (const [postId, score] of postScores.entries()) {
        const like = likedPosts?.find(l => l.post_id === postId);
        if (like?.posts && score > 0.5) {
          const post = like.posts;
          const analysis = await contentIntelligenceEngine.analyzeContent(
            post.content,
            post.title,
            post.user_id,
            post.space_id
          );

          recommendations.push({
            post_id: post.id,
            title: post.title,
            content: post.content,
            author_id: post.user_id,
            space_id: post.space_id,
            created_at: post.created_at,
            score,
            reason: `Liked by users with similar interests`,
            analysis
          });
        }
      }

      return recommendations;
    } catch (error) {
      logError(classifyError(error, { component: 'RecommendationSystem', operation: 'collaborative', silent: true }));
      return [];
    }
  }

  /**
   * Get trending recommendations
   */
  private async getTrendingRecommendations(
    spaceId: string,
    config: RecommendationConfig
  ): Promise<RecommendationItem[]> {
    try {
      // Get trending topics
      const trendingTopics = await contentIntelligenceEngine.getTrendingTopics(spaceId, '24h');

      // Get recent popular posts
      const { data: posts, error } = await this.supabase
        .from('posts')
        .select('*')
        .eq('space_id', spaceId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('like_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      const recommendations: RecommendationItem[] = [];

      for (const post of posts || []) {
        const analysis = await contentIntelligenceEngine.analyzeContent(
          post.content,
          post.title,
          post.user_id,
          post.space_id
        );

        // Calculate trending score based on topics and engagement
        const trendingScore = this.calculateTrendingScore(analysis, trendingTopics, post);

        if (trendingScore > 0.4) {
          recommendations.push({
            post_id: post.id,
            title: post.title,
            content: post.content,
            author_id: post.user_id,
            space_id: post.space_id,
            created_at: post.created_at,
            score: trendingScore,
            reason: `Trending topic: ${analysis.topics[0] || 'popular content'}`,
            analysis
          });
        }
      }

      return recommendations;
    } catch (error) {
      logError(classifyError(error, { component: 'RecommendationSystem', operation: 'trending', silent: true }));
      return [];
    }
  }

  /**
   * Get or build user profile
   */
  private async getUserProfile(userId: string, spaceId: string): Promise<UserProfile> {
    const cacheKey = `${userId}-${spaceId}`;
    
    if (this.userProfiles.has(cacheKey)) {
      return this.userProfiles.get(cacheKey)!;
    }

    // Build profile from user behavior
    const profile = await this.buildUserProfile(userId, spaceId);
    this.userProfiles.set(cacheKey, profile);
    
    return profile;
  }

  /**
   * Build user profile from behavior data
   */
  private async buildUserProfile(userId: string, spaceId: string): Promise<UserProfile> {
    try {
      // Get user's liked posts
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select(`
          posts (content, title, created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get user's comments
      const { data: comments } = await this.supabase
        .from('post_comments')
        .select('content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Analyze preferences from interactions
      const interests: string[] = [];
      const engagementPatterns: EngagementPattern[] = [];

      for (const like of likedPosts || []) {
        if (like.posts) {
          const analysis = await contentIntelligenceEngine.analyzeContent(
            like.posts.content,
            like.posts.title
          );
          interests.push(...analysis.topics);
        }
      }

      // Calculate engagement patterns
      const topicCounts = new Map<string, number>();
      interests.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });

      Array.from(topicCounts.entries()).forEach(([topic, count]) => {
        engagementPatterns.push({
          topic,
          engagement_score: count / Math.max(interests.length, 1),
          frequency: count,
          last_interaction: new Date().toISOString()
        });
      });

      return {
        user_id: userId,
        preferences: {
          preferred_topics: Array.from(new Set(interests)).slice(0, 10),
          content_types: ['discussion', 'question'], // Default
          complexity_level: 'intermediate',
          reading_time_preference: 5,
          interaction_style: comments && comments.length > 10 ? 'commenter' : 'lurker'
        },
        behavior: {
          posts_liked: likedPosts?.length || 0,
          posts_commented: comments?.length || 0,
          posts_shared: 0,
          time_spent_reading: 0,
          peak_activity_hours: [9, 10, 11, 14, 15, 16], // Default
          preferred_content_length: 'medium'
        },
        interests: Array.from(new Set(interests)),
        engagement_patterns: engagementPatterns
      };
    } catch (error) {
      logError('Failed to build user profile', error);
      // Return default profile
      return {
        user_id: userId,
        preferences: {
          preferred_topics: [],
          content_types: ['discussion'],
          complexity_level: 'intermediate',
          reading_time_preference: 5,
          interaction_style: 'lurker'
        },
        behavior: {
          posts_liked: 0,
          posts_commented: 0,
          posts_shared: 0,
          time_spent_reading: 0,
          peak_activity_hours: [],
          preferred_content_length: 'medium'
        },
        interests: [],
        engagement_patterns: []
      };
    }
  }

  /**
   * Calculate content similarity between user profile and content
   */
  private calculateContentSimilarity(userProfile: UserProfile, analysis: ContentAnalysisResult): number {
    let score = 0;

    // Topic similarity
    const topicOverlap = analysis.topics.filter(topic => 
      userProfile.interests.includes(topic)
    ).length;
    score += (topicOverlap / Math.max(analysis.topics.length, 1)) * 0.4;

    // Content type preference
    if (userProfile.preferences.content_types.includes(analysis.contentType)) {
      score += 0.2;
    }

    // Complexity preference
    if (userProfile.preferences.complexity_level === analysis.complexity) {
      score += 0.2;
    }

    // Reading time preference
    const timeDiff = Math.abs(analysis.readingTimeMinutes - userProfile.preferences.reading_time_preference);
    score += Math.max(0, (5 - timeDiff) / 5) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Find users with similar engagement patterns
   */
  private async findSimilarUsers(userProfile: UserProfile, spaceId: string): Promise<Array<{ user_id: string; similarity: number }>> {
    // Simplified implementation - would use more sophisticated similarity metrics in production
    const { data: spaceMembers } = await this.supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId)
      .neq('user_id', userProfile.user_id)
      .limit(20);

    const similarUsers: Array<{ user_id: string; similarity: number }> = [];

    for (const member of spaceMembers || []) {
      // Calculate similarity based on engagement patterns
      // This is a simplified version - would use cosine similarity or other metrics
      const similarity = Math.random() * 0.5 + 0.3; // Placeholder
      similarUsers.push({ user_id: member.user_id, similarity });
    }

    return similarUsers.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  /**
   * Check if user has interacted with post
   */
  private async hasUserInteracted(userId: string, postId: string): Promise<boolean> {
    const { data: like } = await this.supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    return !!like;
  }

  /**
   * Calculate trending score
   */
  private calculateTrendingScore(
    analysis: ContentAnalysisResult,
    trendingTopics: TopicTrend[],
    post: any
  ): number {
    let score = 0;

    // Topic trending factor
    const topicMatches = analysis.topics.filter(topic =>
      trendingTopics.some(trend => trend.topic === topic)
    );
    score += (topicMatches.length / Math.max(analysis.topics.length, 1)) * 0.5;

    // Engagement factor
    const totalEngagement = (post.like_count || 0) + (post.comment_count || 0);
    score += Math.min(totalEngagement / 20, 1) * 0.3;

    // Recency factor
    const age = Date.now() - new Date(post.created_at).getTime();
    const hoursOld = age / (1000 * 60 * 60);
    score += Math.max(0, (24 - hoursOld) / 24) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Apply freshness factor to recommendations
   */
  private applyFreshnessFactor(recommendations: RecommendationItem[], factor: number): RecommendationItem[] {
    return recommendations.map(rec => {
      const age = Date.now() - new Date(rec.created_at).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      const freshnessFactor = Math.max(0, (7 - daysOld) / 7); // Decay over 7 days
      
      rec.score = rec.score * (1 - factor) + rec.score * freshnessFactor * factor;
      return rec;
    });
  }

  /**
   * Apply diversity filtering
   */
  private applyDiversityFiltering(recommendations: RecommendationItem[], diversityFactor: number): RecommendationItem[] {
    if (diversityFactor === 0) return recommendations;

    const diverseRecs: RecommendationItem[] = [];
    const usedTopics = new Set<string>();

    for (const rec of recommendations.sort((a, b) => b.score - a.score)) {
      const hasNewTopic = rec.analysis.topics.some(topic => !usedTopics.has(topic));
      
      if (hasNewTopic || Math.random() > diversityFactor) {
        diverseRecs.push(rec);
        rec.analysis.topics.forEach(topic => usedTopics.add(topic));
      }
    }

    return diverseRecs;
  }

  /**
   * Calculate confidence score for recommendations
   */
  private calculateConfidenceScore(userProfile: UserProfile, recommendations: RecommendationItem[]): number {
    if (recommendations.length === 0) return 0;

    const avgScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;
    const profileCompleteness = userProfile.interests.length / 10; // Normalize to 0-1
    
    return Math.min(1, avgScore * 0.7 + profileCompleteness * 0.3);
  }

  /**
   * Calculate diversity score for recommendations
   */
  private calculateDiversityScore(recommendations: RecommendationItem[]): number {
    if (recommendations.length === 0) return 0;

    const allTopics = new Set<string>();
    recommendations.forEach(rec => {
      rec.analysis.topics.forEach(topic => allTopics.add(topic));
    });

    return Math.min(1, allTopics.size / (recommendations.length * 2));
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(
    userId: string,
    postId: string,
    interactionType: 'view' | 'like' | 'comment' | 'share',
    spaceId: string
  ): Promise<void> {
    try {
      await logAnalyticsEvent({
        event_type: 'recommendation',
        event_name: 'RecommendationInteraction',
        event_data: {
          user_id: userId,
          post_id: postId,
          interaction_type: interactionType,
          space_id: spaceId
        }
      });

      // Clear user profile cache to rebuild with new interaction
      const cacheKey = `${userId}-${spaceId}`;
      this.userProfiles.delete(cacheKey);
    } catch (error) {
      logError('Failed to record interaction', error);
    }
  }

  /**
   * Get system status and metrics
   */
  public getStatus() {
    return {
      isInitialized: true,
      userProfilesCache: this.userProfiles.size,
      recommendationsCache: this.recommendationCache.size,
      version: '8.0.0-alpha.1'
    };
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.userProfiles.clear();
    this.recommendationCache.clear();
  }
}

// Create global instance
const recommendationSystem = new RecommendationSystem();

export { recommendationSystem, RecommendationSystem };
export type { 
  UserProfile, 
  UserPreferences, 
  UserBehavior, 
  EngagementPattern,
  RecommendationItem, 
  RecommendationSet, 
  RecommendationConfig 
};