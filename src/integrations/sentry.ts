// Sentry integration — thin wrapper so the rest of the app doesn't have
// to know or care about @sentry/react's API surface.
//
// Activation: set VITE_SENTRY_DSN in your production env. Without it,
// every call here is a cheap no-op. This means the module is always
// safe to import; prod vs. dev is gated by the DSN, not by build flags.
// Non-prod builds also skip init by default so we don't spam the
// project during local dev.
//
// The local `errorTrackingSystem` keeps running too — it's still useful
// for the in-app debug panel and for capturing actions as breadcrumbs.
// Sentry is the remote sink; the local tracker is the session sink.

import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const enableInDev = import.meta.env.VITE_SENTRY_ENABLE_IN_DEV === 'true';

  if (!dsn) return;
  if (!import.meta.env.PROD && !enableInDev) return;

  Sentry.init({
    dsn,
    environment: (import.meta.env.MODE ?? 'production') as string,
    release: (import.meta.env.VITE_APP_VERSION as string) || undefined,

    // Trace a small slice of transactions — enough for perf insight,
    // not enough to blow through the free-tier quota at launch traffic.
    tracesSampleRate: 0.1,

    // Keep session replay conservative: 0% normally, 100% on errors, so
    // we get a replay for the session that triggered an error without
    // capturing everything.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Strip query strings from breadcrumb URLs — they often carry
    // tokens or user ids.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
        try {
          const u = new URL(breadcrumb.data.url, window.location.origin);
          breadcrumb.data.url = u.origin + u.pathname;
        } catch {
          // leave as-is if it isn't a valid URL
        }
      }
      return breadcrumb;
    },
  });

  initialized = true;
}

export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (!initialized) return;
  if (user) {
    // Intentionally minimal: never send `username`, `ip_address`, or any
    // PII-adjacent field beyond id + hashed-email-domain-style email.
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

// Safe capture — never throws even if Sentry isn't initialized.
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // swallow; error reporting must never itself raise
  }
}

export { Sentry };
