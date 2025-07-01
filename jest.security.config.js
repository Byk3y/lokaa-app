import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    deps: {
      inline: [/@supabase\/supabase-js/],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: {
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    resolveSnapshotPath: (testPath, snapExtension) => testPath + snapExtension,
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}); 