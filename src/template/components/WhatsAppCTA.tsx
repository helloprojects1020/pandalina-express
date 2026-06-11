import type { BitelyxTokens, Dir } from '../tokens';

export interface WhatsAppCTAProps {
  dir: Dir;
  tokens: BitelyxTokens;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  backgroundImageUrl: string;
  whatsappColor?: string;
}

const WhatsAppCTA = ({
  dir,
  tokens,
  title,
  description,
  buttonLabel,
  buttonHref,
  backgroundImageUrl,
  whatsappColor = '#25D366',
}: WhatsAppCTAProps) => (
  <section dir={dir} className="py-12 px-4" style={{ background: tokens.bg }}>
    <div className="max-w-screen-xl mx-auto rounded-3xl overflow-hidden relative">
      <img src={backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
      <div className="relative z-10 p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-4xl tracking-tighter uppercase mb-3" style={{ color: '#ffffff' }}>{title}</h2>
        <p className="text-sm md:text-base mb-6 max-w-md mx-auto font-body" style={{ color: 'rgba(255,255,255,0.7)' }}>{description}</p>
        <a
          href={buttonHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 px-8 rounded-full font-bold text-sm items-center gap-2 active:scale-95 transition-transform"
          style={{ background: whatsappColor, color: '#ffffff' }}
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  </section>
);

export default WhatsAppCTA;
