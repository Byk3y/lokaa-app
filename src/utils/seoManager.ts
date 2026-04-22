import { log } from '@/utils/logger';
import { schemaGenerator, type SchemaData } from './schemaGenerator';
import { localSEO, type LocalBusinessSchema } from './localSEO';
// =====================================
// SEO & METADATA MANAGEMENT SYSTEM
// =====================================
// Phase 7: Production-ready SEO optimization + Phase 1 SEO Enhancement

// Type declarations for global analytics functions
declare global {
  function gtag(...args: any[]): void;
}

interface SEOData {
  title: string;
  description: string;
  canonical: string;
  openGraph: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    site_name?: string;
    article?: {
      author: string;
      published_time: string;
      section: string;
    };
    profile?: {
      first_name: string;
      last_name: string;
      username: string;
    };
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
    creator?: string;
    site?: string;
  };
  schema?: any;
  keywords?: string[];
}

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
  key: string;
}

export class SEOManager {
  private static instance: SEOManager;
  private currentMeta: Map<string, HTMLMetaElement> = new Map();
  private baseUrl = 'https://lokaa.app';
  private defaultImage = 'https://lokaa.app/og-default.png';

  private constructor() {
    this.initializeDefaults();
  }

  static getInstance(): SEOManager {
    if (!SEOManager.instance) {
      SEOManager.instance = new SEOManager();
    }
    return SEOManager.instance;
  }

  // Update SEO metadata for the current page. Client-side only: this
  // mutates <head> AFTER hydration, so it's useful for the tab title /
  // in-app SEO status, but crawlers and social unfurlers won't see it.
  // For real per-page social cards we'd need SSR, build-time prerender,
  // or a CDN edge worker that intercepts bot user-agents — see the
  // launch checklist for the post-launch plan.
  async updateSEO(
    type: 'space' | 'post' | 'user' | 'landing' | 'course',
    identifier?: string,
    _spaceSubdomain?: string,
    additionalData?: any
  ): Promise<void> {
    try {
      log.debug('Utils', `[SEO] Updating metadata for ${type}:`, identifier);
      this.applyFallbackSEO(type);
      this.applyStructuredData(type, additionalData);
      this.trackPageView(type, identifier);
    } catch (error) {
      log.error('Utils', '[SEO] Failed to update metadata:', error);
      this.applyFallbackSEO(type);
      this.applyStructuredData(type, additionalData);
    }
  }

  /**
   * Apply SEO data to document
   */
  private applySEOData(seoData: SEOData): void {
    // Update document title
    document.title = seoData.title;

    // Clear existing dynamic meta tags
    this.clearDynamicMeta();

    // Basic meta tags
    this.setMetaTag('description', seoData.description);
    this.setLinkTag('canonical', seoData.canonical);

    // Open Graph tags
    this.setMetaTag('og:title', seoData.openGraph.title, 'property');
    this.setMetaTag('og:description', seoData.openGraph.description, 'property');
    this.setMetaTag('og:image', seoData.openGraph.image, 'property');
    this.setMetaTag('og:url', seoData.openGraph.url, 'property');
    this.setMetaTag('og:type', seoData.openGraph.type, 'property');
    
    if (seoData.openGraph.site_name) {
      this.setMetaTag('og:site_name', seoData.openGraph.site_name, 'property');
    }

    // Article-specific Open Graph
    if (seoData.openGraph.article) {
      this.setMetaTag('article:author', seoData.openGraph.article.author, 'property');
      this.setMetaTag('article:published_time', seoData.openGraph.article.published_time, 'property');
      this.setMetaTag('article:section', seoData.openGraph.article.section, 'property');
    }

    // Profile-specific Open Graph
    if (seoData.openGraph.profile) {
      this.setMetaTag('profile:first_name', seoData.openGraph.profile.first_name, 'property');
      this.setMetaTag('profile:last_name', seoData.openGraph.profile.last_name, 'property');
      this.setMetaTag('profile:username', seoData.openGraph.profile.username, 'property');
    }

    // Twitter Card tags
    this.setMetaTag('twitter:card', seoData.twitter.card);
    this.setMetaTag('twitter:title', seoData.twitter.title);
    this.setMetaTag('twitter:description', seoData.twitter.description);
    this.setMetaTag('twitter:image', seoData.twitter.image);
    
    if (seoData.twitter.creator) {
      this.setMetaTag('twitter:creator', seoData.twitter.creator);
    }
    
    if (seoData.twitter.site) {
      this.setMetaTag('twitter:site', seoData.twitter.site);
    }

    // Keywords
    if (seoData.keywords && seoData.keywords.length > 0) {
      this.setMetaTag('keywords', seoData.keywords.join(', '));
    }

    // JSON-LD Schema
    if (seoData.schema) {
      this.setJsonLdSchema(seoData.schema, 'main-schema');
    }

    log.debug('Utils', '[SEO] Metadata applied successfully');
  }

  /**
   * Set meta tag
   */
  private setMetaTag(name: string, content: string, type: 'name' | 'property' = 'name'): void {
    const key = `${type}:${name}`;
    
    // Remove existing tag if present
    const existing = this.currentMeta.get(key);
    if (existing) {
      existing.remove();
    }

    // Create new meta tag
    const meta = document.createElement('meta');
    meta.setAttribute(type, name);
    meta.setAttribute('content', content);
    meta.setAttribute('data-seo', 'dynamic');
    
    document.head.appendChild(meta);
    this.currentMeta.set(key, meta);
  }

  /**
   * Set link tag (for canonical, etc.)
   */
  private setLinkTag(rel: string, href: string): void {
    const key = `link:${rel}`;
    
    // Remove existing link if present
    const existing = document.querySelector(`link[rel="${rel}"][data-seo="dynamic"]`);
    if (existing) {
      existing.remove();
    }

    // Create new link tag
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    link.setAttribute('data-seo', 'dynamic');
    
    document.head.appendChild(link);
  }


  /**
   * Clear dynamic meta tags
   */
  private clearDynamicMeta(): void {
    // Clear tracked meta tags
    this.currentMeta.forEach(meta => meta.remove());
    this.currentMeta.clear();

    // Clear any remaining dynamic tags
    const dynamicTags = document.querySelectorAll('[data-seo="dynamic"]');
    dynamicTags.forEach(tag => tag.remove());
  }

  /**
   * Apply fallback SEO for error cases
   */
  private applyFallbackSEO(type: string): void {
    let fallbackData: SEOData;

    if (type === 'landing') {
      fallbackData = {
        title: 'Lokaa - Transform Your Passion Into a Profitable Community',
        description: 'Build engaged communities around your passion, create valuable content, and monetize your expertise. Join thousands of creators building profitable communities on Lokaa.',
        canonical: this.baseUrl,
        keywords: ['community platform', 'turn passion into revenue', 'monetize your passion', 'build profitable community', 'online learning communities', 'passion communities'],
        openGraph: {
          title: 'Lokaa - Transform Your Passion Into a Profitable Community',
          description: 'Build engaged communities around your passion, create valuable content, and monetize your expertise. Join thousands of creators building profitable communities on Lokaa.',
          image: this.defaultImage,
          url: this.baseUrl,
          type: 'website',
          site_name: 'Lokaa'
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Lokaa - Transform Your Passion Into a Profitable Community',
          description: 'Build engaged communities around your passion, create valuable content, and monetize your expertise. Join thousands of creators building profitable communities on Lokaa.',
          image: this.defaultImage,
          site: '@lokaa_app'
        }
      };
    } else {
      fallbackData = {
        title: 'Lokaa | Community Platform',
        description: 'Build and join thriving communities on Lokaa',
        canonical: this.baseUrl,
        openGraph: {
          title: 'Lokaa',
          description: 'Community Platform',
          image: this.defaultImage,
          url: this.baseUrl,
          type: 'website',
          site_name: 'Lokaa'
        },
        twitter: {
          card: 'summary',
          title: 'Lokaa',
          description: 'Community Platform',
          image: this.defaultImage,
          site: '@lokaa_io'
        }
      };
    }

    this.applySEOData(fallbackData);
  }

  /**
   * Initialize default meta tags
   */
  private initializeDefaults(): void {
    // Ensure viewport meta tag exists
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      document.head.appendChild(viewport);
    }

    // Ensure charset meta tag exists
    if (!document.querySelector('meta[charset]')) {
      const charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.insertBefore(charset, document.head.firstChild);
    }

    // Add default robots tag
    this.setMetaTag('robots', 'index,follow');
    this.setMetaTag('googlebot', 'index,follow');

    // Add theme color
    this.setMetaTag('theme-color', '#14b8a6');
    this.setMetaTag('msapplication-TileColor', '#14b8a6');

    log.debug('Utils', '[SEO] Default meta tags initialized');
  }

  /**
   * Generate social sharing URLs
   */
  generateSharingUrls(url: string, title: string, description: string): {
    facebook: string;
    twitter: string;
    linkedin: string;
    reddit: string;
    whatsapp: string;
  } {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    };
  }

  /**
   * Update page URL without reload (for SPA)
   */
  updateUrl(newPath: string, title?: string): void {
    const url = new URL(newPath, this.baseUrl);
    
    if (window.history && window.history.pushState) {
      window.history.pushState({ path: newPath }, title || document.title, url.toString());
    }
  }

  /**
   * Track page view for analytics
   */
  private trackPageView(type: string, identifier?: string): void {
    // Integration point for analytics
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: window.location.pathname,
        page_title: document.title
      });
    }

    // Custom analytics tracking
    const eventData = {
      page_type: type,
      page_identifier: identifier,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title
    };

    log.debug('Utils', '[SEO] Page view tracked:', eventData);

    // Send to analytics service (implement as needed)
    this.sendAnalyticsEvent('page_view', eventData);
  }

  /**
   * Send analytics event
   */
  private async sendAnalyticsEvent(event: string, data: any): Promise<void> {
    try {
      // This could integrate with your analytics service
      // For now, we'll just log it
      log.debug('Utils', `[Analytics] ${event}:`, data);
      
      // Example: Send to custom analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event, data })
      // });
    } catch (error) {
      log.error('Utils', '[Analytics] Failed to send event:', error);
    }
  }

  /**
   * Get current SEO status
   */
  getSEOStatus(): {
    title: string;
    description: string;
    canonical: string;
    metaTagCount: number;
    hasSchema: boolean;
    hasOpenGraph: boolean;
    hasTwitterCard: boolean;
  } {
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const metaTagCount = this.currentMeta.size;
    const hasSchema = !!document.querySelector('script[type="application/ld+json"]');
    const hasOpenGraph = !!document.querySelector('meta[property^="og:"]');
    const hasTwitterCard = !!document.querySelector('meta[name^="twitter:"]');

    return {
      title,
      description,
      canonical,
      metaTagCount,
      hasSchema,
      hasOpenGraph,
      hasTwitterCard
    };
  }

  /**
   * Apply structured data based on page type
   */
  private applyStructuredData(type: string, additionalData?: any): void {
    try {
      // Clear existing structured data
      this.clearStructuredData();

      // Generate schemas based on page type
      const schemas = schemaGenerator.generatePageSchemas(type as any, additionalData);
      
      // Apply each schema
      schemas.forEach((schema, index) => {
        this.setJsonLdSchema(schema, `schema-${index}`);
      });

      log.debug('Utils', `[SEO] Applied ${schemas.length} structured data schemas for ${type}`);

    } catch (error) {
      log.error('Utils', '[SEO] Failed to apply structured data:', error);
    }
  }

  /**
   * Clear structured data
   */
  private clearStructuredData(): void {
    const existingSchemas = document.querySelectorAll('script[type="application/ld+json"][data-seo="dynamic"]');
    existingSchemas.forEach(schema => schema.remove());
  }

  /**
   * Set JSON-LD schema with optional ID
   */
  private setJsonLdSchema(schema: SchemaData, id?: string): void {
    // Remove existing schema with same ID
    if (id) {
      const existing = document.querySelector(`script[type="application/ld+json"][data-schema-id="${id}"]`);
      if (existing) {
        existing.remove();
      }
    }

    // Create new schema script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'dynamic');
    if (id) {
      script.setAttribute('data-schema-id', id);
    }
    script.textContent = JSON.stringify(schema, null, 0);
    
    document.head.appendChild(script);
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    const baseUrl = this.baseUrl;
    
    return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-images.xml
Sitemap: ${baseUrl}/sitemap-news.xml

# Crawl delay
Crawl-delay: 1

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/
Disallow: /private/

# Allow important pages
Allow: /
Allow: /about
Allow: /features
Allow: /pricing
Allow: /help
Allow: /communities
Allow: /*/about
Allow: /*/space/
Allow: /*/courses/

# Block duplicate content
Disallow: /*?*
Disallow: /*#*
Disallow: /*&*

# Block search parameters
Disallow: /*?search=*
Disallow: /*?filter=*
Disallow: /*?sort=*

# Allow social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /`;
  }

  /**
   * Apply local SEO optimization for a specific location
   * Phase 4.1: Local SEO Implementation
   */
  applyLocalSEO(location?: string, options: {
    updateTitle?: boolean;
    updateDescription?: boolean;
    addLocalSchema?: boolean;
    addLocalKeywords?: boolean;
  } = {}): void {
    const {
      updateTitle = true,
      updateDescription = true,
      addLocalSchema = true,
      addLocalKeywords = true,
    } = options;

    if (!location) {
      log.debug('LocalSEO', 'No location specified, using default local SEO');
      return;
    }

    try {
      // Update title with location
      if (updateTitle) {
        const currentTitle = document.title;
        const localTitle = localSEO.generateLocalTitle(location, 'Community Platform');
        this.setTitle(localTitle);
        log.debug('LocalSEO', `Updated title for ${location}: ${localTitle}`);
      }

      // Update meta description with location
      if (updateDescription) {
        const currentDescription = this.getMetaContent('description') || 'Community platform';
        const localDescription = localSEO.generateLocalMetaDescription(location, currentDescription);
        this.setMetaTag('description', localDescription);
        log.debug('LocalSEO', `Updated description for ${location}`);
      }

      // Add local keywords
      if (addLocalKeywords) {
        const baseKeywords = ['community platform', 'online communities', 'passion communities'];
        const localKeywords = localSEO.generateLocalKeywords(location, baseKeywords);
        this.setMetaTag('keywords', localKeywords.join(', '));
        log.debug('LocalSEO', `Added local keywords for ${location}: ${localKeywords.length} keywords`);
      }

      // Add local business schema
      if (addLocalSchema) {
        const localBusinessSchema = localSEO.generateLocalBusinessSchema(location);
        this.setJsonLdSchema(localBusinessSchema, 'local-business');
        log.debug('LocalSEO', `Added local business schema for ${location}`);
      }

      log.debug('LocalSEO', `Local SEO applied for ${location}`);
    } catch (error) {
      log.error('LocalSEO', `Failed to apply local SEO for ${location}:`, error);
    }
  }

  /**
   * Generate location-specific FAQ schema
   */
  addLocalFAQSchema(location: string): void {
    try {
      const localFAQ = localSEO.generateLocalFAQ(location);
      const faqSchema = schemaGenerator.generateFAQPageSchema(localFAQ);
      this.setJsonLdSchema(faqSchema, 'local-faq');
      log.debug('LocalSEO', `Added local FAQ schema for ${location}`);
    } catch (error) {
      log.error('LocalSEO', `Failed to add local FAQ schema for ${location}:`, error);
    }
  }

  /**
   * Get supported locations for local SEO
   */
  getSupportedLocations(): string[] {
    return localSEO.getSupportedLocations().map(loc => loc.city);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearDynamicMeta();
    this.clearStructuredData();
    log.debug('Utils', '[SEO] Manager destroyed');
  }
}

// Export singleton instance
export const seoManager = SEOManager.getInstance();

// Auto-initialize and expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).seoManager = seoManager;
  (window as any).getSEOStatus = () => seoManager.getSEOStatus();
  
  log.debug('Utils', '🚀 [SEO] SEO manager initialized');
} 