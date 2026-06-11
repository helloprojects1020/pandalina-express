import type { BitelyxTokens, Dir } from '../tokens';

export interface FooterSocial {
  label: string;
  href: string;
  iconUrl: string;
}

export interface FooterProps {
  dir: Dir;
  tokens: BitelyxTokens;
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  contactTitle: string;
  phoneLabel: string;
  phoneHref: string;
  addressLabel: string;
  hoursTitle: string;
  hoursLines: string[];
  socials: FooterSocial[];
  copyright: string;
  poweredBy: string;
}

const Footer = ({
  dir,
  tokens,
  brandName,
  brandTagline,
  logoUrl,
  contactTitle,
  phoneLabel,
  phoneHref,
  addressLabel,
  hoursTitle,
  hoursLines,
  socials,
  copyright,
  poweredBy,
}: FooterProps) => (
  <footer dir={dir} className="py-8 px-4" style={{ background: tokens.accent, color: tokens.accentText }}>
    <div className="max-w-screen-xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6">
        <img src={logoUrl} alt={brandName} className="w-10 h-10 rounded-lg" />
        <div>
          <h3 className="font-display text-base">{brandName}</h3>
          <p className="text-[11px]" style={{ color: `${tokens.accentText}80` }}>{brandTagline}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center mb-6">
        <div>
          <h4 className="font-bold text-xs mb-1.5">{contactTitle}</h4>
          <a href={phoneHref} className="text-xs hover:opacity-80 transition-opacity" style={{ color: `${tokens.accentText}99` }}>
            📞 {phoneLabel}
          </a>
          <p className="text-xs mt-0.5" style={{ color: `${tokens.accentText}99` }}>📍 {addressLabel}</p>
        </div>
        <div>
          <h4 className="font-bold text-xs mb-1.5">{hoursTitle}</h4>
          {hoursLines.map((line, i) => (
            <p key={i} className="text-xs mt-0.5" style={{ color: `${tokens.accentText}99` }}>{line}</p>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-5 mb-6">
        {socials.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="hover:scale-110 transition-transform duration-200"
          >
            <img src={s.iconUrl} alt={s.label} className="w-6 h-6" />
          </a>
        ))}
      </div>

      <div className="border-t pt-4 text-center space-y-1" style={{ borderColor: `${tokens.accentText}1a` }}>
        <p className="text-[11px]" style={{ color: `${tokens.accentText}66` }}>{copyright}</p>
        <p className="text-[10px] tracking-wider uppercase" style={{ color: `${tokens.accentText}40` }}>{poweredBy}</p>
      </div>
    </div>
  </footer>
);

export default Footer;
