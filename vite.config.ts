import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // HMR OPTIMIZATION: Reduce file watching sensitivity
    hmr: {
      overlay: true,
      // Reduce HMR update frequency for better performance
      port: 24678,
    },
    // Watch configuration to reduce excessive file watching
    watch: {
      // Reduce CPU usage by limiting file watching
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
        '**/temp/**',
        '**/tmp/**'
      ],
      // Use polling fallback only when needed
      usePolling: false,
    },
  },
  plugins: [
    react(),
    // 🚀 Enhanced PWA configuration with vite-plugin-pwa as sole service worker manager
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW', // Generate Workbox service worker
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Enhanced runtime caching for better offline experience
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              // Don't cache auth-sensitive requests
              return url.href.match(/^https:\/\/.*\.supabase\.co\/rest\/v1\//) && 
                     !url.pathname.includes('/auth/') && 
                     !url.searchParams.has('apikey');
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300, // 5 minutes
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
                maxAgeSeconds: 2592000, // 30 days
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
                maxAgeSeconds: 86400, // 1 day
              },
            },
          },
        ],
        // Improved navigation fallback for offline
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/.*/],
        // Clean up old caches
        cleanupOutdatedCaches: true,
        // Skip waiting for immediate activation
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
        // Enhanced PWA features
        categories: ['social', 'productivity'],
        prefer_related_applications: false,
      },
      devOptions: {
        enabled: true, // Enable in development for testing
        type: 'module', // Use ES modules for better debugging
        navigateFallback: 'index.html',
      },
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
  },
  // 🚀 Phase 6: Advanced Bundle Optimization
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000, // Increase warning limit temporarily
    rollupOptions: {
      output: {
        // 🔹 Manual chunks for optimal caching and loading
        manualChunks: (id) => {
          // Vendor chunks (stable, long-term caching)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react/jsx-runtime')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            return 'vendor';
          }

          // Apply dynamic chunking from existing function
          const dynamicChunk = createDynamicChunks(id);
          if (dynamicChunk) {
            return dynamicChunk;
          }

          // Phase-specific chunks
          if (id.includes('phase2') || id.includes('advancedQueryEngine') || id.includes('unifiedRealtimeSystem')) {
            return 'phase2-systems';
          }
          if (id.includes('phase4') || id.includes('errorTracking') || id.includes('analytics')) {
            return 'phase4-systems';
          }
          if (id.includes('phase5') || id.includes('mobile') || id.includes('pwa')) {
            return 'phase5-systems';
          }
          if (id.includes('phase6') || id.includes('bundle') || id.includes('consolidation')) {
            return 'phase6-systems';
          }

          return null;
        },
        // Optimized file naming for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.css$/i.test(name)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // Production optimizations
    sourcemap: false,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  css: {
    // HMR OPTIMIZATION: Improve CSS processing
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
}));
