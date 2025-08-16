import { lazy } from 'react';

function shouldHardReload(error: unknown): boolean {
  const msg = (error as any)?.message || String(error || '');
  if (!msg) return false;
  const needles = [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'is not a valid JavaScript MIME type',
    'ChunkLoadError',
    'Loading chunk',
    'Unexpected token <', // HTML served instead of JS
  ];
  return needles.some((s) => msg.includes(s));
}

export function lazyWithReload<T extends { default: any }>(
  importer: () => Promise<T>,
  options?: { id?: string }
) {
  const flagKey = `lazy-reload:${options?.id || 'global'}`;

  return lazy(async () => {
    try {
      const mod = await importer();
      // Clear any previous reload flag on successful load
      try { sessionStorage.removeItem(flagKey); } catch {}
      return mod as any;
    } catch (err) {
      try {
        const already = sessionStorage.getItem(flagKey);
        if (!already && shouldHardReload(err)) {
          sessionStorage.setItem(flagKey, '1');
          // Force a hard reload to pick up the new asset map
          window.location.reload();
          // Keep this promise pending; the page will reload.
          await new Promise(() => {});
        }
      } catch {}
      throw err;
    }
  });
}


