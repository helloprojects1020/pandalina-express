import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/context';
import heroImg from '@/assets/hero-sushi.jpg';
import kitchen1 from '@/assets/kitchen-1.jpg';
import noodlesImg from '@/assets/noodles.jpg';
import logoImg from '@/assets/logo.png';

interface Slide {
  type: 'image';
  src: string;
  titleKey: 'title' | 'slide2_title' | 'slide3_title';
  taglineKey: 'tagline' | 'slide2_tagline' | 'slide3_tagline';
}

const slides: Slide[] = [
  { type: 'image', src: heroImg, titleKey: 'title', taglineKey: 'tagline' },
  { type: 'image', src: kitchen1, titleKey: 'slide2_title', taglineKey: 'slide2_tagline' },
  { type: 'image', src: noodlesImg, titleKey: 'slide3_title', taglineKey: 'slide3_tagline' },
];

const Hero = () => {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const slide = slides[current];

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-end overflow-hidden">
      {/* Language switcher */}
      <div className="absolute top-4 end-4 z-20">
        <LanguageSwitcher />
      </div>

      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={s.src}
            alt=""
            className="w-full h-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-accent via-accent/70 to-accent/30" />

      {/* Dots */}
      <div className="absolute bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-primary' : 'w-2 bg-primary-foreground/40'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 pb-16 pt-20 md:pb-20 md:px-8 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-lg"
        >
          <img src={logoImg} alt="Pandalina" className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-2xl" />
          <h1 className="text-4xl md:text-6xl lg:text-7xl tracking-tighter uppercase leading-[0.9] text-primary-foreground mb-3">
            {current === 0 ? t.hero.title : t.hero[slide.titleKey]}
          </h1>
          {current === 0 && (
            <p className="font-display text-lg md:text-2xl tracking-tight uppercase text-primary-foreground/80 mb-4">
              {t.hero.subtitle}
            </p>
          )}
          <p className="font-body text-[15px] md:text-base text-primary-foreground/60 mb-8 max-w-sm">
            {t.hero[slide.taglineKey]}
          </p>

          <div className="flex gap-3">
            <button
              onClick={scrollToMenu}
              className="h-12 px-7 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wide active:scale-95 transition-transform"
            >
              {t.hero.cta_menu}
            </button>
            <a
              href="https://wa.me/972503009005"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-7 rounded-full border border-primary-foreground/30 text-primary-foreground font-bold text-sm tracking-wide flex items-center active:scale-95 transition-transform"
            >
              {t.hero.cta_whatsapp}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
