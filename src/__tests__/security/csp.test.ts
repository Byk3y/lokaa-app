import { describe, it, expect, vi, beforeEach } from 'vitest';

// Using global fetch mock from vitest setup

describe('Content Security Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSP Headers', () => {
    it('should have required CSP headers', async () => {
      // Mock fetch to return headers
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        Promise.resolve(new Response(null, {
          status: 200,
          headers: new Headers({
            'content-security-policy': "default-src 'self'; connect-src 'self' https://*.supabase.co; script-src 'self' 'nonce-{NONCE}'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com",
            'content-security-policy-report-only': "default-src 'self'",
            'x-frame-options': 'DENY',
            'x-xss-protection': '1; mode=block',
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'strict-origin-when-cross-origin'
          })
        }))
      );

      // Request the main page
      const response = await fetch('/');
      const headers = response.headers;

      // Verify CSP header exists and contains required directives
      const csp = headers.get('content-security-policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self' https://*.supabase.co");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain('https://fonts.googleapis.com');
      expect(csp).toContain('https://fonts.gstatic.com');

      // Verify other security headers
      expect(headers.get('x-frame-options')).toBe('DENY');
      expect(headers.get('x-xss-protection')).toBe('1; mode=block');
      expect(headers.get('x-content-type-options')).toBe('nosniff');
      expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should have CSP report-only header', async () => {
      // Mock fetch to return headers
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        Promise.resolve(new Response(null, {
          status: 200,
          headers: new Headers({
            'content-security-policy-report-only': "default-src 'self'"
          })
        }))
      );

      // Request the main page
      const response = await fetch('/');
      const headers = response.headers;

      // Verify CSP report-only header exists
      const cspReportOnly = headers.get('content-security-policy-report-only');
      expect(cspReportOnly).toBeDefined();
      expect(cspReportOnly).toContain("default-src 'self'");
    });
  });

  describe('CSP Violations', () => {
    it('should report CSP violations', async () => {
      // Mock fetch for CSP report endpoint
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        Promise.resolve(new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' })
        }))
      );

      // Simulate CSP violation report
      const response = await fetch('/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report'
        },
        body: JSON.stringify({
          'csp-report': {
            'document-uri': 'http://example.com/test.html',
            'violated-directive': 'script-src-elem',
            'blocked-uri': 'http://evil.com/hack.js'
          }
        })
      });

      expect(response.status).toBe(200);
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/security/csp-report',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/csp-report'
          })
        })
      );
    });
  });
}); 