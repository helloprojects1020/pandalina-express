import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useCartStore } from '@/store/cartStore';
import LanguageSwitcher from './LanguageSwitcher';
import logoImg from '@/assets/logo.png';

const SiteHeader = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setCartOpen, getItemCount } = useCartStore();
  const count = getItemCount();

  const links = [
    { to: '/', label: t.header.menu },
    { to: '/about', label: t.header.about },
    { to: '/contact', label: t.header.contact },
  ];

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Pandalina" className="w-8 h-8 rounded-lg" />
          <span className="font-display text-base text-foreground hidden sm:inline">Pandalina</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                location.pathname === l.to
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Cart icon */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Cart"
          >
            <ShoppingBag className="w-4 h-4 text-foreground" />
            {count > 0 && (
              <span className="absolute -top-1 -end-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === l.to
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
