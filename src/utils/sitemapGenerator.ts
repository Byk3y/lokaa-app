import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type {
  SitemapUrl,
  SitemapData,
  SitemapConfig,
  DatabaseContent,
  SitemapGenerationOptions,
  SitemapValidationResult,
  SpaceContent,
  PostContent,
  CourseContent,
  LessonContent,
  ProfileContent
} from './sitemapTypes';
import {
  CONTENT_PRIORITIES,
  CONTENT_FREQUENCIES,
  DEFAULT_SITEMAP_CONFIG
} from './sitemapTypes';

/**
 * Dynamic Sitemap Generator
 * 
 * Generates XML sitemaps from database content with intelligent
 * prioritization and change frequency optimization.
 */
export class SitemapGenerator {
  private config: SitemapConfig;
  private supabase = getSupabaseClient();

  constructor(config: Partial<SitemapConfig> = {}) {
    this.config = { ...DEFAULT_SITEMAP_CONFIG, ...config };
  }

  /**
   * Generate complete sitemap data from database
   */
  async generateSitemap(options: SitemapGenerationOptions = {}): Promise<SitemapData> {
    try {
      log.debug('SitemapGenerator', 'Starting sitemap generation...');

      // Fetch all content from database
      const content = await this.fetchDatabaseContent(options);
      
      // Generate URLs from content
      const urls = await this.generateUrls(content, options);

      const sitemapData: SitemapData = {
        urls,
        lastGenerated: new Date().toISOString(),
        totalUrls: urls.length,
        contentTypes: this.calculateContentStats(content)
      };

      log.debug('SitemapGenerator', `Generated sitemap with ${urls.length} URLs`);
      return sitemapData;

    } catch (error) {
      log.error('SitemapGenerator', 'Failed to generate sitemap:', error);
      throw new Error(`Sitemap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate XML sitemap string
   */
  async generateXMLSitemap(options: SitemapGenerationOptions = {}): Promise<string> {
    const sitemapData = await this.generateSitemap(options);
    return this.buildXMLSitemap(sitemapData.urls);
  }

  /**
   * Generate sitemap index for multiple sitemaps
   */
  async generateSitemapIndex(): Promise<string> {
    const sitemaps = [
      {
        loc: `${this.config.baseUrl}/sitemap.xml`,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.config.baseUrl}/sitemap-images.xml`,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.config.baseUrl}/sitemap-news.xml`,
        lastmod: new Date().toISOString()
      }
    ];

    return this.buildSitemapIndex(sitemaps);
  }

  /**
   * Generate image sitemap
   */
  async generateImageSitemap(): Promise<string> {
    const content = await this.fetchDatabaseContent({ includeImages: true });
    const imageUrls = this.extractImageUrls(content);
    return this.buildImageSitemap(imageUrls);
  }

  /**
   * Generate news sitemap for recent content
   */
  async generateNewsSitemap(): Promise<string> {
    const content = await this.fetchDatabaseContent({ 
      includeNews: true,
      maxAge: 24 // Last 24 hours
    });
    const newsUrls = this.extractNewsUrls(content);
    return this.buildNewsSitemap(newsUrls);
  }

  /**
   * Validate sitemap data
   */
  validateSitemap(sitemapData: SitemapData): SitemapValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check URL count
    if (sitemapData.totalUrls > this.config.maxUrlsPerSitemap) {
      errors.push(`Too many URLs: ${sitemapData.totalUrls} exceeds limit of ${this.config.maxUrlsPerSitemap}`);
    }

    // Check for duplicate URLs
    const urls = sitemapData.urls.map(u => u.loc);
    const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate URLs found: ${duplicates.join(', ')}`);
    }

    // Check URL format
    sitemapData.urls.forEach((url, index) => {
      if (!url.loc.startsWith('http')) {
        errors.push(`Invalid URL format at index ${index}: ${url.loc}`);
      }
      if (url.priority < 0 || url.priority > 1) {
        warnings.push(`Invalid priority at index ${index}: ${url.priority}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      urlCount: sitemapData.totalUrls,
      lastModified: sitemapData.lastGenerated
    };
  }

  /**
   * Fetch content from database
   */
  private async fetchDatabaseContent(options: SitemapGenerationOptions): Promise<DatabaseContent> {
    const contentTypes = options.contentTypes || ['spaces', 'posts', 'courses', 'lessons', 'profiles'];
    
    const [spaces, posts, courses, lessons, profiles] = await Promise.all([
      contentTypes.includes('spaces') ? this.fetchSpaces() : Promise.resolve([]),
      contentTypes.includes('posts') ? this.fetchPosts() : Promise.resolve([]),
      contentTypes.includes('courses') ? this.fetchCourses() : Promise.resolve([]),
      contentTypes.includes('lessons') ? this.fetchLessons() : Promise.resolve([]),
      contentTypes.includes('profiles') ? this.fetchProfiles() : Promise.resolve([])
    ]);

    return { spaces, posts, courses, lessons, profiles };
  }

  /**
   * Fetch public spaces
   */
  private async fetchSpaces(): Promise<SpaceContent[]> {
    const { data, error } = await this.supabase
      .from('spaces')
      .select(`
        id,
        subdomain,
        name,
        description,
        cover_image,
        updated_at,
        created_at,
        is_public,
        member_count:space_members(count)
      `)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      log.error('SitemapGenerator', 'Failed to fetch spaces:', error);
      return [];
    }

    return data.map(space => ({
      ...space,
      member_count: Array.isArray(space.member_count) ? space.member_count.length : 0
    }));
  }

  /**
   * Fetch published posts
   */
  private async fetchPosts(): Promise<PostContent[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        id,
        slug,
        title,
        content,
        space_id,
        updated_at,
        created_at,
        media_urls,
        spaces!inner(subdomain, is_public)
      `)
      .not('slug', 'is', null)
      .eq('spaces.is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      log.error('SitemapGenerator', 'Failed to fetch posts:', error);
      return [];
    }

    return data.map(post => ({
      ...post,
      space_subdomain: post.spaces.subdomain,
      is_published: true
    }));
  }

  /**
   * Fetch published courses
   */
  private async fetchCourses(): Promise<CourseContent[]> {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        id,
        slug,
        title,
        description,
        space_id,
        updated_at,
        created_at,
        cover_image,
        is_published,
        spaces!inner(subdomain, is_public)
      `)
      .eq('is_published', true)
      .eq('spaces.is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      log.error('SitemapGenerator', 'Failed to fetch courses:', error);
      return [];
    }

    return data.map(course => ({
      ...course,
      space_subdomain: course.spaces.subdomain
    }));
  }

  /**
   * Fetch published lessons
   */
  private async fetchLessons(): Promise<LessonContent[]> {
    const { data, error } = await this.supabase
      .from('course_lessons')
      .select(`
        id,
        slug,
        title,
        course_id,
        updated_at,
        created_at,
        is_published,
        courses!inner(slug, space_id, spaces!inner(subdomain, is_public))
      `)
      .eq('is_published', true)
      .eq('courses.spaces.is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      log.error('SitemapGenerator', 'Failed to fetch lessons:', error);
      return [];
    }

    return data.map(lesson => ({
      ...lesson,
      course_slug: lesson.courses.slug,
      space_id: lesson.courses.space_id,
      space_subdomain: lesson.courses.spaces.subdomain
    }));
  }

  /**
   * Fetch public profiles
   */
  private async fetchProfiles(): Promise<ProfileContent[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        profile_url,
        full_name,
        bio,
        avatar_url,
        updated_at,
        created_at,
        is_public
      `)
      .eq('is_public', true)
      .not('profile_url', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      log.error('SitemapGenerator', 'Failed to fetch profiles:', error);
      return [];
    }

    return data;
  }

  /**
   * Generate URLs from content
   */
  private async generateUrls(content: DatabaseContent, options: SitemapGenerationOptions): Promise<SitemapUrl[]> {
    const urls: SitemapUrl[] = [];

    // Landing page
    urls.push({
      loc: this.config.baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: CONTENT_FREQUENCIES.landing,
      priority: CONTENT_PRIORITIES.landing
    });

    // Space pages
    content.spaces.forEach(space => {
      urls.push({
        loc: `${this.config.baseUrl}/${space.subdomain}`,
        lastmod: space.updated_at,
        changefreq: CONTENT_FREQUENCIES.space,
        priority: CONTENT_PRIORITIES.space,
        images: space.cover_image ? [{
          loc: space.cover_image,
          title: space.name,
          caption: space.description
        }] : undefined
      });

      // Space about page
      urls.push({
        loc: `${this.config.baseUrl}/${space.subdomain}/about`,
        lastmod: space.updated_at,
        changefreq: CONTENT_FREQUENCIES.spaceAbout,
        priority: CONTENT_PRIORITIES.spaceAbout
      });
    });

    // Post pages
    content.posts.forEach(post => {
      urls.push({
        loc: `${this.config.baseUrl}/${post.space_subdomain}/space/${post.slug}`,
        lastmod: post.updated_at,
        changefreq: CONTENT_FREQUENCIES.post,
        priority: CONTENT_PRIORITIES.post,
        images: this.extractPostImages(post)
      });
    });

    // Course pages
    content.courses.forEach(course => {
      urls.push({
        loc: `${this.config.baseUrl}/${course.space_subdomain}/courses/${course.slug}`,
        lastmod: course.updated_at,
        changefreq: CONTENT_FREQUENCIES.course,
        priority: CONTENT_PRIORITIES.course,
        images: course.cover_image ? [{
          loc: course.cover_image,
          title: course.title,
          caption: course.description
        }] : undefined
      });
    });

    // Lesson pages
    content.lessons.forEach(lesson => {
      urls.push({
        loc: `${this.config.baseUrl}/${lesson.space_subdomain}/courses/${lesson.course_slug}/lessons/${lesson.slug}`,
        lastmod: lesson.updated_at,
        changefreq: CONTENT_FREQUENCIES.lesson,
        priority: CONTENT_PRIORITIES.lesson
      });
    });

    // Profile pages
    content.profiles.forEach(profile => {
      urls.push({
        loc: `${this.config.baseUrl}/@${profile.profile_url}`,
        lastmod: profile.updated_at,
        changefreq: CONTENT_FREQUENCIES.profile,
        priority: CONTENT_PRIORITIES.profile,
        images: profile.avatar_url ? [{
          loc: profile.avatar_url,
          title: profile.full_name || 'Profile',
          caption: profile.bio
        }] : undefined
      });
    });

    return urls;
  }

  /**
   * Extract images from post content
   */
  private extractPostImages(post: PostContent): SitemapImage[] {
    if (!post.media_urls || !Array.isArray(post.media_urls)) {
      return [];
    }

    return post.media_urls
      .filter(media => media.type === 'file' && media.fileType?.startsWith('image/'))
      .map(media => ({
        loc: media.url,
        title: post.title || 'Post Image',
        caption: `Image from ${post.space_subdomain}`
      }));
  }

  /**
   * Extract all image URLs for image sitemap
   */
  private extractImageUrls(content: DatabaseContent): SitemapImage[] {
    const images: SitemapImage[] = [];

    // Space cover images
    content.spaces.forEach(space => {
      if (space.cover_image) {
        images.push({
          loc: space.cover_image,
          title: space.name,
          caption: space.description
        });
      }
    });

    // Course cover images
    content.courses.forEach(course => {
      if (course.cover_image) {
        images.push({
          loc: course.cover_image,
          title: course.title,
          caption: course.description
        });
      }
    });

    // Post images
    content.posts.forEach(post => {
      images.push(...this.extractPostImages(post));
    });

    // Profile avatars
    content.profiles.forEach(profile => {
      if (profile.avatar_url) {
        images.push({
          loc: profile.avatar_url,
          title: profile.full_name || 'Profile',
          caption: profile.bio
        });
      }
    });

    return images;
  }

  /**
   * Extract news URLs (recent content)
   */
  private extractNewsUrls(content: DatabaseContent): SitemapUrl[] {
    const newsUrls: SitemapUrl[] = [];
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Recent posts
    content.posts
      .filter(post => new Date(post.created_at) > cutoffDate)
      .forEach(post => {
        newsUrls.push({
          loc: `${this.config.baseUrl}/${post.space_subdomain}/space/${post.slug}`,
          lastmod: post.updated_at,
          changefreq: 'daily',
          priority: 0.8
        });
      });

    return newsUrls;
  }

  /**
   * Calculate content statistics
   */
  private calculateContentStats(content: DatabaseContent): any {
    return {
      spaces: content.spaces.length,
      posts: content.posts.length,
      courses: content.courses.length,
      lessons: content.lessons.length,
      profiles: content.profiles.length,
      pages: 1 // Landing page
    };
  }

  /**
   * Build XML sitemap
   */
  private buildXMLSitemap(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => {
      const imageEntries = url.images?.map(img => `
        <image:image>
          <image:loc>${this.escapeXml(img.loc)}</image:loc>
          ${img.title ? `<image:title>${this.escapeXml(img.title)}</image:title>` : ''}
          ${img.caption ? `<image:caption>${this.escapeXml(img.caption)}</image:caption>` : ''}
          ${img.license ? `<image:license>${this.escapeXml(img.license)}</image:license>` : ''}
        </image:image>
      `).join('') || '';

      return `
        <url>
          <loc>${this.escapeXml(url.loc)}</loc>
          <lastmod>${url.lastmod}</lastmod>
          <changefreq>${url.changefreq}</changefreq>
          <priority>${url.priority}</priority>
          ${imageEntries}
        </url>
      `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urlEntries}
</urlset>`;
  }

  /**
   * Build sitemap index
   */
  private buildSitemapIndex(sitemaps: any[]): string {
    const sitemapEntries = sitemaps.map(sitemap => `
      <sitemap>
        <loc>${this.escapeXml(sitemap.loc)}</loc>
        <lastmod>${sitemap.lastmod}</lastmod>
      </sitemap>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries}
</sitemapindex>`;
  }

  /**
   * Build image sitemap
   */
  private buildImageSitemap(images: SitemapImage[]): string {
    const imageEntries = images.map(img => `
      <image:image>
        <image:loc>${this.escapeXml(img.loc)}</image:loc>
        ${img.title ? `<image:title>${this.escapeXml(img.title)}</image:title>` : ''}
        ${img.caption ? `<image:caption>${this.escapeXml(img.caption)}</image:caption>` : ''}
        ${img.license ? `<image:license>${this.escapeXml(img.license)}</image:license>` : ''}
      </image:image>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${this.config.baseUrl}</loc>
    ${imageEntries}
  </url>
</urlset>`;
  }

  /**
   * Build news sitemap
   */
  private buildNewsSitemap(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => `
      <url>
        <loc>${this.escapeXml(url.loc)}</loc>
        <news:news>
          <news:publication>
            <news:name>Lokaa</news:name>
            <news:language>en</news:language>
          </news:publication>
          <news:publication_date>${url.lastmod}</news:publication_date>
          <news:title>${this.escapeXml(url.title || 'Content')}</news:title>
        </news:news>
      </url>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${urlEntries}
</urlset>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Export singleton instance
export const sitemapGenerator = new SitemapGenerator();
