import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// 🚀 Phase 5B: Advanced Bundle Optimization Configuration
const createOptimizedChunks = () => ({
  // 🔹 Core Framework (Critical)
  'react-core': ['react', 'react-dom', 'react/jsx-runtime'],
  'react-router': ['react-router-dom'],
  
  // 🔹 UI System (Cacheable)
  'ui-core': [
    'lucide-react',
    '@radix-ui/react-dialog', 
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-avatar',
    '@radix-ui/react-tooltip',
    '@radix-ui/react-tabs',
    '@radix-ui/react-select',
    '@radix-ui/react-slot'
  ],
  
  // 🔹 Backend & Data (Stable)
  'supabase-core': ['@supabase/supabase-js'],
  'query-core': ['@tanstack/react-query'],
  
  // 🔹 Utilities (Highly Cacheable)
  'utils-core': ['date-fns', 'clsx', 'tailwind-merge'],
  'helmet-vendor': ['react-helmet-async'],
  
  // 🔹 Feature Modules (On-demand)
  'chat-module': [], // Will be populated dynamically
  'space-module': [], // Will be populated dynamically
  'auth-module': [], // Will be populated dynamically
});

// 🔹 Smart chunk splitting based on module path
const createDynamicChunks = (id: string) => {
  // Performance optimizations go to performance chunk
  if (id.includes('src/hooks/useCleanupTracker') ||
      id.includes('src/utils/performanceMonitor') ||
      id.includes('src/utils/persistentCache') ||
      id.includes('src/components/performance')) {
    return 'performance-core';
  }
  
  // Chat features
  if (id.includes('src/features/chat') || id.includes('Chat')) {
    return 'chat-module';
  }
  
  // Space features - split into smaller chunks
  if (id.includes('src/features/spaces') || 
      id.includes('src/pages/Space') ||
      id.includes('src/components/space')) {
    // Split space components by type
    if (id.includes('FeedTab') || id.includes('PostCard') || id.includes('CreatePostModal')) {
      return 'space-feed';
    }
    if (id.includes('ClassroomTab') || id.includes('classroom')) {
      return 'space-classroom';
    }
    if (id.includes('CalendarTab') || id.includes('calendar')) {
      return 'space-calendar';
    }
    if (id.includes('LeaderboardsTab') || id.includes('leaderboard')) {
      return 'space-leaderboards';
    }
    if (id.includes('MembersTab') || id.includes('members')) {
      return 'space-members';
    }
    if (id.includes('AboutTab') || id.includes('about')) {
      return 'space-about';
    }
    // Default space chunk
    return 'space-module';
  }
  
  // Auth features
  if (id.includes('src/features/auth') || 
      id.includes('src/contexts/Auth') ||
      id.includes('auth')) {
    return 'auth-module';
  }
  
  // Settings and profile
  if (id.includes('src/pages/Profile') ||
      id.includes('src/pages/UserSettings') ||
      id.includes('settings')) {
    return 'settings-module';
  }
  
  // Provider optimizations
  if (id.includes('src/providers/OptimizedProviders')) {
    return 'provider-core';
  }
  
  // Keep node_modules in vendor chunks
  if (id.includes('node_modules')) {
    return null; // Let manual chunks handle this
  }
  
  return null;
};

// CSP Configuration
const getCSPConfig = (mode: 'development' | 'production') => {
  const isDev = mode === 'development';
  
  // Base CSP directives
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      isDev && "'unsafe-eval'", // Required for Vite HMR
      isDev && "'unsafe-inline'", // Required for React DevTools
      'https://nmddvthcsyppyjncqfsk.supabase.co'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and dynamic styles
      'https://fonts.googleapis.com' // Allow Google Fonts CSS
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://nmddvthcsyppyjncqfsk.supabase.co',
      'https://img.youtube.com',
      'https://i.ytimg.com',
      'https://i.vimeocdn.com',
      'https://giphy.com',
      'https://media.giphy.com',
      'https://i.imgur.com',
      'https://lovable.dev'
    ],
    'media-src': [
      "'self'",
      'https://nmddvthcsyppyjncqfsk.supabase.co'
    ],
    'connect-src': [
      "'self'",
      'https://nmddvthcsyppyjncqfsk.supabase.co',
      isDev && 'ws:', // Required for Vite HMR WebSocket
      'https://api.giphy.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ],
    'frame-src': [
      "'self'",
      'https://www.youtube.com',
      'https://youtube.com',
      'https://player.vimeo.com'
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com' // Allow Google Fonts
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"]
  };

  // Filter out false values and join arrays
  const policy = Object.entries(directives)
    .map(([key, values]) => {
      const filteredValues = values.filter(Boolean);
      return filteredValues.length ? `${key} ${filteredValues.join(' ')}` : null;
    })
    .filter(Boolean)
    .join('; ');

  return policy;
};

// Get CSP Report-Only configuration
const getCSPReportOnlyConfig = (mode: 'development' | 'production') => {
  const basePolicy = getCSPConfig(mode);
  return `${basePolicy}; report-uri https://nmddvthcsyppyjncqfsk.supabase.co/functions/v1/csp-report`;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  
  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: false,
      hmr: {
        clientPort: 8080,
        port: 8080,
        overlay: true
      },
      headers: {
        // Enforced CSP
        'Content-Security-Policy': getCSPConfig('development'),
        // Report-only CSP (separate header)
        'Content-Security-Policy-Report-Only': getCSPReportOnlyConfig('development')
      },
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/coverage/**',
          '**/temp/**',
          '**/tmp/**'
        ],
        usePolling: false,
      },
    },
    plugins: [
      react(),
      nodePolyfills({
        // Enable polyfills for specific Node.js modules
        include: ['stream', 'util', 'url', 'http', 'https', 'buffer', 'process'],
        // Whether to polyfill `global`
        globals: {
          global: true,
          process: true,
          Buffer: true,
        },
        // Override the default polyfills for specific modules
        overrides: {
          // Since `fs` is not supported in browsers, we can use the polyfill
          fs: 'memfs',
        },
      }),
      ...(false ? [VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigationPreload: false,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(posts|comments|space_members)/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'lokaa-readonly',
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 }
              }
            },
            {
              urlPattern: ({ url }) => {
                return url.href.match(/^https:\/\/.*\.supabase\.co\/rest\/v1\//) && 
                       !url.pathname.includes('/auth/') && 
                       !url.searchParams.has('apikey');
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 300,
                },
              },
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 2592000,
                },
              },
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 86400,
                },
              },
            },
          ],
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/.*/],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        includeAssets: ['favicon.ico', 'lokaa-logo.svg', 'robots.txt', 'offline.html'],
        manifest: {
          name: 'Lokaa Connect Spaces',
          short_name: 'Lokaa Spaces',
          description: 'Connect, collaborate, and build communities in your dedicated spaces',
          theme_color: '#14b8a6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          lang: 'en',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable any'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable any'
            }
          ],
          shortcuts: [
            {
              name: 'Discover Spaces',
              short_name: 'Discover',
              description: 'Find and join new spaces',
              url: '/discover',
              icons: [{ src: '/icons/discover-96x96.png', sizes: '96x96' }]
            }
          ],
          categories: ['social', 'productivity'],
          prefer_related_applications: false,
        },
        devOptions: {
          enabled: false,
          type: 'module',
          navigateFallback: 'index.html',
        },
      })] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      mainFields: ['module', 'main'], // Prefer ES modules over CommonJS
      conditions: ['import', 'module', 'browser', 'default'],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime", 
        "react/jsx-dev-runtime",
        "@supabase/supabase-js",
        "@radix-ui/react-icons",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "lucide-react",
        "styled-components",
        "shallowequal",
        "@giphy/js-fetch-api",
        "@giphy/react-components",
        "react-use"
      ],
      exclude: [],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        // Ensure React is properly handled
        jsx: 'automatic',
        target: 'es2020'
      },
      force: true
    },
    define: {
      // Global process object for libraries that expect it
      'global': 'globalThis',
      // Provide process.env for Node.js compatibility
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Node.js polyfills for browser compatibility
      'process': JSON.stringify({ env: { NODE_ENV: mode } }),
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500, // Aggressive optimization - target smaller chunks
      sourcemap: false, // Disable sourcemaps in production for faster builds
      modulePreload: {
        polyfill: false // Disable module preload polyfill to avoid conflicts
      },
      // Force cache busting
      assetsDir: `assets-${Date.now()}`,
      rollupOptions: {
        external: (id) => {
          // Never externalize React or React-DOM - they must be bundled
          if (id === 'react' || id === 'react-dom' || id === 'react/jsx-runtime') {
            return false;
          }
          return false; // Bundle everything by default
        },
        output: {
          manualChunks: {
            // Explicitly define React in main bundle by NOT including it here
            // All other major dependencies get their own chunks
            'vendor': ['lodash', 'uuid', 'date-fns', 'clsx', 'tailwind-merge'],
            'ui-vendor': [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-avatar',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              'lucide-react'
            ],
            'supabase-vendor': ['@supabase/supabase-js'],
            'router-vendor': ['react-router-dom'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers'],
            'query-vendor': ['@tanstack/react-query'],
            'state-vendor': ['zustand', 'immer'],
            'validation-vendor': ['zod'],
            'animation-vendor': ['framer-motion'],
            'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit'],
            'content-vendor': ['@emoji-mart/react', '@emoji-mart/data']
          }
        }
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    css: {
      devSourcemap: mode === 'development',
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
      // Optimize CSS rebuilds during development
      preprocessorOptions: {
        css: {
          // Reduce CSS dependency tracking sensitivity
          hmrPartialAccept: false,
        },
      },
    },
  };
});
