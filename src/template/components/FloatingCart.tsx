import { ShoppingBag } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface FloatingCartProps {
  dir: Dir;
  tokens: BitelyxTokens;
  cartCount: number;
  subtotal: number;
  currencySymbol: string;
  label: string;
  onClick: () => void;
}

const FloatingCart = ({ dir, tokens, cartCount, subtotal, currencySymbol, label, onClick }: FloatingCartProps) => {
  if (cartCount <= 0) return null;
  return (
    <button
      data-template-component="FloatingCart"
      dir={dir}
      onClick={onClick}
      className="fixed bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-30 h-14 px-6 rounded-full shadow-lg flex items-center gap-3 active:scale-95 transition-transform"
      style={{ background: tokens.accent, color: tokens.accentText }}
    >
      <ShoppingBag className="w-5 h-5" />
      <span className="font-bold text-sm">{label} ({cartCount})</span>
      <span className="font-display text-base">{currencySymbol}{subtotal}</span>
    </button>
  );
};

export default FloatingCart;
