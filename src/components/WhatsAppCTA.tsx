import { useI18n } from '@/i18n/context';

const WhatsAppCTA = () => {
  const { t } = useI18n();

  return (
    <section className="py-12 px-4">
      <div className="max-w-screen-xl mx-auto bg-accent rounded-3xl p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-4xl tracking-tighter uppercase text-accent-foreground mb-3">
          {t.cta.title}
        </h2>
        <p className="text-sm md:text-base text-accent-foreground/60 mb-6 max-w-md mx-auto font-body">
          {t.cta.desc}
        </p>
        <a
          href="https://wa.me/972503009005"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 px-8 rounded-full bg-[#25D366] text-primary-foreground font-bold text-sm items-center gap-2 active:scale-95 transition-transform"
        >
          {t.cta.button}
        </a>
      </div>
    </section>
  );
};

export default WhatsAppCTA;
