import { useI18n } from '@/i18n/context';
import { trackWhatsAppClick } from '@/lib/analytics';
import platterImg from '@/assets/platter.jpg';

const WhatsAppCTA = () => {
  const { t } = useI18n();

  return (
    <section className="py-12 px-4">
      <div className="max-w-screen-xl mx-auto rounded-3xl overflow-hidden relative">
        {/* Food background */}
        <img
          src={platterImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/65" />

        {/* Content */}
        <div className="relative z-10 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-4xl tracking-tighter uppercase text-primary-foreground mb-3">
            {t.cta.title}
          </h2>
          <p className="text-sm md:text-base text-primary-foreground/70 mb-6 max-w-md mx-auto font-body">
            {t.cta.desc}
          </p>
          <a
            href="https://wa.me/972526204159"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick('cta_banner')}
            className="inline-flex h-14 px-8 rounded-full bg-[#25D366] text-primary-foreground font-bold text-sm items-center gap-2 active:scale-95 transition-transform"
          >
            {t.cta.button}
          </a>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCTA;
