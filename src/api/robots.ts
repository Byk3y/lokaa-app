/**
 * Robots.txt API Endpoint
 * 
 * Serves dynamic robots.txt with sitemap references
 * and proper crawling directives
 */

import { Request, Response } from 'express';
import { seoManager } from '@/utils/seoManager';
import { log } from '@/utils/logger';

/**
 * Serve robots.txt
 * GET /robots.txt
 */
export async function getRobotsTxt(req: Request, res: Response): Promise<void> {
  try {
    log.debug('RobotsAPI', 'Serving robots.txt');
    
    const robotsContent = seoManager.generateRobotsTxt();
    
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.send(robotsContent);

  } catch (error) {
    log.error('RobotsAPI', 'Failed to generate robots.txt:', error);
    res.status(500).json({ 
      error: 'Failed to generate robots.txt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
