// GA4 event helper — wraps window.gtag so we get type safety
// and a single place to manage custom events.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GAEventParams = Record<string, string | number | boolean | undefined>;

export const trackEvent = (
  eventName: string,
  params?: GAEventParams,
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

/* ── Pre-defined events ── */

export const trackWhatsAppClick = (label = 'whatsapp') =>
  trackEvent('whatsapp_click', { event_category: 'contact', event_label: label });

export const trackPhoneClick = () =>
  trackEvent('phone_click', { event_category: 'contact', event_label: 'phone' });

export const trackMenuView = () =>
  trackEvent('menu_view', { event_category: 'engagement', event_label: 'menu' });
