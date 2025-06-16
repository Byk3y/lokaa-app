/**
 * Phase 8A: Content Quality Analyzer
 * 
 * Advanced content quality assessment system with automated moderation,
 * spam detection, content optimization suggestions, and quality scoring.
 * 
 * Integrates with Content Intelligence Engine for comprehensive analysis.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { contentIntelligenceEngine } from './contentIntelligenceEngine';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import type { ContentAnalysisResult } from './contentIntelligenceEngine';
import type { Database } from '@/types/supabase';

// Types for content quality analysis
interface QualityAnalysis {
  overall_score: number; // 0-100
  readability: QualityMetric;
  engagement: QualityMetric;
  originality: QualityMetric;
  structure: QualityMetric;
  safety: SafetyAnalysis;
  optimization: OptimizationSuggestions;
  moderation: ModerationResult;
}

interface QualityMetric {
  score: number; // 0-100
  status: 'poor' | 'fair' | 'good' | 'excellent';
  feedback: string;
  suggestions: string[];
}

interface SafetyAnalysis {
  is_safe: boolean;
  safety_score: number; // 0-100
  concerns: SafetyConcern[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface SafetyConcern {
  type: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'privacy' | 'copyright';
  confidence: number; // 0-1
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface OptimizationSuggestions {
  title_suggestions: string[];
  content_improvements: ContentImprovement[];
  seo_recommendations: SEORecommendation[];
  engagement_tips: string[];
}

interface ContentImprovement {
  category: 'structure' | 'clarity' | 'engagement' | 'completeness';
  issue: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  examples?: string[];
}

interface SEORecommendation {
  type: 'keyword' | 'heading' | 'length' | 'meta' | 'linking';
  recommendation: string;
  current_value?: string;
  suggested_value?: string;
  impact: 'low' | 'medium' | 'high';
}

interface ModerationResult {
  action: 'approve' | 'review' | 'flag' | 'block';
  confidence: number; // 0-1
  reasons: string[];
  auto_actionable: boolean;
  human_review_needed: boolean;
}

interface ContentMetrics {
  sentence_count: number;
  avg_sentence_length: number;
  paragraph_count: number;
  avg_paragraph_length: number;
  heading_count: number;
  link_count: number;
  image_count: number;
  code_block_count: number;
  list_count: number;
}

interface SpamIndicators {
  excessive_caps: boolean;
  excessive_punctuation: boolean;
  repetitive_phrases: boolean;
  suspicious_links: boolean;
  keyword_stuffing: boolean;
  duplicate_content: boolean;
  low_effort_content: boolean;
}

class ContentQualityAnalyzer {
  private readonly supabase = getSupabaseClient();
  private qualityCache = new Map<string, QualityAnalysis>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  // Spam detection patterns
  private readonly spamPatterns = {
    excessive_caps: /[A-Z]{4,}/g,
    excessive_punctuation: /[!?]{3,}|\.{4,}/g,
    suspicious_domains: [
      'bit.ly', 'tinyurl.com', 'short.link', 'spam-domain.com'
    ],
    promotional_keywords: [
      'buy now', 'click here', 'limited time', 'act fast', 'free money',
      'guaranteed', 'no risk', 'instant', 'amazing deal'
    ]
  };

  // Inappropriate content patterns
  private readonly inappropriatePatterns = [
    // Harassment patterns
    /\b(idiot|stupid|dumb|loser)\b/i,
    // Explicit content patterns (basic detection)
    /\b(explicit|nsfw|adult)\b/i,
  ];

  /**
   * Analyze content quality comprehensively
   */
  async analyzeQuality(
    content: string,
    title?: string,
    author_id?: string,
    space_id?: string
  ): Promise<QualityAnalysis> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(content, title);
      
      // Check cache
      if (this.qualityCache.has(cacheKey)) {
        return this.qualityCache.get(cacheKey)!;
      }

      // Get content intelligence analysis first
      const intelligenceAnalysis = await contentIntelligenceEngine.analyzeContent(
        content, title, author_id, space_id
      );

      // Perform comprehensive quality analysis
      const qualityAnalysis: QualityAnalysis = {
        overall_score: 0, // Will be calculated
        readability: await this.analyzeReadability(content, intelligenceAnalysis),
        engagement: await this.analyzeEngagement(content, title, intelligenceAnalysis),
        originality: await this.analyzeOriginality(content, space_id),
        structure: this.analyzeStructure(content, title),
        safety: await this.analyzeSafety(content, title),
        optimization: await this.generateOptimizationSuggestions(content, title, intelligenceAnalysis),
        moderation: await this.performModerationCheck(content, title, author_id)
      };

      // Calculate overall score
      qualityAnalysis.overall_score = this.calculateOverallScore(qualityAnalysis);

      // Cache the result
      this.qualityCache.set(cacheKey, qualityAnalysis);

      // Log analytics
      if (author_id && space_id) {
        await logAnalyticsEvent({
          event_type: 'ai',
          event_name: 'ContentQualityAnalyzed',
          event_data: {
            space_id,
            author_id,
            overall_score: qualityAnalysis.overall_score,
            safety_score: qualityAnalysis.safety.safety_score,
            moderation_action: qualityAnalysis.moderation.action,
            content_length: content.length
          }
        });
      }

      return qualityAnalysis;
    } catch (error) {
      logError('Content quality analysis failed', error);
      throw error;
    }
  }

  /**
   * Analyze readability and clarity
   */
  private async analyzeReadability(
    content: string, 
    analysis: ContentAnalysisResult
  ): Promise<QualityMetric> {
    const score = analysis.readabilityScore;
    const metrics = this.calculateContentMetrics(content);
    
    let status: QualityMetric['status'];
    let feedback: string;
    const suggestions: string[] = [];

    // Determine status based on readability score
    if (score >= 80) {
      status = 'excellent';
      feedback = 'Content is highly readable and easy to understand.';
    } else if (score >= 60) {
      status = 'good';
      feedback = 'Content is generally readable with minor improvements possible.';
    } else if (score >= 40) {
      status = 'fair';
      feedback = 'Content readability could be improved.';
      suggestions.push('Consider shorter sentences');
      suggestions.push('Use simpler vocabulary where possible');
    } else {
      status = 'poor';
      feedback = 'Content is difficult to read and understand.';
      suggestions.push('Break down complex sentences');
      suggestions.push('Use shorter paragraphs');
      suggestions.push('Add more white space and structure');
    }

    // Additional suggestions based on metrics
    if (metrics.avg_sentence_length > 25) {
      suggestions.push('Consider shorter sentences (aim for 15-20 words)');
    }
    
    if (metrics.paragraph_count < 3 && content.length > 500) {
      suggestions.push('Break content into more paragraphs for better readability');
    }

    return {
      score: Math.round(score),
      status,
      feedback,
      suggestions
    };
  }

  /**
   * Analyze engagement potential
   */
  private async analyzeEngagement(
    content: string,
    title: string | undefined,
    analysis: ContentAnalysisResult
  ): Promise<QualityMetric> {
    const engagementScore = analysis.engagementPotential * 100;
    const metrics = this.calculateContentMetrics(content);
    
    let status: QualityMetric['status'];
    let feedback: string;
    const suggestions: string[] = [];

    if (engagementScore >= 80) {
      status = 'excellent';
      feedback = 'Content has high engagement potential.';
    } else if (engagementScore >= 60) {
      status = 'good';
      feedback = 'Content should generate good engagement.';
    } else if (engagementScore >= 40) {
      status = 'fair';
      feedback = 'Content may need improvements to increase engagement.';
    } else {
      status = 'poor';
      feedback = 'Content is unlikely to generate much engagement.';
    }

    // Generate engagement suggestions
    if (!title || title.length < 10) {
      suggestions.push('Add a compelling title to increase engagement');
    }

    if (content.includes('?') === false && analysis.contentType !== 'announcement') {
      suggestions.push('Consider adding questions to encourage discussion');
    }

    if (metrics.image_count === 0 && content.length > 300) {
      suggestions.push('Add relevant images or media to increase visual appeal');
    }

    if (analysis.topics.length < 2) {
      suggestions.push('Include more relevant topics to reach a wider audience');
    }

    if (analysis.sentiment === 'negative') {
      suggestions.push('Consider a more positive or neutral tone');
    }

    return {
      score: Math.round(engagementScore),
      status,
      feedback,
      suggestions
    };
  }

  /**
   * Analyze content originality
   */
  private async analyzeOriginality(content: string, space_id?: string): Promise<QualityMetric> {
    try {
      let similarityScore = 0;
      const suggestions: string[] = [];

      if (space_id) {
        // Check for similar content in the space
        const { data: similarPosts } = await this.supabase
          .from('posts')
          .select('content')
          .eq('space_id', space_id)
          .limit(50);

        if (similarPosts) {
          // Simple similarity check (could be enhanced with more sophisticated algorithms)
          const similarities = similarPosts.map(post => 
            this.calculateTextSimilarity(content, post.content)
          );
          
          const maxSimilarity = Math.max(...similarities, 0);
          similarityScore = maxSimilarity * 100;
        }
      }

      const originalityScore = Math.max(0, 100 - similarityScore);
      
      let status: QualityMetric['status'];
      let feedback: string;

      if (originalityScore >= 90) {
        status = 'excellent';
        feedback = 'Content appears to be highly original.';
      } else if (originalityScore >= 70) {
        status = 'good';
        feedback = 'Content is mostly original with good uniqueness.';
      } else if (originalityScore >= 50) {
        status = 'fair';
        feedback = 'Content has some similarities to existing content.';
        suggestions.push('Consider adding more unique insights or perspectives');
      } else {
        status = 'poor';
        feedback = 'Content appears very similar to existing content.';
        suggestions.push('Add more original content and unique viewpoints');
        suggestions.push('Include personal experiences or examples');
      }

      return {
        score: Math.round(originalityScore),
        status,
        feedback,
        suggestions
      };
    } catch (error) {
      logError('Originality analysis failed', error);
      return {
        score: 75, // Default neutral score
        status: 'fair',
        feedback: 'Unable to analyze originality at this time.',
        suggestions: ['Consider adding unique insights to improve originality']
      };
    }
  }

  /**
   * Analyze content structure
   */
  private analyzeStructure(content: string, title?: string): QualityMetric {
    const metrics = this.calculateContentMetrics(content);
    const suggestions: string[] = [];
    
    let structureScore = 70; // Base score

    // Title analysis
    if (!title || title.length < 5) {
      structureScore -= 15;
      suggestions.push('Add a descriptive title');
    } else if (title.length > 100) {
      structureScore -= 5;
      suggestions.push('Consider a shorter, more concise title');
    }

    // Paragraph structure
    if (metrics.paragraph_count < 2 && content.length > 200) {
      structureScore -= 10;
      suggestions.push('Break content into multiple paragraphs');
    }

    // Headings
    if (content.length > 500 && metrics.heading_count === 0) {
      structureScore -= 10;
      suggestions.push('Add headings to organize content');
    }

    // Lists and formatting
    if (content.length > 300 && metrics.list_count === 0 && !content.includes('\n\n')) {
      structureScore -= 5;
      suggestions.push('Consider using bullet points or lists for better organization');
    }

    // Length considerations
    if (content.length < 50) {
      structureScore -= 20;
      suggestions.push('Content is too short - consider adding more detail');
    } else if (content.length > 2000 && metrics.heading_count < 2) {
      structureScore -= 10;
      suggestions.push('Long content should have more structure with headings');
    }

    let status: QualityMetric['status'];
    let feedback: string;

    if (structureScore >= 85) {
      status = 'excellent';
      feedback = 'Content has excellent structure and organization.';
    } else if (structureScore >= 70) {
      status = 'good';
      feedback = 'Content is well-structured with minor improvements possible.';
    } else if (structureScore >= 50) {
      status = 'fair';
      feedback = 'Content structure could be improved.';
    } else {
      status = 'poor';
      feedback = 'Content lacks proper structure and organization.';
    }

    return {
      score: Math.max(0, Math.min(100, structureScore)),
      status,
      feedback,
      suggestions
    };
  }

  /**
   * Analyze content safety and detect harmful content
   */
  private async analyzeSafety(content: string, title?: string): Promise<SafetyAnalysis> {
    const fullText = `${title || ''} ${content}`.toLowerCase();
    const concerns: SafetyConcern[] = [];
    
    // Check for inappropriate content
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(fullText)) {
        concerns.push({
          type: 'inappropriate',
          confidence: 0.8,
          description: 'Content may contain inappropriate language',
          severity: 'medium'
        });
      }
    }

    // Check spam indicators
    const spamIndicators = this.detectSpamIndicators(content, title);
    if (this.isSpamContent(spamIndicators)) {
      concerns.push({
        type: 'spam',
        confidence: 0.9,
        description: 'Content shows signs of spam or promotional material',
        severity: 'high'
      });
    }

    // Calculate overall safety score
    const maxSeverityScore = concerns.reduce((max, concern) => {
      const severityScores = { low: 10, medium: 30, high: 50 };
      return Math.max(max, severityScores[concern.severity]);
    }, 0);

    const safety_score = Math.max(0, 100 - maxSeverityScore);
    const is_safe = safety_score >= 70;
    
    let risk_level: SafetyAnalysis['risk_level'];
    if (safety_score >= 85) risk_level = 'low';
    else if (safety_score >= 70) risk_level = 'medium';
    else if (safety_score >= 50) risk_level = 'high';
    else risk_level = 'critical';

    return {
      is_safe,
      safety_score,
      concerns,
      risk_level
    };
  }

  /**
   * Generate optimization suggestions
   */
  private async generateOptimizationSuggestions(
    content: string,
    title: string | undefined,
    analysis: ContentAnalysisResult
  ): Promise<OptimizationSuggestions> {
    const metrics = this.calculateContentMetrics(content);
    const contentImprovements: ContentImprovement[] = [];
    const seoRecommendations: SEORecommendation[] = [];
    const titleSuggestions: string[] = [];
    const engagementTips: string[] = [];

    // Title suggestions
    if (!title) {
      titleSuggestions.push('Add a compelling title');
    } else {
      if (title.length < 10) {
        titleSuggestions.push('Make title more descriptive');
      }
      if (!title.includes('?') && analysis.contentType === 'question') {
        titleSuggestions.push('Consider adding a question mark to indicate this is a question');
      }
    }

    // Content improvements
    if (metrics.paragraph_count < 3 && content.length > 300) {
      contentImprovements.push({
        category: 'structure',
        issue: 'Long blocks of text without breaks',
        suggestion: 'Break content into smaller paragraphs for better readability',
        impact: 'medium'
      });
    }

    if (analysis.keywords.length < 3) {
      contentImprovements.push({
        category: 'completeness',
        issue: 'Limited keywords detected',
        suggestion: 'Include more relevant keywords naturally in your content',
        impact: 'high',
        examples: ['Add technical terms relevant to your topic', 'Include synonyms and related concepts']
      });
    }

    // SEO recommendations
    if (title && title.length > 60) {
      seoRecommendations.push({
        type: 'meta',
        recommendation: 'Shorten title for better search visibility',
        current_value: `${title.length} characters`,
        suggested_value: 'Under 60 characters',
        impact: 'medium'
      });
    }

    if (content.length < 100) {
      seoRecommendations.push({
        type: 'length',
        recommendation: 'Add more content for better search indexing',
        current_value: `${content.length} characters`,
        suggested_value: 'At least 200 characters',
        impact: 'high'
      });
    }

    // Engagement tips
    if (!content.includes('?')) {
      engagementTips.push('Ask questions to encourage community discussion');
    }

    if (analysis.sentiment === 'negative') {
      engagementTips.push('Consider a more positive or constructive tone');
    }

    if (metrics.link_count === 0 && content.length > 200) {
      engagementTips.push('Add relevant links to external resources or related content');
    }

    return {
      title_suggestions: titleSuggestions,
      content_improvements: contentImprovements,
      seo_recommendations: seoRecommendations,
      engagement_tips: engagementTips
    };
  }

  /**
   * Perform moderation check
   */
  private async performModerationCheck(
    content: string,
    title: string | undefined,
    author_id?: string
  ): Promise<ModerationResult> {
    const safety = await this.analyzeSafety(content, title);
    const spamIndicators = this.detectSpamIndicators(content, title);
    
    let action: ModerationResult['action'] = 'approve';
    let confidence = 0.9;
    const reasons: string[] = [];
    let auto_actionable = true;
    let human_review_needed = false;

    // Determine moderation action based on safety analysis
    if (safety.risk_level === 'critical') {
      action = 'block';
      confidence = 0.95;
      reasons.push('Content poses critical safety risks');
      auto_actionable = true;
    } else if (safety.risk_level === 'high') {
      action = 'flag';
      confidence = 0.8;
      reasons.push('Content may contain harmful material');
      human_review_needed = true;
      auto_actionable = false;
    } else if (this.isSpamContent(spamIndicators)) {
      action = 'review';
      confidence = 0.85;
      reasons.push('Content shows spam characteristics');
      human_review_needed = true;
    } else if (safety.risk_level === 'medium') {
      action = 'review';
      confidence = 0.7;
      reasons.push('Content requires additional review');
      human_review_needed = true;
    }

    return {
      action,
      confidence,
      reasons,
      auto_actionable,
      human_review_needed
    };
  }

  /**
   * Detect spam indicators
   */
  private detectSpamIndicators(content: string, title?: string): SpamIndicators {
    const fullText = `${title || ''} ${content}`;
    
    return {
      excessive_caps: this.spamPatterns.excessive_caps.test(fullText),
      excessive_punctuation: this.spamPatterns.excessive_punctuation.test(fullText),
      repetitive_phrases: this.hasRepetitiveContent(content),
      suspicious_links: this.hasSuspiciousLinks(content),
      keyword_stuffing: this.hasKeywordStuffing(content),
      duplicate_content: false, // Would require database check
      low_effort_content: content.length < 20 || /^(.)\1{10,}/.test(content)
    };
  }

  /**
   * Check if content is spam based on indicators
   */
  private isSpamContent(indicators: SpamIndicators): boolean {
    const spamScore = Object.values(indicators).filter(Boolean).length;
    return spamScore >= 3; // If 3 or more indicators are true, consider it spam
  }

  /**
   * Calculate comprehensive content metrics
   */
  private calculateContentMetrics(content: string): ContentMetrics {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    return {
      sentence_count: sentences.length,
      avg_sentence_length: sentences.length > 0 ? words.length / sentences.length : 0,
      paragraph_count: paragraphs.length,
      avg_paragraph_length: paragraphs.length > 0 ? words.length / paragraphs.length : 0,
      heading_count: (content.match(/^#{1,6}\s/gm) || []).length,
      link_count: (content.match(/https?:\/\/[^\s]+/g) || []).length,
      image_count: (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length,
      code_block_count: (content.match(/```[\s\S]*?```/g) || []).length,
      list_count: (content.match(/^[-*+]\s/gm) || []).length
    };
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Check for repetitive content
   */
  private hasRepetitiveContent(content: string): boolean {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }
    
    // Check if any word appears more than 10% of total words
    const maxFrequency = Math.max(...wordCount.values());
    return maxFrequency > words.length * 0.1;
  }

  /**
   * Check for suspicious links
   */
  private hasSuspiciousLinks(content: string): boolean {
    const links = content.match(/https?:\/\/[^\s]+/g) || [];
    return links.some(link => 
      this.spamPatterns.suspicious_domains.some(domain => link.includes(domain))
    );
  }

  /**
   * Check for keyword stuffing
   */
  private hasKeywordStuffing(content: string): boolean {
    return this.spamPatterns.promotional_keywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(analysis: QualityAnalysis): number {
    const weights = {
      readability: 0.25,
      engagement: 0.25,
      originality: 0.20,
      structure: 0.15,
      safety: 0.15
    };

    const weightedScore = 
      analysis.readability.score * weights.readability +
      analysis.engagement.score * weights.engagement +
      analysis.originality.score * weights.originality +
      analysis.structure.score * weights.structure +
      analysis.safety.safety_score * weights.safety;

    return Math.round(weightedScore);
  }

  /**
   * Generate cache key for content
   */
  private generateCacheKey(content: string, title?: string): string {
    const text = `${title || ''}|${content}`;
    return btoa(text.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Clear analysis cache
   */
  public clearCache(): void {
    this.qualityCache.clear();
  }

  /**
   * Get system status
   */
  public getStatus() {
    return {
      name: 'ContentQualityAnalyzer',
      cache_size: this.qualityCache.size,
      cache_ttl_ms: this.CACHE_TTL,
      status: 'active'
    };
  }
}

// Export singleton instance
export const contentQualityAnalyzer = new ContentQualityAnalyzer();
export default contentQualityAnalyzer;

// Export types for use in other modules
export type {
  QualityAnalysis,
  QualityMetric,
  SafetyAnalysis,
  SafetyConcern,
  OptimizationSuggestions,
  ContentImprovement,
  SEORecommendation,
  ModerationResult,
  ContentMetrics,
  SpamIndicators
}; 