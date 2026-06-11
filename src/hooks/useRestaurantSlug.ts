/**
 * Resolves restaurant slug from hostname (subdomain-based routing).
 *
 * Production:  pandalina.bitelyx.com   → "pandalina"
 * Production:  boroburger.bitelyx.com  → "boroburger"
 * Development: localhost / 127.0.0.1   → VITE_RESTAURANT_SLUG env var
 */

const ROOT_DOMAINS = ["bitelyx.com", "vercel.app", "netlify.app", "lovable.app", "lovableproject.com"];

export function getRestaurantSlug(): string {
  const hostname = window.location.hostname;

  // ── Local dev fallback ───────────────────────────────────────────────────
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168")
  ) {
    return import.meta.env.VITE_RESTAURANT_SLUG ?? "pandalina";
  }

  // ── Extract subdomain from known root domains ────────────────────────────
  for (const root of ROOT_DOMAINS) {
    if (hostname.endsWith(`.${root}`)) {
      const subdomain = hostname.slice(0, hostname.length - root.length - 1);
      // Ignore "www"
      if (subdomain && subdomain !== "www") {
        // Lovable preview hosts look like "id-preview--<uuid>" or
        // "<uuid>" on lovable.app / lovableproject.com — they aren't
        // real restaurant slugs, so fall back to the dev default.
        if (root === "lovable.app" || root === "lovableproject.com") {
          return import.meta.env.VITE_RESTAURANT_SLUG ?? "pandalina";
        }
        return subdomain;
      }
    }
  }

  // ── Custom domain (e.g. pandalina.co.il) — use full hostname as slug ─────
  // Strip "www." prefix if present
  const clean = hostname.replace(/^www\./, "");
  return clean;
}
