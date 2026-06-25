// Thin wrapper around gtag.js (loaded in index.html).
// Safe no-op if gtag is missing or blocked by an ad blocker.

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = 'G-X9P5L4CF0R';

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', event, params);
  } catch {
    // GA failure must never break the app.
  }
}

export function setAnalyticsUser(userId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('config', MEASUREMENT_ID, userId ? { user_id: userId } : {});
  } catch {
    // ignore
  }
}
