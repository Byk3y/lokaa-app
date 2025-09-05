/**
 * 🚀 Phase 3.2: Font Optimization Utility
 * 
 * This utility optimizes font loading for better performance and Core Web Vitals.
 * Implements font preloading, display swap, and fallback strategies.
 */

export interface FontOptimizationOptions {
  /** Whether to enable font optimization */
  enabled: boolean;
  /** Fonts to preload */
  preloadFonts: FontPreload[];
  /** Font display strategy */
  displayStrategy: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  /** Whether to use font-display: swap */
  useSwap: boolean;
  /** Fallback fonts for each font family */
  fallbackFonts: Record<string, string[]>;
  /** Whether to use font subsetting */
  useSubsetting: boolean;
}

export interface FontPreload {
  /** Font family name */
  family: string;
  /** Font weight */
  weight: string;
  /** Font style */
  style: string;
  /** Font URL */
  url: string;
  /** Whether this font is critical */
  critical: boolean;
}

const DEFAULT_OPTIONS: FontOptimizationOptions = {
  enabled: process.env.NODE_ENV === 'production',
  preloadFonts: [
    {
      family: 'Inter',
      weight: '400',
      style: 'normal',
      url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
      critical: true
    },
    {
      family: 'Inter',
      weight: '600',
      style: 'normal',
      url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2',
      critical: true
    }
  ],
  displayStrategy: 'swap',
  useSwap: true,
  fallbackFonts: {
    'Inter': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    'serif': ['Georgia', 'Times New Roman', 'serif'],
    'monospace': ['Monaco', 'Consolas', 'Courier New', 'monospace']
  },
  useSubsetting: true
};

/**
 * Preload critical fonts
 */
export function preloadFonts(options: Partial<FontOptimizationOptions> = {}): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') {
    return;
  }

  config.preloadFonts.forEach(font => {
    if (font.critical) {
      preloadFont(font);
    }
  });
}

/**
 * Preload a single font
 */
function preloadFont(font: FontPreload): void {
  // Check if font is already preloaded
  const existingLink = document.querySelector(`link[href="${font.url}"]`);
  if (existingLink) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.href = font.url;
  link.crossOrigin = 'anonymous';
  
  // Add font family and weight attributes for better caching
  link.setAttribute('data-font-family', font.family);
  link.setAttribute('data-font-weight', font.weight);
  link.setAttribute('data-font-style', font.style);
  
  document.head.appendChild(link);
}

/**
 * Apply font display strategy to existing font links
 */
export function applyFontDisplayStrategy(options: Partial<FontOptimizationOptions> = {}): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') {
    return;
  }

  // Find all Google Fonts links
  const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
  
  fontLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      // Add font-display parameter
      const url = new URL(href);
      url.searchParams.set('display', config.displayStrategy);
      link.setAttribute('href', url.toString());
    }
  });
}

/**
 * Create optimized font CSS
 */
export function createOptimizedFontCSS(
  fontFamily: string, 
  options: Partial<FontOptimizationOptions> = {}
): string {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const fallbackFonts = config.fallbackFonts[fontFamily] || config.fallbackFonts['Inter'];
  const fontStack = `"${fontFamily}", ${fallbackFonts.join(', ')}`;
  
  let css = `font-family: ${fontStack};`;
  
  if (config.useSwap) {
    css += ` font-display: swap;`;
  }
  
  return css;
}

/**
 * Load fonts asynchronously
 */
export function loadFontsAsync(options: Partial<FontOptimizationOptions> = {}): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') {
    return;
  }

  // Use FontFace API if available
  if ('FontFace' in window) {
    config.preloadFonts.forEach(font => {
      loadFontWithFontFace(font);
    });
  } else {
    // Fallback to link preloading
    preloadFonts(config);
  }
}

/**
 * Load font using FontFace API
 */
function loadFontWithFontFace(font: FontPreload): void {
  try {
    const fontFace = new FontFace(font.family, `url(${font.url})`, {
      weight: font.weight,
      style: font.style,
      display: 'swap'
    });

    fontFace.load().then(() => {
      document.fonts.add(fontFace);
    }).catch(error => {
      console.warn(`Failed to load font ${font.family}:`, error);
    });
  } catch (error) {
    console.warn(`FontFace API not supported or error loading ${font.family}:`, error);
  }
}

/**
 * Optimize existing font links
 */
export function optimizeExistingFonts(options: Partial<FontOptimizationOptions> = {}): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') {
    return;
  }

  // Find all font links
  const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
  
  fontLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const url = new URL(href);
      
      // Add display parameter if not present
      if (!url.searchParams.has('display')) {
        url.searchParams.set('display', config.displayStrategy);
        link.setAttribute('href', url.toString());
      }
      
      // Add preconnect for better performance
      addPreconnect('https://fonts.googleapis.com');
      addPreconnect('https://fonts.gstatic.com');
    }
  });
}

/**
 * Add preconnect link for better font loading performance
 */
function addPreconnect(origin: string): void {
  const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
  if (existing) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * Initialize font optimization
 */
export function initFontOptimization(options: Partial<FontOptimizationOptions> = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled) {
    return;
  }

  // Preload critical fonts
  preloadFonts(config);
  
  // Apply display strategy
  applyFontDisplayStrategy(config);
  
  // Optimize existing fonts
  optimizeExistingFonts(config);
  
  // Load fonts asynchronously
  loadFontsAsync(config);
}

/**
 * Measure font loading performance
 */
export function measureFontPerformance(): {
  fontsLoaded: number;
  totalFonts: number;
  loadTime: number;
  fallbackUsed: boolean;
} {
  if (typeof window === 'undefined') {
    return { fontsLoaded: 0, totalFonts: 0, loadTime: 0, fallbackUsed: false };
  }

  const startTime = performance.now();
  const fonts = Array.from(document.fonts);
  const loadedFonts = fonts.filter(font => font.status === 'loaded');
  
  const loadTime = performance.now() - startTime;
  const fallbackUsed = loadedFonts.length < fonts.length;

  return {
    fontsLoaded: loadedFonts.length,
    totalFonts: fonts.length,
    loadTime,
    fallbackUsed
  };
}

/**
 * Create font loading CSS with fallbacks
 */
export function createFontLoadingCSS(options: Partial<FontOptimizationOptions> = {}): string {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  let css = '';
  
  // Add font-display for all fonts
  css += `* { font-display: ${config.displayStrategy}; }\n`;
  
  // Add fallback font stacks
  Object.entries(config.fallbackFonts).forEach(([family, fallbacks]) => {
    css += `.font-${family.toLowerCase()} { font-family: "${family}", ${fallbacks.join(', ')}; }\n`;
  });
  
  return css;
}
