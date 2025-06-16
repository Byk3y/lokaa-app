// =====================================
// SEO & METADATA MANAGEMENT SYSTEM
// =====================================
// Phase 7: Production-ready SEO optimization

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
  private baseUrl: string = 'https://app.lokaa.io';
  private defaultImage: string = 'https://app.lokaa.io/og-default.png';
  private edgeFunctionUrl: string = 'https://nmddvthcsyppyjncqfsk.supabase.co/functions/v1/seo-metadata-generator';

  private constructor() {
    this.initializeDefaults();
  }

  static getInstance(): SEOManager {
    if (!SEOManager.instance) {
      SEOManager.instance = new SEOManager();
    }
    return SEOManager.instance;
  }

  /**
   * Update SEO metadata for current page
   */
  async updateSEO(
    type: 'space' | 'post' | 'user' | 'landing',
    identifier?: string,
    spaceSubdomain?: string
  ): Promise<void> {
    try {
      console.log(`[SEO] Updating metadata for ${type}:`, identifier);

      // Fetch metadata from Edge Function
      const metadata = await this.fetchMetadata(type, identifier, spaceSubdomain);
      
      if (metadata) {
        this.applySEOData(metadata);
        this.trackPageView(type, identifier);
      } else {
        console.warn('[SEO] No metadata received, using fallback');
        this.applyFallbackSEO(type);
      }

    } catch (error) {
      console.error('[SEO] Failed to update metadata:', error);
      this.applyFallbackSEO(type);
    }
  }

  /**
   * Fetch metadata from Edge Function
   */
  private async fetchMetadata(
    type: string,
    identifier?: string,
    spaceSubdomain?: string
  ): Promise<SEOData | null> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          identifier,
          space_subdomain: spaceSubdomain
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { success, metadata } = await response.json();
      
      if (success && metadata) {
        console.log('[SEO] Metadata fetched successfully');
        return metadata;
      }

      return null;

    } catch (error) {
      console.error('[SEO] Edge Function request failed:', error);
      return null;
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
      this.setJsonLdSchema(seoData.schema);
    }

    console.log('[SEO] Metadata applied successfully');
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
   * Set JSON-LD schema
   */
  private setJsonLdSchema(schema: any): void {
    // Remove existing schema
    const existing = document.querySelector('script[type="application/ld+json"][data-seo="dynamic"]');
    if (existing) {
      existing.remove();
    }

    // Create new schema script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'dynamic');
    script.textContent = JSON.stringify(schema);
    
    document.head.appendChild(script);
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
    const fallbackData: SEOData = {
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

    console.log('[SEO] Default meta tags initialized');
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

    console.log('[SEO] Page view tracked:', eventData);

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
      console.log(`[Analytics] ${event}:`, data);
      
      // Example: Send to custom analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event, data })
      // });
    } catch (error) {
      console.error('[Analytics] Failed to send event:', error);
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
   * Cleanup resources
   */
  destroy(): void {
    this.clearDynamicMeta();
    console.log('[SEO] Manager destroyed');
  }
}

// Export singleton instance
export const seoManager = SEOManager.getInstance();

// Auto-initialize and expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).seoManager = seoManager;
  (window as any).getSEOStatus = () => seoManager.getSEOStatus();
  
  console.log('🚀 [SEO] SEO manager initialized');
} 