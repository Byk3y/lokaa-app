/**
 * 🚀 Phase 3.2: Critical CSS Inlining Utility
 * 
 * This utility helps identify and inline critical CSS for above-the-fold content
 * to improve First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
 */

export interface CriticalCSSOptions {
  /** Whether to enable critical CSS inlining */
  enabled: boolean;
  /** Maximum size for critical CSS (in bytes) */
  maxSize: number;
  /** Selectors that are considered critical */
  criticalSelectors: string[];
  /** Media queries to include in critical CSS */
  criticalMediaQueries: string[];
}

const DEFAULT_OPTIONS: CriticalCSSOptions = {
  enabled: process.env.NODE_ENV === 'production',
  maxSize: 14000, // 14KB limit for critical CSS
  criticalSelectors: [
    // Layout and structure
    'html', 'body', '*', '::before', '::after',
    // Typography
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button',
    // Layout containers
    '.container', '.max-w-', '.min-h-', '.h-', '.w-',
    // Flexbox and Grid
    '.flex', '.grid', '.block', '.inline', '.hidden',
    // Spacing
    '.p-', '.m-', '.px-', '.py-', '.mx-', '.my-',
    // Colors and backgrounds
    '.bg-', '.text-', '.border-',
    // Positioning
    '.relative', '.absolute', '.fixed', '.sticky',
    // Common UI components
    '.btn', '.card', '.modal', '.dropdown', '.tooltip',
    // Navigation
    '.nav', '.header', '.footer', '.sidebar',
    // Forms
    '.form', '.input', '.textarea', '.select', '.checkbox', '.radio',
  ],
  criticalMediaQueries: [
    '(max-width: 640px)', // Mobile
    '(max-width: 768px)', // Tablet
    '(min-width: 1024px)', // Desktop
  ]
};

/**
 * Extract critical CSS from the current page
 */
export function extractCriticalCSS(options: Partial<CriticalCSSOptions> = {}): string {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') {
    return '';
  }

  const criticalCSS: string[] = [];
  const processedRules = new Set<string>();

  // Get all stylesheets
  const stylesheets = Array.from(document.styleSheets);
  
  for (const stylesheet of stylesheets) {
    try {
      const rules = Array.from(stylesheet.cssRules || []);
      
      for (const rule of rules) {
        if (rule.type === CSSRule.STYLE_RULE) {
          const styleRule = rule as CSSStyleRule;
          const selector = styleRule.selectorText;
          
          // Check if this selector is critical
          if (isCriticalSelector(selector, config.criticalSelectors)) {
            const ruleText = `${selector} { ${styleRule.style.cssText} }`;
            
            if (!processedRules.has(ruleText)) {
              criticalCSS.push(ruleText);
              processedRules.add(ruleText);
            }
          }
        } else if (rule.type === CSSRule.MEDIA_RULE) {
          const mediaRule = rule as CSSMediaRule;
          const mediaText = mediaRule.media.mediaText;
          
          // Check if this media query is critical
          if (config.criticalMediaQueries.some(mq => mediaText.includes(mq))) {
            const mediaRules: string[] = [];
            
            for (const mediaRuleItem of Array.from(mediaRule.cssRules)) {
              if (mediaRuleItem.type === CSSRule.STYLE_RULE) {
                const styleRule = mediaRuleItem as CSSStyleRule;
                const selector = styleRule.selectorText;
                
                if (isCriticalSelector(selector, config.criticalSelectors)) {
                  mediaRules.push(`${selector} { ${styleRule.style.cssText} }`);
                }
              }
            }
            
            if (mediaRules.length > 0) {
              const mediaCSS = `@media ${mediaText} { ${mediaRules.join(' ')} }`;
              criticalCSS.push(mediaCSS);
            }
          }
        }
      }
    } catch (error) {
      // Skip stylesheets that can't be accessed (CORS issues)
      console.warn('Could not access stylesheet:', error);
    }
  }

  const criticalCSSString = criticalCSS.join('\n');
  
  // Check size limit
  if (criticalCSSString.length > config.maxSize) {
    console.warn(`Critical CSS size (${criticalCSSString.length} bytes) exceeds limit (${config.maxSize} bytes)`);
  }

  return criticalCSSString;
}

/**
 * Check if a CSS selector is considered critical
 */
function isCriticalSelector(selector: string, criticalSelectors: string[]): boolean {
  return criticalSelectors.some(criticalSelector => {
    if (criticalSelector.endsWith('-')) {
      // Pattern matching for classes like '.bg-', '.text-'
      return selector.includes(criticalSelector);
    }
    return selector === criticalSelector || selector.includes(criticalSelector);
  });
}

/**
 * Inline critical CSS in the document head
 */
export function inlineCriticalCSS(criticalCSS: string): void {
  if (!criticalCSS || typeof window === 'undefined') {
    return;
  }

  // Remove existing critical CSS
  const existingCritical = document.querySelector('style[data-critical="true"]');
  if (existingCritical) {
    existingCritical.remove();
  }

  // Create and insert critical CSS
  const style = document.createElement('style');
  style.setAttribute('data-critical', 'true');
  style.textContent = criticalCSS;
  
  // Insert at the beginning of head for highest priority
  document.head.insertBefore(style, document.head.firstChild);
}

/**
 * Load non-critical CSS asynchronously
 */
export function loadNonCriticalCSS(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Find all stylesheets that are not critical
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  stylesheets.forEach(link => {
    // Skip if already loaded or is critical
    if (link.getAttribute('data-loaded') === 'true' || 
        link.getAttribute('data-critical') === 'true') {
      return;
    }

    // Load asynchronously
    link.setAttribute('data-loaded', 'true');
    link.setAttribute('media', 'print');
    link.onload = () => {
      link.setAttribute('media', 'all');
    };
  });
}

/**
 * Initialize critical CSS optimization
 */
export function initCriticalCSS(options: Partial<CriticalCSSOptions> = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled) {
    return;
  }

  // Extract and inline critical CSS
  const criticalCSS = extractCriticalCSS(config);
  if (criticalCSS) {
    inlineCriticalCSS(criticalCSS);
  }

  // Load non-critical CSS asynchronously
  loadNonCriticalCSS();
}

/**
 * Performance monitoring for critical CSS
 */
export function measureCriticalCSSPerformance(): {
  criticalCSSSize: number;
  totalCSSSize: number;
  criticalCSSRatio: number;
} {
  if (typeof window === 'undefined') {
    return { criticalCSSSize: 0, totalCSSSize: 0, criticalCSSRatio: 0 };
  }

  const criticalStyle = document.querySelector('style[data-critical="true"]');
  const criticalCSSSize = criticalStyle ? criticalStyle.textContent?.length || 0 : 0;
  
  const allStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
  const totalCSSSize = allStyles.reduce((total, style) => {
    if (style.tagName === 'STYLE') {
      return total + (style.textContent?.length || 0);
    } else {
      // For link elements, we can't easily measure the size
      return total;
    }
  }, 0);

  const criticalCSSRatio = totalCSSSize > 0 ? (criticalCSSSize / totalCSSSize) * 100 : 0;

  return {
    criticalCSSSize,
    totalCSSSize,
    criticalCSSRatio
  };
}
