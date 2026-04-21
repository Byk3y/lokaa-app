import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

// Dedicated config for RLS integration tests. Runs only tests under
// tests/integration/ and uses the node environment (no jsdom, no
// fake-indexeddb, no vitest.setup.ts). Refuses to run unless the three
// SUPABASE_INT_* env vars are set — see tests/integration/README.md.

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
    globals: true,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
