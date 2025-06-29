import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
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
  
  // Space features  
  if (id.includes('src/features/spaces') || 
      id.includes('src/pages/Space') ||
      id.includes('src/components/space')) {
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
      isProd && VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigationPreload: true,
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
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: [
        "@supabase/supabase-js",
        "@radix-ui/react-icons",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "lucide-react"
      ],
      force: true
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000, // Increase warning limit temporarily
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              return 'vendor';
            }
            return null;
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
