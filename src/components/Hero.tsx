import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/context';
import heroImg from '@/assets/hero-sushi.jpg';
import kitchen1 from '@/assets/kitchen-1.jpg';
import logoImg from '@/assets/logo.png';

/* Wok cooking video – locally hosted for reliability */
const WOK_VIDEO = '/videos/wok-cooking.mp4';

const WhatsAppSmallIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
    <path
      fill="currentColor"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.13.11-1.82-.11-.42-.14-.96-.34-1.65-.66-2.92-1.36-4.82-4.31-4.97-4.51-.14-.2-1.17-1.56-1.17-2.97 0-1.42.74-2.12 1.01-2.41.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.57.82 2.01.89 2.16.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.28.29-.12.57.16.28.73 1.21 1.57 1.96 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.6-.07.17-.19.7-.82.89-1.1.19-.28.38-.24.63-.14.26.1 1.63.77 1.91.91.28.14.46.21.53.33.07.11.07.66-.17 1.34z"
    />
  </svg>
);

interface Slide {
  type: 'image' | 'video';
  src: string;
  videoSrc?: string;
  titleKey: 'title' | 'slide2_title' | 'slide3_title';
  taglineKey: 'tagline' | 'slide2_tagline' | 'slide3_tagline';
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const slides: Slide[] = [
  { type: 'image', src: heroImg, titleKey: 'title', taglineKey: 'tagline' },
  {
    type: 'video',
    src: kitchen1,
    videoSrc: WOK_VIDEO,
    titleKey: 'slide2_title',
    taglineKey: 'slide2_tagline',
  },
  { type: 'image', src: kitchen1, titleKey: 'slide3_title', taglineKey: 'slide3_tagline' },
];

const Hero = () => {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  // Eagerly start loading video on mount so it's buffered by slide 2
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.load();
  }, []);

  // Play/pause based on active slide
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (current === 1) {
      // Reset error state and retry on each visit to slide 2
      setVideoError(false);
      v.play().catch(() => {
        // Try loading and playing again after a brief delay
        v.load();
        setTimeout(() => {
          v.play().catch(() => setVideoError(true));
        }, 500);
      });
    } else {
      v.pause();
    }
  }, [current]);

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const slide = slides[current];

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-end overflow-hidden">
      {/* Slides */}
      {slides.map((s, i) => {
        if (s.type === 'image') {
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={s.src} alt="" className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={s.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <video
              ref={videoRef}
              src={s.videoSrc}
              muted
              loop
              playsInline
              preload="auto"
              onCanPlay={() => setVideoReady(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        );
      })}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.35), rgba(0,0,0,0.45))' }} />

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

          <div className="flex gap-3 flex-wrap">
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
              className="h-14 px-8 rounded-full bg-[#25D366] text-white font-bold text-sm tracking-wide flex items-center gap-2 active:scale-95 transition-transform animate-[pulse_3s_ease-in-out_infinite]"
            >
              <WhatsAppSmallIcon />
              {t.hero.cta_whatsapp}
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-xs md:text-sm text-primary-foreground/40 tracking-wide">
            {t.hero.tagline}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
