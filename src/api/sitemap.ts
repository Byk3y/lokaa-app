/**
 * Sitemap API Endpoints
 * 
 * Provides RESTful endpoints for sitemap generation and serving
 * Supports multiple sitemap types and caching strategies
 */

import { Request, Response } from 'express';
import { sitemapGenerator } from '@/utils/sitemapGenerator';
import { log } from '@/utils/logger';
import type { SitemapGenerationOptions } from '@/utils/sitemapTypes';

// Cache for sitemap data
const sitemapCache = new Map<string, { data: string; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds
const CACHE_TTL = {
  sitemap: 60 * 60 * 1000,      // 1 hour
  images: 2 * 60 * 60 * 1000,   // 2 hours
  news: 30 * 60 * 1000,         // 30 minutes
  index: 24 * 60 * 60 * 1000    // 24 hours
};

/**
 * Main sitemap endpoint
 * GET /sitemap.xml
 */
export async function getSitemap(req: Request, res: Response): Promise<void> {
  try {
    const cacheKey = 'main-sitemap';
    const cached = getCachedSitemap(cacheKey, CACHE_TTL.sitemap);
    
    if (cached) {
      log.debug('SitemapAPI', 'Serving cached sitemap');
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(cached);
      return;
    }

    log.debug('SitemapAPI', 'Generating fresh sitemap');
    const sitemapXml = await sitemapGenerator.generateXMLSitemap();
    
    // Cache the result
    setCachedSitemap(cacheKey, sitemapXml, CACHE_TTL.sitemap);
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(sitemapXml);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to generate sitemap:', error);
    res.status(500).json({ 
      error: 'Failed to generate sitemap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sitemap index endpoint
 * GET /sitemap-index.xml
 */
export async function getSitemapIndex(req: Request, res: Response): Promise<void> {
  try {
    const cacheKey = 'sitemap-index';
    const cached = getCachedSitemap(cacheKey, CACHE_TTL.index);
    
    if (cached) {
      log.debug('SitemapAPI', 'Serving cached sitemap index');
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(cached);
      return;
    }

    log.debug('SitemapAPI', 'Generating fresh sitemap index');
    const indexXml = await sitemapGenerator.generateSitemapIndex();
    
    // Cache the result
    setCachedSitemap(cacheKey, indexXml, CACHE_TTL.index);
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(indexXml);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to generate sitemap index:', error);
    res.status(500).json({ 
      error: 'Failed to generate sitemap index',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Image sitemap endpoint
 * GET /sitemap-images.xml
 */
export async function getImageSitemap(req: Request, res: Response): Promise<void> {
  try {
    const cacheKey = 'image-sitemap';
    const cached = getCachedSitemap(cacheKey, CACHE_TTL.images);
    
    if (cached) {
      log.debug('SitemapAPI', 'Serving cached image sitemap');
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=7200');
      res.send(cached);
      return;
    }

    log.debug('SitemapAPI', 'Generating fresh image sitemap');
    const imageSitemapXml = await sitemapGenerator.generateImageSitemap();
    
    // Cache the result
    setCachedSitemap(cacheKey, imageSitemapXml, CACHE_TTL.images);
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=7200');
    res.send(imageSitemapXml);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to generate image sitemap:', error);
    res.status(500).json({ 
      error: 'Failed to generate image sitemap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * News sitemap endpoint
 * GET /sitemap-news.xml
 */
export async function getNewsSitemap(req: Request, res: Response): Promise<void> {
  try {
    const cacheKey = 'news-sitemap';
    const cached = getCachedSitemap(cacheKey, CACHE_TTL.news);
    
    if (cached) {
      log.debug('SitemapAPI', 'Serving cached news sitemap');
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=1800');
      res.send(cached);
      return;
    }

    log.debug('SitemapAPI', 'Generating fresh news sitemap');
    const newsSitemapXml = await sitemapGenerator.generateNewsSitemap();
    
    // Cache the result
    setCachedSitemap(cacheKey, newsSitemapXml, CACHE_TTL.news);
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(newsSitemapXml);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to generate news sitemap:', error);
    res.status(500).json({ 
      error: 'Failed to generate news sitemap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sitemap data endpoint (JSON)
 * GET /api/sitemap/data
 */
export async function getSitemapData(req: Request, res: Response): Promise<void> {
  try {
    const options: SitemapGenerationOptions = {
      includeImages: req.query.images === 'true',
      includeNews: req.query.news === 'true',
      contentTypes: req.query.types ? (req.query.types as string).split(',') as any : undefined
    };

    log.debug('SitemapAPI', 'Generating sitemap data with options:', options);
    const sitemapData = await sitemapGenerator.generateSitemap(options);
    
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json(sitemapData);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to generate sitemap data:', error);
    res.status(500).json({ 
      error: 'Failed to generate sitemap data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sitemap validation endpoint
 * POST /api/sitemap/validate
 */
export async function validateSitemap(req: Request, res: Response): Promise<void> {
  try {
    const { sitemapData } = req.body;
    
    if (!sitemapData) {
      res.status(400).json({ 
        error: 'Missing sitemap data',
        message: 'Request body must contain sitemapData'
      });
      return;
    }

    log.debug('SitemapAPI', 'Validating sitemap data');
    const validationResult = sitemapGenerator.validateSitemap(sitemapData);
    
    res.json(validationResult);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to validate sitemap:', error);
    res.status(500).json({ 
      error: 'Failed to validate sitemap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Clear sitemap cache endpoint
 * POST /api/sitemap/clear-cache
 */
export async function clearSitemapCache(req: Request, res: Response): Promise<void> {
  try {
    const { cacheKey } = req.body;
    
    if (cacheKey) {
      // Clear specific cache entry
      sitemapCache.delete(cacheKey);
      log.debug('SitemapAPI', `Cleared cache for key: ${cacheKey}`);
    } else {
      // Clear all cache
      sitemapCache.clear();
      log.debug('SitemapAPI', 'Cleared all sitemap cache');
    }
    
    res.json({ 
      success: true,
      message: cacheKey ? `Cache cleared for ${cacheKey}` : 'All cache cleared'
    });

  } catch (error) {
    log.error('SitemapAPI', 'Failed to clear cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sitemap statistics endpoint
 * GET /api/sitemap/stats
 */
export async function getSitemapStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = {
      cacheEntries: sitemapCache.size,
      cacheKeys: Array.from(sitemapCache.keys()),
      cacheStats: Array.from(sitemapCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl,
        size: value.data.length
      }))
    };
    
    res.json(stats);

  } catch (error) {
    log.error('SitemapAPI', 'Failed to get sitemap stats:', error);
    res.status(500).json({ 
      error: 'Failed to get sitemap stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get cached sitemap if valid
 */
function getCachedSitemap(key: string, ttl: number): string | null {
  const cached = sitemapCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  const age = Date.now() - cached.timestamp;
  if (age > cached.ttl) {
    sitemapCache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cached sitemap
 */
function setCachedSitemap(key: string, data: string, ttl: number): void {
  sitemapCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Auto-clear expired cache entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sitemapCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      sitemapCache.delete(key);
      log.debug('SitemapAPI', `Auto-cleared expired cache: ${key}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes
