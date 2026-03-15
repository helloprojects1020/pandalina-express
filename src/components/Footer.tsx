import logoImg from '@/assets/logo.png';
import { useI18n } from '@/i18n/context';
import { Instagram, MessageCircle, Navigation } from 'lucide-react';

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

        {/* Social Icons */}
        <div className="flex justify-center gap-5 mt-8">
          <a
            href="https://www.instagram.com/pandalina_asian_st._bar/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-foreground/50 hover:text-primary transition-colors duration-200 hover:scale-110 transform"
            aria-label="Instagram"
          >
            <Instagram className="w-6 h-6" />
          </a>
          <a
            href="https://wa.me/972526204159"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-foreground/50 hover:text-primary transition-colors duration-200 hover:scale-110 transform"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-6 h-6" />
          </a>
          <span
            className="text-accent-foreground/50 cursor-default"
            aria-label="Waze"
            title="Waze"
          >
            <Navigation className="w-6 h-6" />
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
