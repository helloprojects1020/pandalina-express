import type { Locale } from "@/i18n/context";

type LocalizedNameObj = {
  name: string;
  name_he?: string;
  name_ar?: string;
  name_en?: string;
  name_ru?: string;
};

type LocalizedDescObj = {
  description: string;
  description_he?: string;
  description_ar?: string;
  description_en?: string;
  description_ru?: string;
};

type LocalizedTitleObj = {
  title: string;
  title_he?: string;
  title_ar?: string;
  title_en?: string;
  title_ru?: string;
};

/**
 * Fallback chain per locale:
 * he  → name_he → name
 * ar  → name_ar → name_he → name
 * en  → name_en → name    → name_he
 * ru  → name_ru → name_he → name
 */
export function localizedName(obj: LocalizedNameObj, locale: Locale): string {
  switch (locale) {
    case "he":
      return obj.name_he || obj.name;
    case "ar":
      return obj.name_ar || obj.name_he || obj.name;
    case "en":
      return obj.name_en || obj.name || obj.name_he || "";
    case "ru":
      return obj.name_ru || obj.name_he || obj.name;
    default:
      return obj.name_he || obj.name;
  }
}

/**
 * Fallback chain per locale:
 * he  → description_he → description
 * ar  → description_ar → description_he → description
 * en  → description_en → description    → description_he
 * ru  → description_ru → description_he → description
 */
export function localizedDescription(
  obj: LocalizedDescObj,
  locale: Locale,
): string {
  switch (locale) {
    case "he":
      return obj.description_he || obj.description || "";
    case "ar":
      return obj.description_ar || obj.description_he || obj.description || "";
    case "en":
      return obj.description_en || obj.description || obj.description_he || "";
    case "ru":
      return obj.description_ru || obj.description_he || obj.description || "";
    default:
      return obj.description_he || obj.description || "";
  }
}

/**
 * Fallback chain per locale for option group titles
 */
export function localizedTitle(obj: LocalizedTitleObj, locale: Locale): string {
  switch (locale) {
    case "he":
      return obj.title_he || obj.title;
    case "ar":
      return obj.title_ar || obj.title_he || obj.title;
    case "en":
      return obj.title_en || obj.title || obj.title_he || "";
    case "ru":
      return obj.title_ru || obj.title_he || obj.title;
    default:
      return obj.title_he || obj.title;
  }
}
