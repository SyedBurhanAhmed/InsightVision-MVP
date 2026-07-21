/**
 * Centralized API URL configuration for InsightVision frontend.
 *
 * Set VITE_API_URL in:
 *   - Local dev:   frontend/.env.local  →  VITE_API_URL=http://localhost:8000
 *   - Vercel prod: Dashboard → Settings → Environment Variables
 *                             →  VITE_API_URL=https://your-backend.ts.net
 *
 * Both API_BASE_URL (HTTP/HTTPS) and WS_BASE_URL (WS/WSS) are exported so
 * every call site imports from here instead of building URLs inline.
 */

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;

  if (!raw) {
    if (import.meta.env.PROD) {
      // Throw at module-load time so the error is visible immediately,
      // not buried in a network failure 30 seconds later.
      throw new Error(
        '[InsightVision] VITE_API_URL is not set — ' +
          'check Vercel environment variables. ' +
          'The app cannot contact the backend without this.'
      );
    }
    // Development fallback — works without a .env.local file.
    console.warn(
      '[InsightVision] VITE_API_URL is not set. ' +
        'Falling back to http://localhost:8000. ' +
        'Create frontend/.env.local with VITE_API_URL=http://localhost:8000 to silence this warning.'
    );
    return 'http://localhost:8000';
  }

  // Strip any trailing slash so callers can always write `${API_BASE_URL}/path`
  return raw.replace(/\/+$/, '');
}

/** Base HTTP/HTTPS URL for all REST calls — e.g. "https://your.ts.net" */
export const API_BASE_URL: string = resolveApiBase();

/**
 * Base WebSocket URL derived from API_BASE_URL.
 * https:// → wss://   |   http:// → ws://
 */
export const WS_BASE_URL: string = API_BASE_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
