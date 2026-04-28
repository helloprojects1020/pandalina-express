import { useEffect, useState } from 'react';
import { Users, ImageOff } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface HeroSlide {
  type: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  title: string;
  tagline: string;
}

export interface HeroProps {
  dir: Dir;
  tokens: BitelyxTokens;
  logoUrl?: string;
  brandName: string;
  subtitle: string;
  trustLine: string;
  ctaMenuLabel: string;
  ctaMenuHref: string;
  ctaWhatsappLabel: string;
  ctaWhatsappHref: string;
  ctaGroupLabel: string;
  ctaGroupHref: string;
  slides: HeroSlide[];
  /** WhatsApp brand green for the WhatsApp CTA — provided by platform. */
  whatsappColor?: string;
  /** Aria-label template for slide dots. Use {n} for the index. */
  slideAriaLabel?: string;
}

const WhatsAppSmallIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.13.11-1.82-.11-.42-.14-.96-.34-1.65-.66-2.92-1.36-4.82-4.31-4.97-4.51-.14-.2-1.17-1.56-1.17-2.97 0-1.42.74-2.12 1.01-2.41.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.57.82 2.01.89 2.16.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.28.29-.12.57.16.28.73 1.21 1.57 1.96 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.6-.07.17-.19.7-.82.89-1.1.19-.28.38-.24.63-.14.26.1 1.63.77 1.91.91.28.14.46.21.53.33.07.11.07.66-.17 1.34z"
    />
  </svg>
);

const Hero = ({
  dir,
  tokens,
  logoUrl,
  brandName,
  subtitle,
  trustLine,
  ctaMenuLabel,
  ctaMenuHref,
  ctaWhatsappLabel,
  ctaWhatsappHref,
  ctaGroupLabel,
  ctaGroupHref,
  slides,
  whatsappColor = '#25D366',
  slideAriaLabel = 'Slide {n}',
}: HeroProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[current] ?? slides[0];

  return (
    <section
      data-template-component="Hero"
      dir={dir}
      className="relative h-[100dvh] md:min-h-[90vh] md:h-auto flex items-end overflow-hidden"
      style={{ background: tokens.bg }}
    >
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {s.imageUrl ? (
            <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: tokens.surfaceAlt }}
            >
              <ImageOff className="w-12 h-12 opacity-30" style={{ color: tokens.muted }} />
            </div>
          )}
          {s.type === 'video' && s.videoUrl && (
            <video
              src={s.videoUrl}
              muted
              loop
              playsInline
              autoPlay={i === current}
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      ))}

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.35), rgba(0,0,0,0.45))' }}
      />

      <div className="absolute bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={slideAriaLabel.replace('{n}', String(i + 1))}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-6' : 'w-2'}`}
            style={{ background: i === current ? tokens.accent : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full px-4 pb-16 pt-20 md:pb-20 md:px-8 max-w-screen-xl mx-auto">
        <div className="max-w-lg">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-2xl" />
          ) : (
            <div
              aria-label={brandName}
              className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-2xl flex items-center justify-center font-bold text-xl"
              style={{ background: tokens.surfaceAlt, color: tokens.muted }}
            >
              {brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl lg:text-7xl tracking-tighter uppercase leading-[0.9] mb-3" style={{ color: '#ffffff' }}>
            {slide?.title}
          </h1>
          <p className="font-display text-lg md:text-2xl tracking-tight uppercase mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {subtitle}
          </p>
          <p className="font-body text-[15px] md:text-base mb-8 max-w-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {slide?.tagline}
          </p>

          <div className="flex gap-3 flex-wrap">
            <a
              href={ctaMenuHref}
              className="h-12 px-7 rounded-full font-bold text-sm tracking-wide active:scale-95 transition-transform inline-flex items-center"
              style={{ background: tokens.accent, color: tokens.accentText }}
            >
              {ctaMenuLabel}
            </a>
            <a
              href={ctaWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="h-14 px-8 rounded-full font-bold text-sm tracking-wide flex items-center gap-2 active:scale-95 transition-transform"
              style={{ background: whatsappColor, color: '#ffffff' }}
            >
              <WhatsAppSmallIcon />
              {ctaWhatsappLabel}
            </a>
            <a
              href={ctaGroupHref}
              className="h-12 px-5 rounded-full font-bold text-sm tracking-wide flex items-center gap-2 active:scale-95 transition-transform border"
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}
            >
              <Users className="w-4 h-4" />
              {ctaGroupLabel}
            </a>
          </div>

          <p className="mt-5 text-xs md:text-sm tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {trustLine}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;