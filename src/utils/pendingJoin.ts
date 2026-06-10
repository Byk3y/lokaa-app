/**
 * Pending space-join intent persistence.
 *
 * When an unauthenticated visitor clicks "Join" on a public space about page,
 * we stash the target space here (in sessionStorage) and send them through the
 * auth flow. After they authenticate they are returned to the about page via the
 * shared `redirect_after_login` mechanism (honored by authStateUtils for
 * email/password sign-in and by AuthCallback for OAuth), where the join is
 * resumed automatically. See the auto-resume effect in SpaceAboutPage.
 */

const PENDING_JOIN_KEY = 'lokaa_pending_join';
const REDIRECT_AFTER_LOGIN_KEY = 'redirect_after_login';

export interface PendingJoin {
  /** The space the user intended to join. */
  spaceId: string;
  /** The space subdomain, used as a fallback match. */
  subdomain: string;
  /** Where to return the user after authenticating (the about page path). */
  returnPath: string;
}

export function setPendingJoin(pending: PendingJoin): void {
  try {
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify(pending));
    // Reuse the app-wide post-auth redirect so the user lands back on the about
    // page after login / signup / OAuth, where the join is resumed.
    sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, pending.returnPath);
  } catch {
    // sessionStorage unavailable (e.g. private mode) — non-fatal.
  }
}

export function getPendingJoin(): PendingJoin | null {
  try {
    const raw = sessionStorage.getItem(PENDING_JOIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingJoin;
    if (!parsed || (!parsed.spaceId && !parsed.subdomain)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingJoin(): void {
  try {
    sessionStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    // ignore
  }
}
