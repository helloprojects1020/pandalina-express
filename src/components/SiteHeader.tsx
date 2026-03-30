import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useCartStore } from '@/store/cartStore';
import { useMenu } from '@/hooks/useMenu';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import LanguageSwitcher from './LanguageSwitcher';
import logoImg from '@/assets/logo.png';

const SiteHeader = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setCartOpen, getItemCount } = useCartStore();
  const { restaurantId } = useMenu();
  const { isOpen, todayHours } = useOpeningHours(restaurantId);
  const count = getItemCount();

  const links = [
    { to: '/', label: t.header.menu },
    { to: '/about', label: t.header.about },
    { to: '/contact', label: t.header.contact },
  ];

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">

      {/* Banner סגור */}
      {isOpen === false && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-center py-1.5 px-4">
          <p className="text-xs font-semibold text-destructive">
            🔴 המסעדה סגורה כרגע
            {todayHours === null
              ? ' · סגור היום'
              : ` · שעות פתיחה היום: ${todayHours}`}
          </p>
        </div>
      )}

      {/* Banner פתוח — רק אם isOpen === true */}
      {isOpen === true && todayHours && (
        <div className="bg-green-500/10 border-b border-green-500/20 text-center py-1 px-4">
          <p className="text-xs text-green-700">
            🟢 פתוח עכשיו · שעות היום: {todayHours}
          </p>
        </div>
      )}

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