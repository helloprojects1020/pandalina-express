import { Plus } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface ProductCardData {
  id: string;
  name: string;
  description: string;
  price: number;
  currencySymbol: string;
  imageUrl: string;
  badgeEmoji?: string;
  badgeLabel?: string;
  isOutOfStock?: boolean;
  outOfStockLabel?: string;
  availableLabel?: string;
  showAvailableBadge?: boolean;
  premiumTag?: string;
}

export interface ProductCardProps {
  dir: Dir;
  tokens: BitelyxTokens;
  item: ProductCardData;
  variant?: 'default' | 'premium';
  quickAddLabel: string;
  onOpen: (id: string) => void;
  onQuickAdd: (id: string) => void;
}

const ProductCard = ({ dir, tokens, item, variant = 'default', quickAddLabel, onOpen, onQuickAdd }: ProductCardProps) => {
  const isPremium = variant === 'premium';
  const blocked = !!item.isOutOfStock;

  return (
    <div
      dir={dir}
      className={`group relative flex flex-col gap-2 rounded-2xl shadow-sm border text-start w-full ${
        isPremium ? 'p-0 overflow-hidden' : 'p-2'
      } ${blocked ? 'cursor-not-allowed' : ''}`}
      style={{ background: tokens.surface, borderColor: 'transparent' }}
    >
      {item.badgeLabel && !blocked && (
        <span
          className="absolute top-3 start-3 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ background: tokens.accent, color: tokens.accentText }}
        >
          {item.badgeEmoji && <span>{item.badgeEmoji}</span>} {item.badgeLabel}
        </span>
      )}

      <button
        onClick={() => onOpen(item.id)}
        className={`relative overflow-hidden transition-transform ${
          isPremium ? 'aspect-[16/10]' : 'aspect-square rounded-xl'
        } ${blocked ? '' : 'active:scale-[0.98]'}`}
        style={{ background: tokens.surfaceAlt }}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`object-cover w-full h-full transition-transform duration-500 ${
            blocked ? 'grayscale opacity-60' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />
        {blocked ? (
          <>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
            <span
              className="absolute top-2 start-2 text-xs font-bold px-2 py-1 rounded-md shadow-sm"
              style={{ background: tokens.danger, color: '#ffffff' }}
            >
              {item.outOfStockLabel ?? 'Out of stock'}
            </span>
          </>
        ) : (
          item.showAvailableBadge && (
            <span
              className="absolute bottom-2 start-2 flex items-center gap-1 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#ffffff' }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tokens.success }} />
              {item.availableLabel ?? 'Available'}
            </span>
          )
        )}
      </button>

      <button
        onClick={() => onOpen(item.id)}
        className={`flex flex-col flex-1 pb-1 text-start ${isPremium ? 'px-4 py-3' : 'px-1'}`}
      >
        <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: blocked ? tokens.muted : tokens.text }}>
          {item.name}
        </h3>
        <p className="text-xs mt-1 line-clamp-1" style={{ color: tokens.muted }}>
          {item.description}
        </p>
        {isPremium && item.premiumTag && (
          <span className="text-[10px] font-semibold mt-1" style={{ color: tokens.accent }}>{item.premiumTag}</span>
        )}
      </button>

      <div className={`flex items-center justify-between ${isPremium ? 'px-4 pb-3' : 'px-1 pb-1'}`}>
        <span className="font-display text-base" style={{ color: blocked ? tokens.muted : tokens.accent }}>
          {item.currencySymbol}{item.price}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); if (!blocked) onQuickAdd(item.id); }}
          disabled={blocked}
          aria-label={quickAddLabel}
          className="h-8 w-8 rounded-full flex items-center justify-center transition-transform"
          style={
            blocked
              ? { background: tokens.surfaceAlt, color: tokens.muted, cursor: 'not-allowed', opacity: 0.7 }
              : { background: tokens.accent, color: tokens.accentText }
          }
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;