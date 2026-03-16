import type { Locale } from '@/i18n/context';

/**
 * Get a localized field from an object that has optional name_he, name_ar, name_en fields.
 * Falls back to the base field (e.g. `name`) if no localized version exists.
 */
export function localizedName(
  obj: { name: string; name_he?: string; name_ar?: string; name_en?: string },
  locale: Locale
): string {
  const key = `name_${locale}` as keyof typeof obj;
  return (obj[key] as string) || obj.name;
}

export function localizedDescription(
  obj: { description: string; description_he?: string; description_ar?: string; description_en?: string },
  locale: Locale
): string {
  const key = `description_${locale}` as keyof typeof obj;
  return (obj[key] as string) || obj.description;
}

export function localizedTitle(
  obj: { title: string; title_he?: string; title_ar?: string; title_en?: string },
  locale: Locale
): string {
  const key = `title_${locale}` as keyof typeof obj;
  return (obj[key] as string) || obj.title;
}
