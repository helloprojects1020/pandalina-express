import { useI18n, type Locale } from '@/i18n/context';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const langs: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עברית' },
  { code: 'ar', label: 'العربية' },
];

const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-card/80 backdrop-blur text-foreground text-xs font-semibold shadow-soft active:scale-95 transition-transform border border-border"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        {langs.find((l) => l.code === locale)?.label}
      </button>

      {open && (
        <div className="absolute top-full mt-1 end-0 bg-card rounded-xl shadow-elevated border border-border overflow-hidden min-w-[120px]">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-start text-sm font-medium transition-colors ${
                locale === l.code ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
