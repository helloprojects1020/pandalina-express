import logoImg from '@/assets/logo.png';
import { useI18n } from '@/i18n/context';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.25" fill="url(#ig-grad)" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path
      fill="#25D366"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.13.11-1.82-.11-.42-.14-.96-.34-1.65-.66-2.92-1.36-4.82-4.31-4.97-4.51-.14-.2-1.17-1.56-1.17-2.97 0-1.42.74-2.12 1.01-2.41.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.57.82 2.01.89 2.16.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.28.29-.12.57.16.28.73 1.21 1.57 1.96 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.6-.07.17-.19.7-.82.89-1.1.19-.28.38-.24.63-.14.26.1 1.63.77 1.91.91.28.14.46.21.53.33.07.11.07.66-.17 1.34z"
    />
  </svg>
);

const WazeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    {/* Face / body */}
    <path
      fill="#FFFFFF"
      d="M20.37 11.38c0-4.52-3.83-8.19-8.55-8.19S3.27 6.86 3.27 11.38c0 1.97.75 3.78 2 5.18-.25 1.2-.88 2.28-1.77 3.1a.5.5 0 0 0 .35.85c1.6 0 3.1-.59 4.27-1.55.96.3 1.97.46 3.01.46h.05c4.72 0 8.55-3.67 8.55-8.19l-.36.15z"
    />
    <path
      fill="#000000"
      d="M20.37 11.38c0-4.52-3.83-8.19-8.55-8.19S3.27 6.86 3.27 11.38c0 1.97.75 3.78 2 5.18-.25 1.2-.88 2.28-1.77 3.1a.5.5 0 0 0 .35.85c1.6 0 3.1-.59 4.27-1.55.96.3 1.97.46 3.01.46h.05c4.72 0 8.55-3.67 8.55-8.19z"
      fillOpacity="0"
      stroke="#000000"
      strokeWidth="0.8"
    />
    {/* Eyes */}
    <circle cx="9.5" cy="10.5" r="1.4" fill="#000000" />
    <circle cx="14.5" cy="10.5" r="1.4" fill="#000000" />
    {/* Mouth */}
    <path
      d="M9.5 14c0 0 1.2 1.5 2.5 1.5s2.5-1.5 2.5-1.5"
      fill="none"
      stroke="#000000"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
  </svg>
);

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-accent text-accent-foreground py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Pandalina" className="w-10 h-10 rounded-lg" />
            <div>
              <h3 className="font-display text-base">Pandalina</h3>
              <p className="text-xs text-accent-foreground/50">{t.hero.subtitle}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-2">{t.footer.contact}</h4>
            <p className="text-sm text-accent-foreground/60">📞 050-300-9005</p>
            <p className="text-sm text-accent-foreground/60">📍 {t.footer.address}</p>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-2">{t.footer.hours_title}</h4>
            <p className="text-sm text-accent-foreground/60">{t.footer.hours_sun_thu}</p>
            <p className="text-sm text-accent-foreground/60">{t.footer.hours_fri}</p>
            <p className="text-sm text-accent-foreground/60">{t.footer.hours_sat}</p>
          </div>
        </div>

        {/* Social Icons — brand colors */}
        <div className="flex justify-center gap-6 mt-8">
          <a
            href="https://www.instagram.com/pandalina_asian_st._bar/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform duration-200"
            aria-label="Instagram"
          >
            <InstagramIcon className="w-7 h-7" />
          </a>
          <a
            href="https://wa.me/972526204159"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform duration-200"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon className="w-7 h-7" />
          </a>
          <span
            className="opacity-80 cursor-default"
            aria-label="Waze"
            title="Waze"
          >
            <WazeIcon className="w-7 h-7" />
          </span>
        </div>

        <div className="border-t border-accent-foreground/10 mt-8 pt-6 text-center space-y-2">
          <p className="text-xs text-accent-foreground/40">
            {t.footer.copyright.replace('{{year}}', String(new Date().getFullYear()))}
          </p>
          <p className="text-[10px] text-accent-foreground/25 tracking-wider uppercase">
            Powered by BITELYX
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
