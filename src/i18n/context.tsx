import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import en from './locales/en';
import he from './locales/he';
import ar from './locales/ar';
import ru from './locales/ru';
import type { Translations } from './locales/en';

export type Locale = 'en' | 'he' | 'ar' | 'ru';

const locales: Record<Locale, Translations> = { en, he, ar, ru };

interface I18nContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: Translations;
  setLocale: (locale: Locale) => void;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

function detectLocale(): Locale {
  const saved = localStorage.getItem('pandalina-lang') as Locale | null;
  if (saved && locales[saved]) return saved;

  const browserLang = navigator.language?.toLowerCase() || '';
  if (browserLang.startsWith('he')) return 'he';
  if (browserLang.startsWith('ar')) return 'ar';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const translations = locales[locale];
  const dir = translations.dir as 'ltr' | 'rtl';

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('pandalina-lang', l);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', translations.lang);
  }, [dir, translations.lang]);

  return (
    <I18nContext.Provider value={{ locale, dir, t: translations, setLocale, isRTL: dir === 'rtl' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
}
