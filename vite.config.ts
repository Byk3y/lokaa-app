import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const SUPABASE_URL = 'https://nmddvthcsyppyjncqfsk.supabase.co';

const buildCSP = (isDev: boolean) => {
  const directives: Record<string, Array<string | false>> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      isDev && "'unsafe-eval'",
      isDev && "'unsafe-inline'",
      SUPABASE_URL,
      'https://us-assets.i.posthog.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      SUPABASE_URL,
      'https://img.youtube.com',
      'https://i.ytimg.com',
      'https://i.vimeocdn.com',
      'https://giphy.com',
      'https://media.giphy.com',
      'https://i.imgur.com',
    ],
    'media-src': ["'self'", SUPABASE_URL],
    'connect-src': [
      "'self'",
      SUPABASE_URL,
      'https://nmddvthcsyppyjncqfsk.functions.supabase.co',
      'wss://nmddvthcsyppyjncqfsk.supabase.co',
      isDev && 'ws:',
      'https://api.giphy.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
    ],
    'frame-src': [
      "'self'",
      'https://www.youtube.com',
      'https://youtube.com',
      'https://player.vimeo.com',
    ],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      const filtered = values.filter(Boolean);
      return filtered.length ? `${key} ${filtered.join(' ')}` : null;
    })
    .filter(Boolean)
    .join('; ');
};

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    strictPort: true,
    hmr: { clientPort: 8080, port: 8080, overlay: true },
    headers: {
      'Content-Security-Policy': buildCSP(true),
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['stream', 'util', 'url', 'http', 'https', 'buffer', 'process'],
      globals: { global: true, process: true, Buffer: true },
      overrides: { fs: 'memfs' },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@supabase/supabase-js',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react',
      '@giphy/js-fetch-api',
      '@giphy/react-components',
    ],
    esbuildOptions: {
      define: { global: 'globalThis' },
      jsx: 'automatic',
      target: 'es2020',
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['uuid', 'date-fns', 'clsx', 'tailwind-merge'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-avatar',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            'lucide-react',
          ],
          'supabase-vendor': ['@supabase/supabase-js'],
          'router-vendor': ['react-router-dom'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          'query-vendor': ['@tanstack/react-query'],
          'state-vendor': ['zustand', 'immer'],
          'validation-vendor': ['zod'],
          'animation-vendor': ['framer-motion'],
          'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit'],
          'content-vendor': ['@emoji-mart/react', '@emoji-mart/data'],
          'giphy-vendor': ['@giphy/js-fetch-api', '@giphy/react-components'],
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  css: {
    devSourcemap: mode === 'development',
    postcss: { plugins: [tailwindcss, autoprefixer] },
  },
}));
