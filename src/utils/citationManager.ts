/**
 * Citation Manager
 * 
 * Manages local business citations and directory listings
 * Phase 4.1: Local SEO Implementation
 */

import { log } from '@/utils/logger';

export interface CitationData {
  platform: string;
  url: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'needs_update';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  lastUpdated: Date;
  notes?: string;
  requiredFields: string[];
  completedFields: string[];
}

export interface CitationPlatform {
  name: string;
  url: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredFields: string[];
  optionalFields: string[];
  submissionUrl: string;
  guidelines: string[];
}

class CitationManager {
  private citations: CitationData[] = [];
  private platforms: CitationPlatform[] = [];

  constructor() {
    this.initializePlatforms();
    log.debug('CitationManager', 'Citation manager initialized');
  }

  /**
   * Initialize supported citation platforms
   */
  private initializePlatforms(): void {
    this.platforms = [
      {
        name: 'Google My Business',
        url: 'https://business.google.com',
        category: 'Primary Directory',
        priority: 'critical',
        requiredFields: ['business_name', 'address', 'phone', 'website', 'category', 'description'],
        optionalFields: ['hours', 'photos', 'videos', 'posts', 'reviews'],
        submissionUrl: 'https://business.google.com',
        guidelines: [
          'Complete all required fields',
          'Upload high-quality photos',
          'Regular posts and updates',
          'Respond to reviews promptly',
        ],
      },
      {
        name: 'Yelp',
        url: 'https://biz.yelp.com',
        category: 'Review Platform',
        priority: 'high',
        requiredFields: ['business_name', 'address', 'phone', 'website', 'category', 'description'],
        optionalFields: ['hours', 'photos', 'videos', 'posts', 'specialties'],
        submissionUrl: 'https://biz.yelp.com',
        guidelines: [
          'Complete business profile',
          'Add photos and videos',
          'Encourage customer reviews',
          'Regular posts about features',
        ],
      },
      {
        name: 'Better Business Bureau',
        url: 'https://www.bbb.org',
        category: 'Trust & Safety',
        priority: 'high',
        requiredFields: ['business_name', 'address', 'phone', 'website', 'category', 'description'],
        optionalFields: ['hours', 'accreditation', 'complaints', 'reviews'],
        submissionUrl: 'https://www.bbb.org',
        guidelines: [
          'Register business',
          'Complete profile',
          'Respond to reviews',
          'Maintain A+ rating',
        ],
      },
      {
        name: 'Crunchbase',
        url: 'https://www.crunchbase.com',
        category: 'Startup Directory',
        priority: 'high',
        requiredFields: ['company_name', 'website', 'description', 'industry', 'founded_date'],
        optionalFields: ['funding', 'team', 'milestones', 'news', 'social_links'],
        submissionUrl: 'https://www.crunchbase.com',
        guidelines: [
          'Create company profile',
          'Add funding information',
          'Update milestones',
          'Add team members',
        ],
      },
      {
        name: 'LinkedIn Company Page',
        url: 'https://www.linkedin.com/company',
        category: 'Professional Network',
        priority: 'high',
        requiredFields: ['company_name', 'website', 'description', 'industry', 'company_size'],
        optionalFields: ['logo', 'banner', 'posts', 'jobs', 'employees'],
        submissionUrl: 'https://www.linkedin.com/company',
        guidelines: [
          'Complete company profile',
          'Add team members',
          'Share regular updates',
          'Engage with followers',
        ],
      },
      {
        name: 'Product Hunt',
        url: 'https://www.producthunt.com',
        category: 'Product Launch',
        priority: 'medium',
        requiredFields: ['product_name', 'description', 'website', 'category', 'launch_date'],
        optionalFields: ['screenshots', 'videos', 'maker_profile', 'updates'],
        submissionUrl: 'https://www.producthunt.com',
        guidelines: [
          'Submit product for launch',
          'Create maker profile',
          'Engage with community',
          'Regular product updates',
        ],
      },
      {
        name: 'Yellow Pages',
        url: 'https://www.yellowpages.com',
        category: 'Local Directory',
        priority: 'medium',
        requiredFields: ['business_name', 'address', 'phone', 'website', 'category'],
        optionalFields: ['hours', 'photos', 'reviews', 'description'],
        submissionUrl: 'https://www.yellowpages.com',
        guidelines: [
          'Create business listing',
          'Add contact information',
          'Upload photos',
          'Encourage reviews',
        ],
      },
      {
        name: 'Facebook Business Page',
        url: 'https://www.facebook.com/business',
        category: 'Social Media',
        priority: 'high',
        requiredFields: ['page_name', 'category', 'description', 'website', 'contact_info'],
        optionalFields: ['profile_photo', 'cover_photo', 'posts', 'events', 'reviews'],
        submissionUrl: 'https://www.facebook.com/business',
        guidelines: [
          'Complete business profile',
          'Regular posts and updates',
          'Engage with followers',
          'Share community stories',
        ],
      },
    ];
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): CitationPlatform[] {
    return [...this.platforms];
  }

  /**
   * Get platforms by priority
   */
  getPlatformsByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): CitationPlatform[] {
    return this.platforms.filter(platform => platform.priority === priority);
  }

  /**
   * Get platforms by category
   */
  getPlatformsByCategory(category: string): CitationPlatform[] {
    return this.platforms.filter(platform => platform.category === category);
  }

  /**
   * Create a new citation
   */
  createCitation(platform: string, data: Partial<CitationData>): CitationData {
    const platformInfo = this.platforms.find(p => p.name === platform);
    if (!platformInfo) {
      throw new Error(`Platform not found: ${platform}`);
    }

    const citation: CitationData = {
      platform,
      url: platformInfo.submissionUrl,
      status: 'pending',
      priority: platformInfo.priority,
      category: platformInfo.category,
      lastUpdated: new Date(),
      requiredFields: platformInfo.requiredFields,
      completedFields: [],
      ...data,
    };

    this.citations.push(citation);
    log.debug('CitationManager', `Created citation for ${platform}`);
    return citation;
  }

  /**
   * Update citation status
   */
  updateCitationStatus(platform: string, status: CitationData['status'], notes?: string): void {
    const citation = this.citations.find(c => c.platform === platform);
    if (citation) {
      citation.status = status;
      citation.lastUpdated = new Date();
      if (notes) {
        citation.notes = notes;
      }
      log.debug('CitationManager', `Updated ${platform} citation status to ${status}`);
    }
  }

  /**
   * Mark field as completed
   */
  markFieldCompleted(platform: string, field: string): void {
    const citation = this.citations.find(c => c.platform === platform);
    if (citation && !citation.completedFields.includes(field)) {
      citation.completedFields.push(field);
      citation.lastUpdated = new Date();
      log.debug('CitationManager', `Marked ${field} as completed for ${platform}`);
    }
  }

  /**
   * Get citation completion percentage
   */
  getCitationCompletion(platform: string): number {
    const citation = this.citations.find(c => c.platform === platform);
    if (!citation) return 0;

    const totalFields = citation.requiredFields.length;
    const completedFields = citation.completedFields.length;
    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Get all citations
   */
  getAllCitations(): CitationData[] {
    return [...this.citations];
  }

  /**
   * Get citations by status
   */
  getCitationsByStatus(status: CitationData['status']): CitationData[] {
    return this.citations.filter(citation => citation.status === status);
  }

  /**
   * Get citations by priority
   */
  getCitationsByPriority(priority: CitationData['priority']): CitationData[] {
    return this.citations.filter(citation => citation.priority === priority);
  }

  /**
   * Get citation statistics
   */
  getCitationStats(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageCompletion: number;
  } {
    const total = this.citations.length;
    const byStatus = this.citations.reduce((acc, citation) => {
      acc[citation.status] = (acc[citation.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = this.citations.reduce((acc, citation) => {
      acc[citation.priority] = (acc[citation.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageCompletion = this.citations.length > 0
      ? this.citations.reduce((sum, citation) => sum + this.getCitationCompletion(citation.platform), 0) / this.citations.length
      : 0;

    return {
      total,
      byStatus,
      byPriority,
      averageCompletion: Math.round(averageCompletion),
    };
  }

  /**
   * Generate citation report
   */
  generateCitationReport(): string {
    const stats = this.getCitationStats();
    const report = [
      '# Citation Management Report',
      '',
      `## Summary`,
      `- Total Citations: ${stats.total}`,
      `- Average Completion: ${stats.averageCompletion}%`,
      '',
      `## Status Breakdown`,
      ...Object.entries(stats.byStatus).map(([status, count]) => `- ${status}: ${count}`),
      '',
      `## Priority Breakdown`,
      ...Object.entries(stats.byPriority).map(([priority, count]) => `- ${priority}: ${count}`),
      '',
      `## Citation Details`,
      ...this.citations.map(citation => [
        `### ${citation.platform}`,
        `- Status: ${citation.status}`,
        `- Priority: ${citation.priority}`,
        `- Completion: ${this.getCitationCompletion(citation.platform)}%`,
        `- Last Updated: ${citation.lastUpdated.toLocaleDateString()}`,
        citation.notes ? `- Notes: ${citation.notes}` : '',
      ].filter(Boolean).join('\n')),
    ];

    return report.join('\n');
  }

  /**
   * Get next actions for citations
   */
  getNextActions(): Array<{
    platform: string;
    action: string;
    priority: string;
    url: string;
  }> {
    const actions: Array<{
      platform: string;
      action: string;
      priority: string;
      url: string;
    }> = [];

    this.citations.forEach(citation => {
      if (citation.status === 'pending') {
        actions.push({
          platform: citation.platform,
          action: 'Complete profile setup',
          priority: citation.priority,
          url: citation.url,
        });
      } else if (citation.status === 'needs_update') {
        actions.push({
          platform: citation.platform,
          action: 'Update profile information',
          priority: citation.priority,
          url: citation.url,
        });
      }
    });

    return actions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  }
}

// Export singleton instance
export const citationManager = new CitationManager();
