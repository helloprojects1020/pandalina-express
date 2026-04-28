import { ShoppingBag, Menu as MenuIcon, X } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface HeaderProps {
  dir: Dir;
  tokens: BitelyxTokens;
  brandName: string;
  logoUrl?: string;
  links: NavLink[];
  cartCount: number;
  cartLabel: string;
  menuLabel: string;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  onCartOpen: () => void;
  /** Optional banner text rendered in a strip above the bar. */
  bannerText?: string;
  bannerVariant?: 'success' | 'danger';
  /** Right-side language switcher slot (rendered as a string label + onSelect). */
  languageLabel?: string;
  onLanguageClick?: () => void;
  /** Href used for the brand/logo link. Defaults to '#'. */
  brandHref?: string;
}

const Header = ({
  dir,
  tokens,
  brandName,
  logoUrl,
  links,
  cartCount,
  cartLabel,
  menuLabel,
  isMobileOpen,
  onToggleMobile,
  onCartOpen,
  bannerText,
  bannerVariant = 'success',
  languageLabel,
  onLanguageClick,
  brandHref = '#',
}: HeaderProps) => {
  const bannerColor = bannerVariant === 'success' ? tokens.success : tokens.danger;

  return (
    <header
      data-template-component="Header"
      dir={dir}
      className="sticky top-0 z-40 backdrop-blur-md border-b"
      style={{ background: `${tokens.bg}f2`, borderColor: tokens.border, color: tokens.text }}
    >
      {bannerText && (
        <div
          className="text-center py-1.5 px-4 border-b"
          style={{ background: `${bannerColor}1a`, borderColor: `${bannerColor}33` }}
        >
          <p className="text-xs font-semibold" style={{ color: bannerColor }}>{bannerText}</p>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto flex items-center justify-between h-14 px-4">
        <a href={brandHref} className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-lg" />
          ) : (
            <div
              aria-label={brandName}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{ background: tokens.surfaceAlt, color: tokens.muted }}
            >
              {brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-display text-base hidden sm:inline" style={{ color: tokens.text }}>{brandName}</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={
                l.active
                  ? { background: tokens.accent, color: tokens.accentText }
                  : { color: tokens.text, background: 'transparent' }
              }
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {languageLabel && (
            <button
              onClick={onLanguageClick}
              className="h-9 px-3 rounded-full text-xs font-semibold active:scale-95 transition-transform"
              style={{ background: tokens.surfaceAlt, color: tokens.text }}
            >
              {languageLabel}
            </button>
          )}

          <button
            onClick={onCartOpen}
            aria-label={cartLabel}
            className="relative h-9 w-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: tokens.surfaceAlt }}
          >
            <ShoppingBag className="w-4 h-4" style={{ color: tokens.text }} />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -end-1 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: tokens.accent, color: tokens.accentText }}
              >
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMobile}
            aria-label={menuLabel}
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center active:scale-95"
            style={{ background: tokens.surfaceAlt, color: tokens.text }}
          >
            {isMobileOpen ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{ borderColor: tokens.border, background: tokens.surface }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={
                l.active
                  ? { background: tokens.accent, color: tokens.accentText }
                  : { color: tokens.text }
              }
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;