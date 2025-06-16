/**
 * Phase 8A: Intelligent Search with NLP
 * 
 * Advanced search system with natural language processing capabilities,
 * semantic search, auto-complete, and intelligent ranking.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { contentIntelligenceEngine } from './contentIntelligenceEngine';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import type { ContentAnalysisResult } from './contentIntelligenceEngine';
import type { Database } from '@/types/supabase';

// Types for search functionality
interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
}

interface SearchFilters {
  space_id?: string;
  author_id?: string;
  content_type?: string[];
  topics?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  complexity?: ('beginner' | 'intermediate' | 'advanced')[];
  min_engagement?: number;
  has_media?: boolean;
}

interface SearchSort {
  field: 'relevance' | 'date' | 'engagement' | 'quality';
  direction: 'asc' | 'desc';
}

interface SearchPagination {
  offset: number;
  limit: number;
}

interface SearchResult {
  post_id: string;
  title?: string;
  content: string;
  author_id: string;
  author_name?: string;
  space_id: string;
  space_name?: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  relevance_score: number;
  matched_terms: string[];
  highlighted_content: string;
  analysis: ContentAnalysisResult;
}

interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query_analysis: QueryAnalysis;
  search_time_ms: number;
  suggestions?: string[];
  filters_applied: SearchFilters;
}

interface QueryAnalysis {
  original_query: string;
  processed_query: string;
  intent: 'search' | 'question' | 'filter' | 'navigation';
  entities: QueryEntity[];
  keywords: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface QueryEntity {
  text: string;
  type: 'person' | 'topic' | 'date' | 'space' | 'action';
  confidence: number;
}

interface AutoCompleteResult {
  suggestion: string;
  type: 'query' | 'topic' | 'user' | 'space';
  score: number;
  metadata?: any;
}

interface SearchIndex {
  post_id: string;
  content_vector: number[];
  keywords: string[];
  topics: string[];
  last_updated: string;
}

class IntelligentSearchSystem {
  private readonly supabase = getSupabaseClient();
  private searchCache = new Map<string, SearchResponse>();
  private autoCompleteCache = new Map<string, AutoCompleteResult[]>();
  private searchIndex = new Map<string, SearchIndex>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  // Common search stop words
  private readonly searchStopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'about', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was',
    'were', 'find', 'search', 'show', 'get', 'give', 'tell', 'help'
  ]);

  /**
   * Perform intelligent search with NLP processing
   */
  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateSearchCacheKey(searchQuery);
      
      // Check cache
      if (this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey)!;
        const age = Date.now() - startTime;
        if (age < this.CACHE_TTL) {
          return cached;
        }
      }

      // Analyze the query
      const queryAnalysis = await this.analyzeQuery(searchQuery.query);

      // Build search filters
      const filters = this.buildSearchFilters(searchQuery, queryAnalysis);

      // Perform the search
      const results = await this.performSearch(queryAnalysis, filters, searchQuery);

      // Generate suggestions
      const suggestions = await this.generateSearchSuggestions(queryAnalysis);

      // Create response
      const response: SearchResponse = {
        results,
        total_count: results.length,
        query_analysis: queryAnalysis,
        search_time_ms: Date.now() - startTime,
        suggestions,
        filters_applied: filters
      };

      // Cache the response
      this.searchCache.set(cacheKey, response);

      // Log analytics
      await logAnalyticsEvent({
        event_type: 'search',
        event_name: 'IntelligentSearchPerformed',
        event_data: {
          query: searchQuery.query,
          intent: queryAnalysis.intent,
          results_count: results.length,
          search_time_ms: response.search_time_ms,
          has_filters: Object.keys(searchQuery.filters || {}).length > 0
        }
      });

      return response;
    } catch (error) {
      logError(classifyError(error, { 
        component: 'IntelligentSearchSystem', 
        operation: 'search',
        silent: true 
      }));
      throw error;
    }
  }

  /**
   * Analyze search query using NLP
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const processedQuery = this.preprocessQuery(query);
    
    // Extract keywords (removing stop words)
    const keywords = processedQuery
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.searchStopWords.has(word.toLowerCase()))
      .map(word => word.toLowerCase());

    // Detect query intent
    const intent = this.detectQueryIntent(query);

    // Extract entities
    const entities = this.extractEntities(query);

    // Extract topics using content intelligence
    const topics = await contentIntelligenceEngine.extractTopics(query);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(query);

    return {
      original_query: query,
      processed_query: processedQuery,
      intent,
      entities,
      keywords,
      topics,
      sentiment
    };
  }

  /**
   * Preprocess query text
   */
  private preprocessQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Detect query intent
   */
  private detectQueryIntent(query: string): QueryAnalysis['intent'] {
    const lowerQuery = query.toLowerCase();

    // Question patterns
    if (/^(what|where|when|why|how|who|which|can|could|should|would|will|do|does|did|is|are|was|were)\b/.test(lowerQuery) || 
        lowerQuery.includes('?')) {
      return 'question';
    }

    // Filter patterns
    if (/\b(filter|show|display|find|list|get)\b.*\b(by|from|in|with|containing|having)\b/.test(lowerQuery)) {
      return 'filter';
    }

    // Navigation patterns
    if (/\b(go|navigate|visit|open|view)\b/.test(lowerQuery)) {
      return 'navigation';
    }

    return 'search';
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];
    const lowerQuery = query.toLowerCase();

    // Date patterns
    const datePatterns = [
      /\b(today|yesterday|tomorrow)\b/g,
      /\b(last|this|next)\s+(week|month|year|day)\b/g,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g
    ];

    datePatterns.forEach(pattern => {
      const matches = lowerQuery.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            text: match,
            type: 'date',
            confidence: 0.8
          });
        });
      }
    });

    // Action patterns
    const actionPatterns = /\b(create|delete|update|edit|share|like|comment|follow|unfollow|join|leave)\b/g;
    const actionMatches = lowerQuery.match(actionPatterns);
    if (actionMatches) {
      actionMatches.forEach(match => {
        entities.push({
          text: match,
          type: 'action',
          confidence: 0.7
        });
      });
    }

    return entities;
  }

  /**
   * Analyze query sentiment
   */
  private analyzeSentiment(query: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'best', 'awesome', 'love', 'like', 'excellent', 'amazing'];
    const negativeWords = ['bad', 'worst', 'hate', 'terrible', 'awful', 'horrible', 'problem', 'issue'];
    
    const lowerQuery = query.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerQuery.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerQuery.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Build search filters from query and analysis
   */
  private buildSearchFilters(searchQuery: SearchQuery, analysis: QueryAnalysis): SearchFilters {
    const filters: SearchFilters = { ...searchQuery.filters };

    // Add topic filters from analysis
    if (analysis.topics.length > 0 && !filters.topics) {
      filters.topics = analysis.topics;
    }

    // Add date filters from entities
    const dateEntities = analysis.entities.filter(e => e.type === 'date');
    if (dateEntities.length > 0 && !filters.date_range) {
      // Convert date entities to date range (simplified)
      const now = new Date();
      if (dateEntities.some(e => e.text.includes('today'))) {
        filters.date_range = {
          start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
          end: new Date(now.setHours(23, 59, 59, 999)).toISOString()
        };
      } else if (dateEntities.some(e => e.text.includes('week'))) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filters.date_range = {
          start: weekAgo.toISOString(),
          end: now.toISOString()
        };
      }
    }

    return filters;
  }

  /**
   * Perform the actual search
   */
  private async performSearch(
    analysis: QueryAnalysis,
    filters: SearchFilters,
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      // Build SQL query based on filters
      let query = this.supabase
        .from('posts')
        .select(`
          id, title, content, user_id, space_id, created_at, like_count, comment_count,
          users (full_name),
          spaces (name)
        `);

      // Apply filters
      if (filters.space_id) {
        query = query.eq('space_id', filters.space_id);
      }

      if (filters.author_id) {
        query = query.eq('user_id', filters.author_id);
      }

      if (filters.date_range) {
        query = query.gte('created_at', filters.date_range.start)
                     .lte('created_at', filters.date_range.end);
      }

      if (filters.min_engagement) {
        // Note: This would require a computed column in production
        query = query.gte('like_count', filters.min_engagement);
      }

      // Text search
      if (analysis.keywords.length > 0) {
        const searchTerms = analysis.keywords.join(' | ');
        query = query.textSearch('content', searchTerms);
      }

      // Execute query
      const { data: posts, error } = await query
        .order(searchQuery.sort?.field === 'date' ? 'created_at' : 'like_count', 
               { ascending: searchQuery.sort?.direction === 'asc' })
        .limit(searchQuery.pagination?.limit || 50)
        .range(searchQuery.pagination?.offset || 0, 
               (searchQuery.pagination?.offset || 0) + (searchQuery.pagination?.limit || 50) - 1);

      if (error) throw error;

      // Process results
      const results: SearchResult[] = [];

      for (const post of posts || []) {
        // Analyze content for better ranking
        const contentAnalysis = await contentIntelligenceEngine.analyzeContent(
          post.content,
          post.title,
          post.user_id,
          post.space_id
        );

        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore(analysis, contentAnalysis, post);

        // Find matched terms
        const matchedTerms = this.findMatchedTerms(analysis.keywords, post.content, post.title);

        // Generate highlighted content
        const highlightedContent = this.highlightContent(post.content, matchedTerms);

        results.push({
          post_id: post.id,
          title: post.title,
          content: post.content,
          author_id: post.user_id,
          author_name: (post.users as any)?.full_name,
          space_id: post.space_id,
          space_name: (post.spaces as any)?.name,
          created_at: post.created_at,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          relevance_score: relevanceScore,
          matched_terms: matchedTerms,
          highlighted_content: highlightedContent,
          analysis: contentAnalysis
        });
      }

      // Sort by relevance if not sorted by other criteria
      if (!searchQuery.sort || searchQuery.sort.field === 'relevance') {
        results.sort((a, b) => b.relevance_score - a.relevance_score);
      }

      // Apply content type and complexity filters
      return results.filter(result => {
        if (filters.content_type && !filters.content_type.includes(result.analysis.contentType)) {
          return false;
        }
        if (filters.complexity && !filters.complexity.includes(result.analysis.complexity)) {
          return false;
        }
        if (filters.topics && !filters.topics.some(topic => result.analysis.topics.includes(topic))) {
          return false;
        }
        return true;
      });

    } catch (error) {
      logError('Search execution failed', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for search result
   */
  private calculateRelevanceScore(
    query: QueryAnalysis,
    content: ContentAnalysisResult,
    post: any
  ): number {
    let score = 0;

    // Keyword matching in content
    const contentText = `${post.title || ''} ${post.content}`.toLowerCase();
    const keywordMatches = query.keywords.filter(keyword => 
      contentText.includes(keyword.toLowerCase())
    );
    score += (keywordMatches.length / Math.max(query.keywords.length, 1)) * 0.4;

    // Topic matching
    const topicMatches = query.topics.filter(topic => 
      content.topics.includes(topic)
    );
    score += (topicMatches.length / Math.max(query.topics.length, 1)) * 0.3;

    // Engagement factor
    const engagement = (post.like_count || 0) + (post.comment_count || 0);
    score += Math.min(engagement / 20, 1) * 0.2;

    // Content quality factor
    score += content.qualityScore * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Find matched terms in content
   */
  private findMatchedTerms(keywords: string[], content: string, title?: string): string[] {
    const text = `${title || ''} ${content}`.toLowerCase();
    return keywords.filter(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Highlight matched terms in content
   */
  private highlightContent(content: string, matchedTerms: string[]): string {
    let highlighted = content;
    
    matchedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<mark>$&</mark>`);
    });

    // Truncate to show relevant context (around 200 characters)
    const firstMatch = matchedTerms[0];
    if (firstMatch) {
      const index = highlighted.toLowerCase().indexOf(firstMatch.toLowerCase());
      if (index > 100) {
        const start = Math.max(0, index - 100);
        const end = Math.min(highlighted.length, index + 100);
        highlighted = '...' + highlighted.substring(start, end) + '...';
      }
    }

    return highlighted.substring(0, 300); // Limit length
  }

  /**
   * Generate search suggestions
   */
  private async generateSearchSuggestions(analysis: QueryAnalysis): Promise<string[]> {
    const suggestions: string[] = [];

    // Add topic-based suggestions
    analysis.topics.forEach(topic => {
      suggestions.push(`Find more about ${topic}`);
      suggestions.push(`Recent ${topic} discussions`);
    });

    // Add intent-based suggestions
    if (analysis.intent === 'question') {
      suggestions.push(`How to ${analysis.keywords.join(' ')}`);
      suggestions.push(`${analysis.keywords.join(' ')} tutorial`);
    }

    // Add keyword variations
    analysis.keywords.forEach(keyword => {
      suggestions.push(`${keyword} guide`);
      suggestions.push(`Best ${keyword} practices`);
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get auto-complete suggestions
   */
  async getAutoComplete(partialQuery: string, limit = 10): Promise<AutoCompleteResult[]> {
    try {
      const cacheKey = `autocomplete:${partialQuery}`;
      
      // Check cache
      if (this.autoCompleteCache.has(cacheKey)) {
        return this.autoCompleteCache.get(cacheKey)!;
      }

      const suggestions: AutoCompleteResult[] = [];

      if (partialQuery.length < 2) {
        return suggestions;
      }

      // Get popular search terms (simplified - would use search logs in production)
      const popularTerms = [
        'how to', 'best practices', 'tutorial', 'guide', 'help',
        'javascript', 'react', 'nodejs', 'database', 'api'
      ];

      // Match popular terms
      popularTerms
        .filter(term => term.toLowerCase().includes(partialQuery.toLowerCase()))
        .forEach(term => {
          suggestions.push({
            suggestion: term,
            type: 'query',
            score: 0.8
          });
        });

      // Get topic suggestions
      const topics = await contentIntelligenceEngine.getTrendingTopics('', '7d');
      topics
        .filter(topic => topic.topic.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, 3)
        .forEach(topic => {
          suggestions.push({
            suggestion: topic.topic,
            type: 'topic',
            score: topic.score,
            metadata: { posts: topic.posts, engagement: topic.engagement }
          });
        });

      // Sort by score and limit
      const results = suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache results
      this.autoCompleteCache.set(cacheKey, results);

      return results;
    } catch (error) {
      logError('Auto-complete failed', error);
      return [];
    }
  }

  /**
   * Save search to user's search history
   */
  async saveSearchHistory(userId: string, query: string, resultsCount: number): Promise<void> {
    try {
      await logAnalyticsEvent({
        event_type: 'search',
        event_name: 'SearchHistorySaved',
        event_data: {
          user_id: userId,
          query,
          results_count: resultsCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logError('Failed to save search history', error);
    }
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(userId: string, limit = 20): Promise<string[]> {
    try {
      // This would query analytics_events in production
      // For now, returning empty array as placeholder
      return [];
    } catch (error) {
      logError('Failed to get search history', error);
      return [];
    }
  }

  /**
   * Generate cache key for search
   */
  private generateSearchCacheKey(searchQuery: SearchQuery): string {
    const key = JSON.stringify({
      query: searchQuery.query,
      filters: searchQuery.filters,
      sort: searchQuery.sort,
      pagination: searchQuery.pagination
    });
    return btoa(key).substring(0, 32);
  }

  /**
   * Clear search caches
   */
  public clearCache(): void {
    this.searchCache.clear();
    this.autoCompleteCache.clear();
  }

  /**
   * Get search system status
   */
  public getStatus() {
    return {
      isInitialized: true,
      searchCache: this.searchCache.size,
      autoCompleteCache: this.autoCompleteCache.size,
      searchIndex: this.searchIndex.size,
      version: '8.0.0-alpha.1'
    };
  }
}

// Create global instance
const intelligentSearchSystem = new IntelligentSearchSystem();

export { intelligentSearchSystem, IntelligentSearchSystem };
export type { 
  SearchQuery, 
  SearchFilters, 
  SearchSort, 
  SearchPagination,
  SearchResult, 
  SearchResponse, 
  QueryAnalysis, 
  QueryEntity,
  AutoCompleteResult 
};