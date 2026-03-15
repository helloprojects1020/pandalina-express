import logoImg from '@/assets/logo.png';
import { useI18n } from '@/i18n/context';

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

        <div className="border-t border-accent-foreground/10 mt-8 pt-6 text-center">
          <p className="text-xs text-accent-foreground/40">
            {t.footer.copyright.replace('{{year}}', String(new Date().getFullYear()))}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
