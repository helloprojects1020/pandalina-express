import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/context';
import heroImg from '@/assets/hero-sushi.jpg';
import logoImg from '@/assets/logo.png';

const HERO_VIDEO_URL =
  'https://videos.pexels.com/video-files/5034974/5034974-sd_640_360_24fps.mp4';
const HERO_VIDEO_HD_URL =
  'https://videos.pexels.com/video-files/5034974/5034974-hd_1920_1080_24fps.mp4';

const Hero = () => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pick HD on wider screens
  const videoSrc =
    typeof window !== 'undefined' && window.innerWidth >= 768
      ? HERO_VIDEO_HD_URL
      : HERO_VIDEO_URL;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Try to play; some browsers block autoplay
    v.play().catch(() => setVideoError(true));
  }, []);

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-end overflow-hidden">
      {/* Fallback image (always rendered behind video) */}
      <img
        src={heroImg}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          videoLoaded && !videoError ? 'opacity-0' : 'opacity-100'
        }`}
        loading="eager"
      />

      {/* Video background */}
      {!videoError && (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-accent via-accent/70 to-accent/30" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 pb-16 pt-20 md:pb-20 md:px-8 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-lg"
        >
          <img
            src={logoImg}
            alt="Pandalina"
            className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-2xl"
          />
          <h1 className="text-4xl md:text-6xl lg:text-7xl tracking-tighter uppercase leading-[0.9] text-primary-foreground mb-3">
            {t.hero.title}
          </h1>
          <p className="font-display text-lg md:text-2xl tracking-tight uppercase text-primary-foreground/80 mb-4">
            {t.hero.subtitle}
          </p>
          <p className="font-body text-[15px] md:text-base text-primary-foreground/60 mb-8 max-w-sm">
            {t.hero.tagline}
          </p>

          <div className="flex gap-3">
            <button
              onClick={scrollToMenu}
              className="h-12 px-7 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wide active:scale-95 transition-transform"
            >
              {t.hero.cta_menu}
            </button>
            <a
              href="https://wa.me/972526204159"
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
