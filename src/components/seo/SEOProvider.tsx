/**
 * SEO Provider Component
 * 
 * Provides comprehensive SEO management for the entire application
 * Integrates sitemap generation, structured data, and meta tag optimization
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { log } from '@/utils/logger';
import { seoManager } from '@/utils/seoManager';
import { useSitemapData } from '@/hooks/useSitemapData';
import { useSchemaData } from '@/hooks/useSchemaData';
import { SchemaMarkup } from './SchemaMarkup';

interface SEOContextType {
  updatePageSEO: (type: string, data?: any) => Promise<void>;
  generateSitemap: () => Promise<void>;
  clearCache: () => Promise<void>;
  sitemapData: any;
  schemas: any[];
  loading: boolean;
  error: string | null;
}

const SEOContext = createContext<SEOContextType | null>(null);

interface SEOProviderProps {
  children: React.ReactNode;
  autoUpdate?: boolean;
  enableSitemap?: boolean;
  enableStructuredData?: boolean;
}

/**
 * SEO Provider Component
 * 
 * Manages SEO for the entire application with automatic page detection
 * and structured data generation
 */
export const SEOProvider: React.FC<SEOProviderProps> = ({
  children,
  autoUpdate = true,
  enableSitemap = true,
  enableStructuredData = true
}) => {
  const location = useLocation();
  const [currentPageType, setCurrentPageType] = useState<string>('landing');
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sitemap data hook
  const { data: sitemapData, loading: sitemapLoading, error: sitemapError } = useSitemapData(
    { includeImages: true, includeNews: true },
    { autoFetch: enableSitemap, refreshInterval: 300000 } // 5 minutes
  );

  // Schema data hook
  const { schemas, addSchema, clearSchemas } = useSchemaData([], {
    validateOnMount: true,
    autoUpdate: true
  });

  /**
   * Detect page type from URL
   */
  const detectPageType = (pathname: string): string => {
    if (pathname === '/') return 'landing';
    if (pathname.includes('/space/') && pathname.includes('/posts/')) return 'post';
    if (pathname.includes('/courses/') && pathname.includes('/lessons/')) return 'lesson';
    if (pathname.includes('/courses/')) return 'course';
    if (pathname.includes('/@')) return 'profile';
    if (pathname.includes('/about')) return 'space-about';
    if (pathname.match(/^\/[^\/]+$/)) return 'space';
    return 'landing';
  };

  /**
   * Extract page data from URL and location state
   */
  const extractPageData = (pathname: string, state: any) => {
    const type = detectPageType(pathname);
    
    switch (type) {
      case 'space':
        return {
          space: {
            subdomain: pathname.split('/')[1],
            ...state?.space
          }
        };
      
      case 'post':
        const spaceSubdomain = pathname.split('/')[1];
        const postSlug = pathname.split('/')[3];
        return {
          space: { subdomain: spaceSubdomain, ...state?.space },
          post: { slug: postSlug, ...state?.post }
        };
      
      case 'course':
        const courseSpaceSubdomain = pathname.split('/')[1];
        const courseSlug = pathname.split('/')[3];
        return {
          space: { subdomain: courseSpaceSubdomain, ...state?.space },
          course: { slug: courseSlug, ...state?.course }
        };
      
      case 'profile':
        const username = pathname.split('/')[1].replace('@', '');
        return {
          profile: { profile_url: username, ...state?.profile }
        };
      
      default:
        return state || {};
    }
  };

  /**
   * Update page SEO
   */
  const updatePageSEO = async (type: string, data?: any) => {
    try {
      setLoading(true);
      setError(null);

      log.debug('SEOProvider', `Updating SEO for ${type} page`);

      // Update SEO manager
      await seoManager.updateSEO(type, undefined, undefined, data);

      // Add structured data if enabled
      if (enableStructuredData && data) {
        clearSchemas();
        
        // Generate schemas based on page type
        const { schemaGenerator } = await import('@/utils/schemaGenerator');
        const pageSchemas = schemaGenerator.generatePageSchemas(type as any, data);
        
        pageSchemas.forEach(schema => {
          addSchema(schema);
        });
      }

      setCurrentPageType(type);
      setPageData(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('SEOProvider', 'Failed to update page SEO:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate sitemap
   */
  const generateSitemap = async () => {
    try {
      setLoading(true);
      setError(null);

      log.debug('SEOProvider', 'Generating sitemap');

      // Trigger sitemap generation
      const response = await fetch('/api/sitemap/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      log.debug('SEOProvider', 'Sitemap generated successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('SEOProvider', 'Failed to generate sitemap:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear SEO cache
   */
  const clearCache = async () => {
    try {
      setLoading(true);
      setError(null);

      log.debug('SEOProvider', 'Clearing SEO cache');

      // Clear sitemap cache
      await fetch('/api/sitemap/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Clear schema cache
      clearSchemas();

      log.debug('SEOProvider', 'SEO cache cleared successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('SEOProvider', 'Failed to clear cache:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-update SEO when location changes
  useEffect(() => {
    if (!autoUpdate) return;

    const pageType = detectPageType(location.pathname);
    const data = extractPageData(location.pathname, location.state);

    updatePageSEO(pageType, data);
  }, [location.pathname, location.state, autoUpdate]);

  // Handle sitemap errors
  useEffect(() => {
    if (sitemapError) {
      log.warn('SEOProvider', 'Sitemap error:', sitemapError);
    }
  }, [sitemapError]);

  const contextValue: SEOContextType = {
    updatePageSEO,
    generateSitemap,
    clearCache,
    sitemapData,
    schemas,
    loading: loading || sitemapLoading,
    error: error || sitemapError
  };

  return (
    <SEOContext.Provider value={contextValue}>
      {children}
      {enableStructuredData && schemas.length > 0 && (
        <SchemaMarkup schemas={schemas} validate={true} />
      )}
    </SEOContext.Provider>
  );
};

/**
 * Hook to use SEO context
 */
export const useSEO = (): SEOContextType => {
  const context = useContext(SEOContext);
  if (!context) {
    throw new Error('useSEO must be used within an SEOProvider');
  }
  return context;
};

export default SEOProvider;
