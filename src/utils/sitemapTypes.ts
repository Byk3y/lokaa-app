/**
 * Sitemap Generation Types
 * 
 * TypeScript interfaces for sitemap generation system
 * Supports dynamic sitemap creation from database content
 */

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: SitemapImage[];
}

export interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  license?: string;
}

export interface SitemapIndex {
  sitemaps: SitemapReference[];
}

export interface SitemapReference {
  loc: string;
  lastmod: string;
}

export interface SitemapData {
  urls: SitemapUrl[];
  lastGenerated: string;
  totalUrls: number;
  contentTypes: ContentTypeStats;
}

export interface ContentTypeStats {
  spaces: number;
  posts: number;
  courses: number;
  lessons: number;
  profiles: number;
  pages: number;
}

export interface SitemapConfig {
  baseUrl: string;
  defaultPriority: number;
  defaultChangeFreq: 'daily' | 'weekly' | 'monthly';
  maxUrlsPerSitemap: number;
  enableImageSitemap: boolean;
  enableNewsSitemap: boolean;
}

export interface DatabaseContent {
  spaces: SpaceContent[];
  posts: PostContent[];
  courses: CourseContent[];
  lessons: LessonContent[];
  profiles: ProfileContent[];
}

export interface SpaceContent {
  id: string;
  subdomain: string;
  name: string;
  description?: string;
  cover_image?: string;
  updated_at: string;
  created_at: string;
  is_public: boolean;
  member_count?: number;
}

export interface PostContent {
  id: string;
  slug: string;
  title?: string;
  content: string;
  space_id: string;
  space_subdomain: string;
  updated_at: string;
  created_at: string;
  is_published: boolean;
  media_urls?: any[];
}

export interface CourseContent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  space_id: string;
  space_subdomain: string;
  updated_at: string;
  created_at: string;
  is_published: boolean;
  cover_image?: string;
}

export interface LessonContent {
  id: string;
  slug: string;
  title: string;
  course_id: string;
  course_slug: string;
  space_id: string;
  space_subdomain: string;
  updated_at: string;
  created_at: string;
  is_published: boolean;
}

export interface ProfileContent {
  id: string;
  profile_url: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  updated_at: string;
  created_at: string;
  is_public: boolean;
}

export interface SitemapGenerationOptions {
  includeImages?: boolean;
  includeNews?: boolean;
  maxAge?: number; // in hours
  // Phase 3.2: Only spaces are publicly discoverable for SEO
  contentTypes?: ('spaces' | 'posts' | 'courses' | 'lessons' | 'profiles')[];
}

export interface SitemapValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  urlCount: number;
  lastModified: string;
}

// Priority and frequency mappings
export const CONTENT_PRIORITIES = {
  landing: 1.0,
  space: 0.8,
  spaceAbout: 0.7,
  course: 0.7,
  post: 0.6,
  lesson: 0.5,
  profile: 0.4,
  page: 0.5
} as const;

export const CONTENT_FREQUENCIES = {
  landing: 'daily' as const,
  space: 'weekly' as const,
  spaceAbout: 'monthly' as const,
  course: 'weekly' as const,
  post: 'weekly' as const,
  lesson: 'monthly' as const,
  profile: 'monthly' as const,
  page: 'monthly' as const
} as const;

// Default sitemap configuration
export const DEFAULT_SITEMAP_CONFIG: SitemapConfig = {
  baseUrl: 'https://lokaa.app',
  defaultPriority: 0.5,
  defaultChangeFreq: 'weekly',
  maxUrlsPerSitemap: 50000,
  enableImageSitemap: true,
  enableNewsSitemap: true
};
