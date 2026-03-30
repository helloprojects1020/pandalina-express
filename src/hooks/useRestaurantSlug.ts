/**
 * Resolves restaurant slug from hostname (subdomain-based routing).
 *
 * Production:  pandalina.bitelyx.com   → "pandalina"
 * Production:  boroburger.bitelyx.com  → "boroburger"
 * Development: localhost / 127.0.0.1   → VITE_RESTAURANT_SLUG env var
 */

const ROOT_DOMAINS = ["bitelyx.com", "vercel.app", "netlify.app"];

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
      if (subdomain && subdomain !== "www") return subdomain;
    }
  }

  // ── Custom domain (e.g. pandalina.co.il) — use full hostname as slug ─────
  // Strip "www." prefix if present
  const clean = hostname.replace(/^www\./, "");
  return clean;
}
