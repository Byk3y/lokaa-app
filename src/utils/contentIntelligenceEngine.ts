/**
 * Phase 8A: Content Intelligence Engine
 * 
 * Core AI engine for content analysis, automatic tagging, topic extraction,
 * content similarity scoring, and trending topic detection.
 * 
 * Foundation for all AI/ML features in Phase 8
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import type { Database } from '@/types/supabase';

// Types for content analysis
interface ContentAnalysis {
  id: string;
  content: string;
  title?: string;
  author_id: string;
  space_id: string;
  created_at: string;
  analysis: ContentAnalysisResult;
}

interface ContentAnalysisResult {
  topics: string[];
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  readabilityScore: number; // 0 to 100
  engagementPotential: number; // 0 to 1
  qualityScore: number; // 0 to 1
  wordCount: number;
  readingTimeMinutes: number;
  keywords: Array<{ word: string; score: number }>;
  contentType: 'discussion' | 'question' | 'announcement' | 'tutorial' | 'other';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

interface TopicTrend {
  topic: string;
  score: number;
  posts: number;
  engagement: number;
  timeframe: '1h' | '24h' | '7d' | '30d';
  growth: number; // percentage change
}

interface ContentSimilarity {
  postId: string;
  similarity: number;
  commonTopics: string[];
  commonKeywords: string[];
}

class ContentIntelligenceEngine {
  private readonly supabase = getSupabaseClient();
  private analysisCache = new Map<string, ContentAnalysisResult>();
  private topicTrendsCache = new Map<string, TopicTrend[]>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  // Common stop words for content analysis
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);

  /**
   * Analyze content and extract intelligence
   */
  async analyzeContent(
    content: string,
    title?: string,
    author_id?: string,
    space_id?: string
  ): Promise<ContentAnalysisResult> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(content, title);
      
      // Check cache first
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey)!;
      }

      // Perform comprehensive analysis
      const analysis: ContentAnalysisResult = {
        topics: await this.extractTopics(content, title),
        tags: await this.generateTags(content, title),
        sentiment: this.analyzeSentiment(content),
        sentimentScore: this.calculateSentimentScore(content),
        readabilityScore: this.calculateReadabilityScore(content),
        engagementPotential: await this.predictEngagementPotential(content, title, space_id),
        qualityScore: this.calculateQualityScore(content, title),
        wordCount: this.getWordCount(content),
        readingTimeMinutes: this.calculateReadingTime(content),
        keywords: this.extractKeywords(content, title),
        contentType: this.classifyContentType(content, title),
        complexity: this.assessComplexity(content),
      };

      // Cache the result
      this.analysisCache.set(cacheKey, analysis);

      // Log analytics event
      if (author_id && space_id) {
        await logAnalyticsEvent({
          event_type: 'ai',
          event_name: 'ContentAnalyzed',
          event_data: {
            space_id,
            content_length: content.length,
            topics_found: analysis.topics.length,
            sentiment: analysis.sentiment,
            quality_score: analysis.qualityScore,
            content_type: analysis.contentType
          }
        });
      }

      return analysis;
    } catch (error) {
      logError('Content analysis failed', error);
      throw error;
    }
  }

  /**
   * Extract topics from content using keyword analysis and pattern matching
   */
  public async extractTopics(content: string, title?: string): Promise<string[]> {
    const text = `${title || ''} ${content}`.toLowerCase();
    const topics: string[] = [];

    // Define topic patterns and keywords
    const topicPatterns = {
      'technology': ['tech', 'software', 'programming', 'code', 'development', 'api', 'database', 'web', 'mobile', 'ai', 'ml'],
      'business': ['business', 'startup', 'entrepreneur', 'market', 'sales', 'revenue', 'growth', 'strategy'],
      'design': ['design', 'ui', 'ux', 'interface', 'user experience', 'visual', 'prototype', 'figma'],
      'education': ['learn', 'teach', 'course', 'tutorial', 'guide', 'education', 'training', 'knowledge'],
      'health': ['health', 'fitness', 'wellness', 'medical', 'diet', 'exercise', 'mental health'],
      'finance': ['money', 'finance', 'investment', 'crypto', 'blockchain', 'trading', 'economy'],
      'community': ['community', 'social', 'networking', 'collaboration', 'team', 'group'],
      'announcement': ['announce', 'news', 'update', 'release', 'launch', 'important'],
      'question': ['how', 'what', 'why', 'when', 'where', 'help', 'question', '?'],
      'discussion': ['discuss', 'thoughts', 'opinion', 'debate', 'share', 'experience']
    };

    // Check for topic matches
    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        topics.push(topic);
      }
    }

    // Extract hashtags as topics
    const hashtagRegex = /#(\w+)/g;
    const hashtags = text.match(hashtagRegex);
    if (hashtags) {
      topics.push(...hashtags.map(tag => tag.substring(1)));
    }

    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * Generate relevant tags for content
   */
  private async generateTags(content: string, title?: string): Promise<string[]> {
    const keywords = this.extractKeywords(content, title);
    const topics = await this.extractTopics(content, title);
    
    // Combine top keywords and topics as tags
    const tags = [
      ...topics,
      ...keywords.slice(0, 10).map(k => k.word)
    ];

    return [...new Set(tags)].slice(0, 15); // Limit to 15 unique tags
  }

  /**
   * Analyze sentiment of content
   */
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const score = this.calculateSentimentScore(content);
    
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate sentiment score (-1 to 1)
   */
  private calculateSentimentScore(content: string): number {
    const text = content.toLowerCase();
    
    // Simple word-based sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'like', 'best', 'wonderful', 'fantastic', 'happy', 'excited', 'perfect', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'annoying', 'frustrated', 'angry', 'disappointed', 'sad', 'broken', 'problem'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0;
    
    return (positiveCount - negativeCount) / Math.max(totalSentimentWords, 1);
  }

  /**
   * Calculate readability score (0-100, higher is more readable)
   */
  private calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 50;
    
    // Simplified Flesch Reading Ease formula
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  /**
   * Predict engagement potential based on content features
   */
  private async predictEngagementPotential(content: string, title?: string, space_id?: string): Promise<number> {
    let score = 0.5; // Base score
    
    // Length factor (optimal around 100-500 words)
    const wordCount = this.getWordCount(content);
    if (wordCount >= 50 && wordCount <= 1000) {
      score += 0.1;
    }
    
    // Question factor
    if (content.includes('?') || title?.includes('?')) {
      score += 0.15;
    }
    
    // Call-to-action factor
    const ctaWords = ['comment', 'share', 'thoughts', 'opinion', 'experience', 'help', 'advice'];
    if (ctaWords.some(word => content.toLowerCase().includes(word))) {
      score += 0.1;
    }
    
    // Media factor
    if (content.includes('http') || content.includes('image') || content.includes('video')) {
      score += 0.1;
    }
    
    // Sentiment factor
    const sentimentScore = this.calculateSentimentScore(content);
    if (Math.abs(sentimentScore) > 0.3) {
      score += 0.1; // Strong sentiment tends to drive engagement
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate overall content quality score
   */
  private calculateQualityScore(content: string, title?: string): number {
    let score = 0;
    
    // Length quality (penalize too short or too long)
    const wordCount = this.getWordCount(content);
    if (wordCount >= 20 && wordCount <= 2000) {
      score += 0.3;
    } else if (wordCount >= 10) {
      score += 0.1;
    }
    
    // Structure quality
    if (title && title.length > 5) score += 0.1;
    if (content.includes('\n') || content.includes('.')) score += 0.1; // Has paragraphs or sentences
    
    // Content richness
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    const vocabularyRichness = uniqueWords / Math.max(wordCount, 1);
    if (vocabularyRichness > 0.6) score += 0.2;
    
    // Grammar indicators (basic)
    const capitalLetters = (content.match(/[A-Z]/g) || []).length;
    if (capitalLetters > 0) score += 0.1;
    
    // Information density
    const informationWords = content.split(/\s+/).filter(word => 
      word.length > 4 && !this.stopWords.has(word.toLowerCase())
    ).length;
    if (informationWords / Math.max(wordCount, 1) > 0.3) score += 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get word count
   */
  private getWordCount(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate estimated reading time
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.getWordCount(content);
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Extract keywords with scores
   */
  private extractKeywords(content: string, title?: string): Array<{ word: string; score: number }> {
    const text = `${title || ''} ${content}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => 
      word.length > 3 && 
      !this.stopWords.has(word) &&
      /^[a-zA-Z]+$/.test(word)
    );
    
    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Calculate TF-IDF style scores (simplified)
    const keywords = Array.from(wordCount.entries()).map(([word, count]) => ({
      word,
      score: count / words.length
    }));
    
    // Sort by score and return top keywords
    return keywords.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  /**
   * Classify content type
   */
  private classifyContentType(content: string, title?: string): ContentAnalysisResult['contentType'] {
    const text = `${title || ''} ${content}`.toLowerCase();
    
    if (text.includes('?') || text.includes('help') || text.includes('how')) {
      return 'question';
    }
    
    if (text.includes('announce') || text.includes('news') || text.includes('update')) {
      return 'announcement';
    }
    
    if (text.includes('tutorial') || text.includes('guide') || text.includes('step')) {
      return 'tutorial';
    }
    
    if (text.includes('discuss') || text.includes('thoughts') || text.includes('opinion')) {
      return 'discussion';
    }
    
    return 'other';
  }

  /**
   * Assess content complexity
   */
  private assessComplexity(content: string): ContentAnalysisResult['complexity'] {
    const readabilityScore = this.calculateReadabilityScore(content);
    const avgWordLength = content.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / Math.max(this.getWordCount(content), 1);
    
    // Technical terms indicator
    const technicalTerms = ['algorithm', 'implementation', 'architecture', 'framework', 'methodology'];
    const hasTechnicalTerms = technicalTerms.some(term => content.toLowerCase().includes(term));
    
    if (readabilityScore > 70 && avgWordLength < 5 && !hasTechnicalTerms) {
      return 'beginner';
    }
    
    if (readabilityScore < 50 || avgWordLength > 6 || hasTechnicalTerms) {
      return 'advanced';
    }
    
    return 'intermediate';
  }

  /**
   * Find similar content based on topics and keywords
   */
  async findSimilarContent(postId: string, limit = 10): Promise<ContentSimilarity[]> {
    try {
      // This would typically query a vector database or use embeddings
      // For now, implementing a simplified approach using cached analysis
      
      const similarities: ContentSimilarity[] = [];
      
      // In a real implementation, this would use semantic search
      // For now, returning empty array as placeholder
      
      return similarities;
    } catch (error) {
      logError('Failed to find similar content', error);
      return [];
    }
  }

  /**
   * Get trending topics for a space
   */
  async getTrendingTopics(spaceId: string, timeframe: TopicTrend['timeframe'] = '24h'): Promise<TopicTrend[]> {
    try {
      const cacheKey = `${spaceId}-${timeframe}`;
      
      // Check cache
      if (this.topicTrendsCache.has(cacheKey)) {
        return this.topicTrendsCache.get(cacheKey)!;
      }
      
      // Query recent posts in the space
      const timeframeDays = this.getTimeframeDays(timeframe);
      const since = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: posts, error } = await this.supabase
        .from('posts')
        .select('id, content, title, created_at, like_count, comment_count')
        .eq('space_id', spaceId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Analyze topics from posts
      const topicCounts = new Map<string, { count: number; engagement: number }>();
      
      for (const post of posts || []) {
        const topics = await this.extractTopics(post.content, post.title);
        const engagement = (post.like_count || 0) + (post.comment_count || 0);
        
        topics.forEach(topic => {
          const current = topicCounts.get(topic) || { count: 0, engagement: 0 };
          topicCounts.set(topic, {
            count: current.count + 1,
            engagement: current.engagement + engagement
          });
        });
      }
      
      // Convert to trend objects
      const trends: TopicTrend[] = Array.from(topicCounts.entries()).map(([topic, data]) => ({
        topic,
        score: data.count * (1 + data.engagement / 10),
        posts: data.count,
        engagement: data.engagement,
        timeframe,
        growth: 0 // Would calculate from historical data
      }));
      
      // Sort by score and limit
      trends.sort((a, b) => b.score - a.score);
      const topTrends = trends.slice(0, 10);
      
      // Cache results
      this.topicTrendsCache.set(cacheKey, topTrends);
      
      return topTrends;
    } catch (error) {
      logError('Failed to get trending topics', error);
      return [];
    }
  }

  /**
   * Generate cache key for content
   */
  private generateCacheKey(content: string, title?: string): string {
    const text = `${title || ''}${content}`;
    return btoa(text).substring(0, 20);
  }

  /**
   * Convert timeframe to days
   */
  private getTimeframeDays(timeframe: TopicTrend['timeframe']): number {
    switch (timeframe) {
      case '1h': return 1/24;
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 1;
    }
  }

  /**
   * Clear caches
   */
  public clearCache(): void {
    this.analysisCache.clear();
    this.topicTrendsCache.clear();
  }

  /**
   * Get engine status and metrics
   */
  public getStatus() {
    return {
      isInitialized: true,
      cacheSize: this.analysisCache.size,
      trendsCache: this.topicTrendsCache.size,
      version: '8.0.0-alpha.1'
    };
  }
}

// Create global instance
const contentIntelligenceEngine = new ContentIntelligenceEngine();

export { contentIntelligenceEngine, ContentIntelligenceEngine };
export type { ContentAnalysis, ContentAnalysisResult, TopicTrend, ContentSimilarity };